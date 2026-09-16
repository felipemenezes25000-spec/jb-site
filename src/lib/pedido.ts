import "server-only";

import type { OrderStatus, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { updateTag } from "next/cache";

import {
  cancelarPedido as cancelarPedidoBase,
  confirmarPagamento as confirmarPagamentoBase,
  criarPedido as criarPedidoBase,
  estornarPedido as estornarPedidoBase,
} from "@/lib/pedido-base";
import {
  cancelarEtiquetasMelhorEnvio,
  processarPedidoMelhorEnvio,
} from "@/lib/melhor-envio";
import {
  escreverMetaMelhorEnvio,
  partesDoRotuloMelhorEnvio,
} from "@/lib/logistica-meta";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_CATALOGO } from "@/lib/loja-publica";
import { COOKIE_ESCOLHA_FRETE, lerEscolhaFrete } from "@/lib/selecao-frete";

// Todo o domínio continua em pedido-base. Este arquivo é a borda de efeitos
// externos: estoque/pagamento confirmam primeiro no banco; logística acontece
// depois e nunca mantém a transação do pedido aberta durante uma chamada HTTP.
export * from "@/lib/pedido-base";

/**
 * Cria o pedido pelo domínio original e, só depois do commit, tenta guardar os
 * IDs técnicos da modalidade do Melhor Envio.
 *
 * Esta ordem é deliberada: cookie/contexto HTTP é detalhe da borda web e nunca
 * pode impedir a transação de pedido/estoque. Chamadores internos (scripts,
 * jobs, testes ou integrações) não possuem Request Async Storage; nesses casos
 * o pedido continua válido e simplesmente não recebe o metadado auxiliar da
 * cotação.
 *
 * O preço não vem do cookie: ele já foi recotado pelo servidor e está em
 * `input.entrega.valorCents`.
 */
/**
 * Estoque mudou, a vitrine cacheada precisa saber.
 *
 * `contagemDoCatalogo` já exclui unidade vendida da conta — a consulta sempre
 * esteve certa. O que faltava era derrubar o cache: `ETIQUETA_CATALOGO` só era
 * invalidada por ação do painel (publicar, arquivar, relacionar), e comprar
 * não é ação do painel. O efeito medido: a autoclave seminova foi vendida e a
 * barra vermelha continuou anunciando "BIOSSEGURANÇA 4" — por até uma hora,
 * que é a validade do cache.
 *
 * Vale para venda e para devolução: os dois mudam o estoque, e é o estoque que
 * decide quem aparece na vitrine e em que contagem.
 *
 * Fora da transação, de propósito. `updateTag` é efeito de cache, não de
 * banco: chamá-lo lá dentro amarraria a validade do cache ao sucesso de um
 * commit que ainda pode falhar.
 */
function derrubarCacheDoCatalogo(motivo: string) {
  try {
    updateTag(ETIQUETA_CATALOGO);
  } catch (erro) {
    /* Sem contexto de requisição — script, job, webhook fora do ciclo — não há
       cache para derrubar. Isso nunca pode desfazer uma venda. */
    console.error(`[pedido/cache] não foi possível derrubar o catálogo (${motivo})`, erro);
  }
}

export async function criarPedido(input: Parameters<typeof criarPedidoBase>[0]) {
  const pedido = await criarPedidoBase(input);
  derrubarCacheDoCatalogo("venda");

  try {
    const jar = await cookies();
    const escolha = lerEscolhaFrete(jar.get(COOKIE_ESCOLHA_FRETE)?.value);
    const partes = partesDoRotuloMelhorEnvio(input.entrega.rotulo);

    if (escolha?.kind === "melhor_envio" && partes) {
      const atual = await prisma.order.findUnique({
        where: { id: pedido.id },
        select: { internalNote: true },
      });
      if (atual) {
        await prisma.order.update({
          where: { id: pedido.id },
          data: {
            internalNote: escreverMetaMelhorEnvio(atual.internalNote, {
              provider: "melhor_envio",
              companyId: escolha.companyId,
              serviceId: escolha.serviceId,
              companyName: partes.companyName,
              serviceName: partes.serviceName,
              quotedPriceCents: input.entrega.valorCents,
              status: "pendente",
            }),
          },
        });
      }
    }
  } catch (erro) {
    // O pedido já está transacionado. Ausência de contexto HTTP (scripts/jobs),
    // falha de cookie ou anotação auxiliar não desfaz venda/estoque. O
    // processador de logística ainda consegue trabalhar pelo rótulo do frete.
    console.error("[pedido/logistica] não foi possível salvar IDs da cotação", erro);
  }

  return pedido;
}

/**
 * Status e histórico formam uma única unidade: nunca existe status novo sem o
 * evento correspondente, nem evento que diga algo que o pedido não gravou.
 */
export async function mudarStatus(
  pedidoId: string,
  status: OrderStatus,
  opcoes: { nota?: string; userId?: string; visivel?: boolean } = {},
) {
  const marcos: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateInput>> = {
    pago: "paidAt",
    enviado: "shippedAt",
    entregue: "deliveredAt",
    concluido: "closedAt",
    cancelado: "canceledAt",
  };
  const campo = marcos[status];

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: pedidoId },
      data: { status, ...(campo ? { [campo]: new Date() } : {}) },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: pedidoId,
        status,
        note: opcoes.nota ?? "",
        visibleToCustomer: opcoes.visivel ?? true,
        userId: opcoes.userId ?? null,
      },
    });
  });
}

export async function confirmarPagamento(pedidoId: string) {
  await confirmarPagamentoBase(pedidoId);

  const pedido = await prisma.order.findUnique({
    where: { id: pedidoId },
    select: { paidAt: true, shippingLabel: true },
  });
  if (!pedido?.paidAt || !pedido.shippingLabel.startsWith("Melhor Envio · ")) return;

  const resultado = await processarPedidoMelhorEnvio(pedidoId);
  if (!resultado.ok && !("pendingInvoice" in resultado && resultado.pendingInvoice)) {
    console.error("[pedido/logistica] etiqueta não concluída:", resultado.error);
  }
}

export async function cancelarPedido(pedidoId: string, motivo: string, userId?: string) {
  await cancelarPedidoBase(pedidoId, motivo, userId);
  /* Depois, não antes: o estoque só voltou se a operação foi até o fim. */
  derrubarCacheDoCatalogo("cancelamento");

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    // Cancelar a venda não pode falhar só porque a transportadora está fora.
    // A pendência fica gravada nos metadados do pedido para retry/manual.
    console.error("[pedido/logistica] cancelamento de etiqueta pendente:", resultado.error);
  }
}

export async function estornarPedido(pedidoId: string, motivo: string, userId?: string) {
  await estornarPedidoBase(pedidoId, motivo, userId);
  derrubarCacheDoCatalogo("estorno");

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    console.error("[pedido/logistica] cancelamento após estorno pendente:", resultado.error);
  }
}
