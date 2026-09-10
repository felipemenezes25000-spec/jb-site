import "server-only";

import { cookies } from "next/headers";

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
export async function criarPedido(input: Parameters<typeof criarPedidoBase>[0]) {
  const pedido = await criarPedidoBase(input);

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

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    // Cancelar a venda não pode falhar só porque a transportadora está fora.
    // A pendência fica gravada nos metadados do pedido para retry/manual.
    console.error("[pedido/logistica] cancelamento de etiqueta pendente:", resultado.error);
  }
}

export async function estornarPedido(pedidoId: string, motivo: string, userId?: string) {
  await estornarPedidoBase(pedidoId, motivo, userId);

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    console.error("[pedido/logistica] cancelamento após estorno pendente:", resultado.error);
  }
}
