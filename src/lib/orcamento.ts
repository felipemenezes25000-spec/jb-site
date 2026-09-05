import "server-only";

import type { Prisma, QuoteKind, QuoteStatus } from "@prisma/client";

import type { PassoLinha } from "@/components/ui/data";
import { ROTULO_CHAMADO } from "@/lib/assistencia";
import { proximoCodigo } from "@/lib/codigos";
import { formatarData, formatarDataHora, formatarPreco } from "@/lib/format";
import { ErroDeEstoque } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";

/**
 * Regras do orçamento (Quote).
 *
 * Um orçamento é uma proposta com preço negociado e prazo. Por isso:
 *
 * 1. Os totais são sempre somados a partir dos itens gravados. Nenhum total
 *    chega pronto do formulário.
 *
 * 2. O preço aprovado é o preço do orçamento, não o preço da vitrine. Quando um
 *    orçamento comercial é aprovado ele vira Pedido com os valores que estavam
 *    na proposta — ver `converterEmPedido` para o porquê de não passar pelo
 *    carrinho.
 *
 * 3. Prazo vencido não vira aprovação silenciosa: `expirarVencidos` fecha o
 *    que passou da validade e registra o evento.
 */

export class ErroDeOrcamento extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeOrcamento";
  }
}

export const ROTULO_ORCAMENTO: Record<QuoteStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_duvida: "Em negociação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Prazo vencido",
  convertido: "Convertido em pedido",
};

export const ROTULO_TIPO_ORCAMENTO: Record<QuoteKind, string> = {
  comercial: "Venda de equipamento",
  assistencia: "Serviço técnico",
};

/** Status em que a proposta ainda está viva e pode ser decidida pelo cliente. */
export const STATUS_ORCAMENTO_ABERTOS: QuoteStatus[] = ["enviado", "em_duvida"];

export type EntradaItemOrcamento = {
  productId?: string | null;
  serviceId?: string | null;
  descricao: string;
  quantidade?: number;
  valorUnitarioCents: number;
};

export type EntradaOrcamento = {
  kind?: QuoteKind;
  customerId?: string | null;
  /** Chamado que originou a proposta, quando é orçamento de assistência. */
  chamadoId?: string | null;
  contato?: { nome?: string; email?: string; telefone?: string };
  mensagem?: string;
  condicoes?: string;
  notaInterna?: string;
  /** Validade em dias a partir de hoje. Ignorada se `validoAte` vier preenchido. */
  validadeDias?: number;
  validoAte?: Date | null;
  descontoCents?: number;
  freteCents?: number;
  itens: EntradaItemOrcamento[];
  userId?: string | null;
};

function normalizarItens(itens: EntradaItemOrcamento[]) {
  return itens
    .map((item, ordem) => {
      const quantidade = Math.max(1, Math.trunc(item.quantidade ?? 1));
      const unitario = Math.max(0, Math.trunc(item.valorUnitarioCents));
      return {
        productId: item.productId ?? null,
        serviceId: item.serviceId ?? null,
        description: item.descricao.trim(),
        quantity: quantidade,
        unitPriceCents: unitario,
        totalCents: unitario * quantidade,
        order: ordem,
      };
    })
    .filter((item) => item.description.length > 0);
}

function calcularValidade(entrada: {
  validoAte?: Date | null;
  validadeDias?: number;
}): Date | null {
  if (entrada.validoAte) return entrada.validoAte;
  if (entrada.validadeDias && entrada.validadeDias > 0) {
    return new Date(Date.now() + entrada.validadeDias * 86_400_000);
  }
  return null;
}

/**
 * Refaz subtotal e total a partir dos itens gravados.
 *
 * Desconto e frete continuam sendo decisão comercial (ficam no cabeçalho da
 * proposta), mas o subtotal nunca é digitado e o total nunca fica negativo.
 */
export async function recalcularTotais(
  quoteId: string,
  cliente: Prisma.TransactionClient = prisma,
) {
  const itens = await cliente.quoteItem.findMany({
    where: { quoteId },
    select: { totalCents: true },
  });
  const subtotalCents = itens.reduce((acc, item) => acc + item.totalCents, 0);

  const atual = await cliente.quote.findUnique({
    where: { id: quoteId },
    select: { discountCents: true, shippingCents: true },
  });
  if (!atual) throw new ErroDeOrcamento("Orçamento não encontrado.");

  const totalCents = Math.max(0, subtotalCents - atual.discountCents) + atual.shippingCents;

  return cliente.quote.update({
    where: { id: quoteId },
    data: { subtotalCents, totalCents },
  });
}

/**
 * Cria o orçamento em rascunho.
 *
 * Nasce em rascunho de propósito: quem monta a proposta revisa antes de o
 * cliente ver. Quem publica é `enviarOrcamento`.
 */
export async function criarOrcamento(entrada: EntradaOrcamento) {
  const itens = normalizarItens(entrada.itens);
  if (itens.length === 0) {
    throw new ErroDeOrcamento("Inclua ao menos um item no orçamento.");
  }

  return prisma.$transaction(async (tx) => {
    const cliente = entrada.customerId
      ? await tx.customer.findUnique({
          where: { id: entrada.customerId },
          select: { name: true, email: true, phone: true },
        })
      : null;

    const numero = await proximoCodigo("orcamento", tx);

    const orcamento = await tx.quote.create({
      data: {
        number: numero,
        kind: entrada.kind ?? "comercial",
        status: "rascunho",
        customerId: entrada.customerId ?? null,
        requestId: entrada.chamadoId ?? null,
        contactName: entrada.contato?.nome ?? cliente?.name ?? "",
        contactEmail: entrada.contato?.email ?? cliente?.email ?? "",
        contactPhone: entrada.contato?.telefone ?? cliente?.phone ?? "",
        message: entrada.mensagem ?? "",
        conditions: entrada.condicoes ?? "",
        internalNote: entrada.notaInterna ?? "",
        discountCents: Math.max(0, Math.trunc(entrada.descontoCents ?? 0)),
        shippingCents: Math.max(0, Math.trunc(entrada.freteCents ?? 0)),
        validUntil: calcularValidade(entrada),
        items: { create: itens },
      },
    });

    const comTotais = await recalcularTotais(orcamento.id, tx);

    await tx.quoteEvent.create({
      data: {
        quoteId: orcamento.id,
        title: "Orçamento criado",
        message: `Proposta ${numero} montada com ${itens.length} ${itens.length === 1 ? "item" : "itens"}.`,
        visibleToCustomer: false,
        userId: entrada.userId ?? null,
      },
    });

    return comTotais;
  });
}

/**
 * Troca a lista de itens inteira e refaz os totais.
 *
 * Substituição em bloco é mais segura que edição item a item: a proposta que o
 * cliente vê corresponde exatamente à última versão salva, sem sobras.
 */
export async function substituirItens(
  quoteId: string,
  itens: EntradaItemOrcamento[],
  opcoes: { descontoCents?: number; freteCents?: number } = {},
) {
  const limpos = normalizarItens(itens);
  if (limpos.length === 0) {
    throw new ErroDeOrcamento("Inclua ao menos um item no orçamento.");
  }

  return prisma.$transaction(async (tx) => {
    const orcamento = await tx.quote.findUnique({
      where: { id: quoteId },
      select: { status: true },
    });
    if (!orcamento) throw new ErroDeOrcamento("Orçamento não encontrado.");
    if (orcamento.status === "convertido") {
      throw new ErroDeOrcamento("Este orçamento já virou pedido e não pode ser alterado.");
    }

    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quoteItem.createMany({
      data: limpos.map((item) => ({ ...item, quoteId })),
    });

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        ...(opcoes.descontoCents === undefined
          ? {}
          : { discountCents: Math.max(0, Math.trunc(opcoes.descontoCents)) }),
        ...(opcoes.freteCents === undefined
          ? {}
          : { shippingCents: Math.max(0, Math.trunc(opcoes.freteCents)) }),
        version: { increment: 1 },
      },
    });

    return recalcularTotais(quoteId, tx);
  });
}

/**
 * Envia a proposta ao cliente.
 *
 * Sem itens não há o que enviar, e sem validade a proposta ficaria aberta para
 * sempre — o padrão de sete dias só entra quando ninguém definiu nada.
 */
export async function enviarOrcamento(
  quoteId: string,
  opcoes: { userId?: string | null; validadeDias?: number; mensagem?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const orcamento = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { _count: { select: { items: true } }, request: { select: { id: true } } },
    });
    if (!orcamento) throw new ErroDeOrcamento("Orçamento não encontrado.");
    if (orcamento._count.items === 0) {
      throw new ErroDeOrcamento("Inclua ao menos um item antes de enviar.");
    }
    if (orcamento.status === "convertido") {
      throw new ErroDeOrcamento("Este orçamento já virou pedido.");
    }

    const validade =
      orcamento.validUntil ??
      calcularValidade({ validadeDias: opcoes.validadeDias ?? 7 });

    const enviado = await tx.quote.update({
      where: { id: quoteId },
      data: { status: "enviado", sentAt: new Date(), validUntil: validade },
    });

    await tx.quoteEvent.create({
      data: {
        quoteId,
        title: "Orçamento enviado",
        message:
          opcoes.mensagem ??
          (validade
            ? `Proposta de ${formatarPreco(enviado.totalCents)}, válida até ${formatarData(validade)}.`
            : `Proposta de ${formatarPreco(enviado.totalCents)}.`),
        userId: opcoes.userId ?? null,
      },
    });

    if (enviado.customerId) {
      await tx.notification.create({
        data: {
          customerId: enviado.customerId,
          kind: "orcamento_enviado",
          title: `Orçamento ${enviado.number} disponível`,
          body: `Total de ${formatarPreco(enviado.totalCents)}.`,
          href: `/minha-jb/orcamentos/${enviado.id}`,
        },
      });
    }

    if (orcamento.requestId) {
      await tx.serviceRequest.update({
        where: { id: orcamento.requestId },
        data: { status: "orcamento_enviado" },
      });
      await tx.serviceRequestEvent.create({
        data: {
          requestId: orcamento.requestId,
          status: "orcamento_enviado",
          title: ROTULO_CHAMADO.orcamento_enviado,
          message: `Orçamento ${enviado.number} enviado para aprovação.`,
          userId: opcoes.userId ?? null,
        },
      });
    }

    return enviado;
  });
}

/**
 * Baixa de estoque atômica, idêntica à do checkout.
 *
 * O UPDATE condicional é o que impede que duas propostas aprovadas no mesmo
 * minuto vendam a mesma unidade de seminovo.
 */
async function baixarEstoque(
  tx: Prisma.TransactionClient,
  produtoId: string,
  quantidade: number,
  nome: string,
) {
  const afetadas = await tx.$executeRaw`
    UPDATE "Product"
    SET "stock" = "stock" - ${quantidade}
    WHERE "id" = ${produtoId}
      AND ("trackInventory" = false OR "stock" >= ${quantidade})
  `;
  if (afetadas === 0) throw new ErroDeEstoque(nome);
}

/**
 * Transforma o orçamento comercial aprovado em Pedido.
 *
 * Por que não passar por `criarPedido`: aquele caminho parte de um carrinho e
 * recalcula tudo pelo preço de vitrine, que é exatamente o que um orçamento
 * NÃO deve fazer — o preço negociado se perderia. Aqui o Pedido nasce com os
 * valores da proposta, congelados item a item, e a baixa de estoque é a mesma.
 *
 * Endereço: o orçamento não guarda endereço, então usamos o padrão do cliente
 * quando existe. Não havendo, o pedido nasce com frete a combinar em vez de um
 * endereço inventado.
 */
async function converterEmPedido(
  tx: Prisma.TransactionClient,
  quoteId: string,
  userId?: string | null,
) {
  const orcamento = await tx.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      items: { orderBy: { order: "asc" }, include: { product: { include: { brand: true } } } },
    },
  });
  if (!orcamento) throw new ErroDeOrcamento("Orçamento não encontrado.");
  if (orcamento.orderId) return orcamento.orderId;
  if (orcamento.items.length === 0) {
    throw new ErroDeOrcamento("Orçamento sem itens não vira pedido.");
  }

  const subtotalCents = orcamento.items.reduce((acc, item) => acc + item.totalCents, 0);
  const totalCents =
    Math.max(0, subtotalCents - orcamento.discountCents) + orcamento.shippingCents;

  const endereco = orcamento.customerId
    ? await tx.customerAddress.findFirst({
        where: { customerId: orcamento.customerId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
    : null;

  const comFrete = orcamento.shippingCents > 0;
  const numero = await proximoCodigo("pedido", tx);

  const pedido = await tx.order.create({
    data: {
      number: numero,
      status: "aguardando_pagamento",
      customerId: orcamento.customerId,
      buyerName: orcamento.customer?.name ?? orcamento.contactName,
      buyerEmail: orcamento.customer?.email ?? orcamento.contactEmail,
      buyerPhone: orcamento.customer?.phone ?? orcamento.contactPhone,
      buyerDocument: orcamento.customer?.document ?? "",
      personType: orcamento.customer?.personType ?? "fisica",
      companyName: orcamento.customer?.companyName ?? "",
      shippingKind: comFrete ? "entrega_local" : "sob_orcamento",
      shippingLabel: comFrete
        ? `Entrega conforme orçamento ${orcamento.number}`
        : "Frete a combinar",
      shipZip: endereco?.zip ?? "",
      shipStreet: endereco?.street ?? "",
      shipNumber: endereco?.number ?? "",
      shipComplement: endereco?.complement ?? "",
      shipDistrict: endereco?.district ?? "",
      shipCity: endereco?.city ?? "",
      shipState: endereco?.state ?? "",
      shipReference: endereco?.reference ?? "",
      subtotalCents,
      discountCents: orcamento.discountCents,
      shippingCents: orcamento.shippingCents,
      totalCents,
      customerNote: orcamento.message,
      internalNote: `Gerado a partir do orçamento ${orcamento.number}.`,
    },
  });

  for (const item of orcamento.items) {
    const produto = item.product;

    await tx.orderItem.create({
      data: {
        orderId: pedido.id,
        kind: produto ? "produto" : "servico",
        productId: produto?.id ?? null,
        serviceId: item.serviceId,
        name: item.description,
        sku: produto?.sku ?? "",
        brandName: produto?.brand?.name ?? "",
        modelName: produto?.model ?? "",
        condition: produto?.condition ?? null,
        // preço da proposta, não o da vitrine
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        totalCents: item.totalCents,
      },
    });

    if (produto) {
      await baixarEstoque(tx, produto.id, item.quantity, produto.name);
      await tx.inventoryMovement.create({
        data: {
          productId: produto.id,
          kind: "saida",
          quantity: item.quantity,
          reason: `Orçamento ${orcamento.number} aprovado`,
          orderId: pedido.id,
        },
      });
    }
  }

  await tx.orderStatusEvent.create({
    data: {
      orderId: pedido.id,
      status: "aguardando_pagamento",
      note: `Pedido gerado a partir do orçamento ${orcamento.number}.`,
    },
  });

  await tx.quote.update({
    where: { id: quoteId },
    data: { status: "convertido", orderId: pedido.id },
  });

  await tx.quoteEvent.create({
    data: {
      quoteId,
      title: `Pedido ${numero} gerado`,
      message: "Siga para o pagamento para concluir a compra.",
      userId: userId ?? null,
    },
  });

  if (orcamento.customerId) {
    await tx.notification.create({
      data: {
        customerId: orcamento.customerId,
        kind: "pedido_criado",
        title: `Pedido ${numero} criado`,
        body: `Total de ${formatarPreco(totalCents)}. Falta só o pagamento.`,
        href: `/minha-jb/pedidos/${pedido.id}`,
      },
    });
  }

  return pedido.id;
}

/**
 * Registra a aprovação do cliente.
 *
 * Orçamento comercial vira pedido na mesma transação. Orçamento de assistência
 * não vira pedido: ele libera a execução do serviço, então o chamado ligado
 * avança para `aprovado` e a OS segue o fluxo normal.
 */
export async function aprovarOrcamento(
  quoteId: string,
  opcoes: { nome?: string; ip?: string; userId?: string | null } = {},
) {
  return prisma.$transaction(
    async (tx) => {
      const orcamento = await tx.quote.findUnique({
        where: { id: quoteId },
        select: {
          id: true,
          number: true,
          kind: true,
          status: true,
          validUntil: true,
          requestId: true,
          orderId: true,
        },
      });
      if (!orcamento) throw new ErroDeOrcamento("Orçamento não encontrado.");
      if (orcamento.status === "convertido" || orcamento.status === "aprovado") {
        return { quoteId, pedidoId: orcamento.orderId };
      }
      if (orcamento.status === "rascunho") {
        throw new ErroDeOrcamento("Este orçamento ainda não foi enviado ao cliente.");
      }
      if (orcamento.validUntil && orcamento.validUntil < new Date()) {
        throw new ErroDeOrcamento(
          "O prazo desta proposta venceu. Peça uma revisão do orçamento.",
        );
      }

      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: "aprovado",
          decidedAt: new Date(),
          decidedByName: opcoes.nome ?? "",
          decidedIp: opcoes.ip ?? "",
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId,
          title: "Orçamento aprovado",
          message: opcoes.nome ? `Aprovado por ${opcoes.nome}.` : "",
          userId: opcoes.userId ?? null,
        },
      });

      if (orcamento.requestId) {
        await tx.serviceRequest.update({
          where: { id: orcamento.requestId },
          data: { status: "aprovado" },
        });
        await tx.serviceRequestEvent.create({
          data: {
            requestId: orcamento.requestId,
            status: "aprovado",
            title: ROTULO_CHAMADO.aprovado,
            message: `Orçamento ${orcamento.number} aprovado. O serviço está liberado.`,
            userId: opcoes.userId ?? null,
          },
        });
      }

      const pedidoId =
        orcamento.kind === "comercial"
          ? await converterEmPedido(tx, quoteId, opcoes.userId)
          : null;

      return { quoteId, pedidoId };
    },
    { timeout: 20_000 },
  );
}

/** Registra a recusa com o motivo. O motivo é o que alimenta a próxima proposta. */
export async function recusarOrcamento(
  quoteId: string,
  motivo: string,
  opcoes: { nome?: string; ip?: string; userId?: string | null } = {},
) {
  return prisma.$transaction(async (tx) => {
    const orcamento = await tx.quote.findUnique({
      where: { id: quoteId },
      select: { status: true, requestId: true, number: true },
    });
    if (!orcamento) throw new ErroDeOrcamento("Orçamento não encontrado.");
    if (orcamento.status === "convertido") {
      throw new ErroDeOrcamento("Este orçamento já virou pedido.");
    }

    const recusado = await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: "recusado",
        decidedAt: new Date(),
        decidedByName: opcoes.nome ?? "",
        decidedIp: opcoes.ip ?? "",
      },
    });

    await tx.quoteEvent.create({
      data: {
        quoteId,
        title: "Orçamento recusado",
        message: motivo.trim(),
        userId: opcoes.userId ?? null,
      },
    });

    if (orcamento.requestId) {
      await tx.serviceRequestEvent.create({
        data: {
          requestId: orcamento.requestId,
          status: "aguardando_cliente",
          title: "Orçamento recusado",
          message: motivo.trim(),
          userId: opcoes.userId ?? null,
        },
      });
      await tx.serviceRequest.update({
        where: { id: orcamento.requestId },
        data: { status: "aguardando_cliente" },
      });
    }

    return recusado;
  });
}

/**
 * Fecha as propostas cujo prazo venceu.
 *
 * Feito em duas etapas — buscar e depois atualizar — porque cada orçamento
 * precisa do seu próprio evento no histórico. Idempotente: rodar duas vezes no
 * mesmo dia não gera evento duplicado, já que o segundo passe não encontra mais
 * nada em aberto.
 */
export async function expirarVencidos(referencia = new Date()) {
  const vencidos = await prisma.quote.findMany({
    where: {
      status: { in: STATUS_ORCAMENTO_ABERTOS },
      validUntil: { not: null, lt: referencia },
    },
    select: { id: true, number: true, customerId: true, validUntil: true },
  });

  if (vencidos.length === 0) return 0;

  await prisma.$transaction([
    prisma.quote.updateMany({
      where: { id: { in: vencidos.map((q) => q.id) } },
      data: { status: "expirado" },
    }),
    prisma.quoteEvent.createMany({
      data: vencidos.map((q) => ({
        quoteId: q.id,
        title: "Prazo vencido",
        message: q.validUntil
          ? `A proposta era válida até ${formatarData(q.validUntil)}. Podemos revisar os valores.`
          : "A proposta perdeu a validade.",
      })),
    }),
  ]);

  return vencidos.length;
}

/** Formato mínimo para desenhar a linha do tempo da proposta. */
export type OrcamentoParaLinha = {
  status: QuoteStatus;
  kind: QuoteKind;
  createdAt: Date;
  sentAt: Date | null;
  decidedAt: Date | null;
  validUntil: Date | null;
};

/**
 * Linha do tempo da proposta: montagem, envio, decisão e — só no comercial —
 * o pedido gerado. Recusa e vencimento aparecem como último passo cancelado,
 * porque são finais legítimos e não devem parecer etapa pendente.
 */
export function passosDoOrcamento(orcamento: OrcamentoParaLinha): PassoLinha[] {
  const encerradoSemVenda =
    orcamento.status === "recusado" || orcamento.status === "expirado";

  const alcance: Record<QuoteStatus, number> = {
    rascunho: 0,
    enviado: 1,
    em_duvida: 1,
    expirado: 1,
    recusado: 2,
    aprovado: 2,
    convertido: 3,
  };
  const indiceAtual = alcance[orcamento.status];

  const estadoDe = (i: number): PassoLinha["estado"] => {
    if (encerradoSemVenda) return i <= indiceAtual - 1 ? "concluido" : "cancelado";
    if (i < indiceAtual) return "concluido";
    if (i === indiceAtual) return "atual";
    return "futuro";
  };

  const passos: PassoLinha[] = [
    {
      titulo: "Proposta montada",
      descricao: "Itens, prazos e condições definidos pela equipe.",
      quando: formatarDataHora(orcamento.createdAt),
      estado: "concluido",
    },
    {
      titulo: "Enviada ao cliente",
      descricao: orcamento.validUntil
        ? `Válida até ${formatarData(orcamento.validUntil)}.`
        : undefined,
      quando: orcamento.sentAt ? formatarDataHora(orcamento.sentAt) : undefined,
      estado: estadoDe(1),
    },
    {
      titulo: "Decisão do cliente",
      descricao: "Aprovação ou recusa da proposta.",
      quando: orcamento.decidedAt ? formatarDataHora(orcamento.decidedAt) : undefined,
      estado: estadoDe(2),
    },
  ];

  if (encerradoSemVenda) {
    passos.push({
      titulo: orcamento.status === "recusado" ? "Proposta recusada" : "Prazo vencido",
      descricao:
        orcamento.status === "recusado"
          ? "Podemos montar uma nova proposta quando quiser."
          : "Fale com a equipe para revisarmos os valores.",
      quando: orcamento.decidedAt ? formatarDataHora(orcamento.decidedAt) : undefined,
      estado: "cancelado",
    });
    return passos;
  }

  if (orcamento.kind === "comercial") {
    passos.push({
      titulo: "Pedido gerado",
      descricao: "A proposta aprovada vira pedido com os valores negociados.",
      estado: estadoDe(3),
    });
  } else {
    passos.push({
      titulo: "Serviço liberado",
      descricao: "Com a aprovação, o técnico executa o reparo orçado.",
      estado: estadoDe(3),
    });
  }

  return passos;
}
