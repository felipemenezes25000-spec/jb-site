import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { provedorPagamento } from "@/lib/pagamento";
import { confirmarPagamento, estornarPedido, mudarStatus } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";

/**
 * Notificação do provedor de pagamento.
 *
 * Este é o único lugar em que um pagamento vira "pago". Nem a tela, nem a
 * volta do navegador depois do banco: só o provedor, falando com o servidor,
 * com assinatura conferida dentro de `lerWebhook`.
 *
 * Não há sessão aqui — quem chama é uma máquina. A autenticação é a
 * assinatura da mensagem, e é responsabilidade do adapter do provedor.
 *
 * Duas regras que valem para qualquer adquirente:
 *
 * 1. Idempotência primeiro. O evento é gravado ANTES de qualquer efeito, com
 *    chave única. Reentrega repetida esbarra no unique e para em 200. Se o
 *    processamento falhar depois disso, a linha do evento é apagada para que
 *    a próxima entrega possa valer — senão o evento ficaria marcado como
 *    tratado sem nunca ter surtido efeito.
 *
 * 2. Responder 200 sempre que o evento foi aceito, mesmo quando não há nada a
 *    fazer. Provedor que recebe erro reenvia em laço, e um laço de reentrega
 *    é um incidente noturno esperando para acontecer.
 */

export async function POST(request: Request) {
  const corpo = await request.text();

  let evento;
  try {
    evento = await provedorPagamento().lerWebhook(request, corpo);
  } catch (erro) {
    console.error("[webhook] falha ao ler a notificação", erro);
    return Response.json({ erro: "Não foi possível ler a notificação." }, { status: 500 });
  }

  // assinatura inválida ou corpo ilegível: nada é tocado
  if (!evento) {
    return Response.json({ erro: "Notificação inválida." }, { status: 400 });
  }

  const pagamento = await prisma.payment.findUnique({
    where: { externalId: evento.externalId },
    include: { order: { select: { id: true, number: true, status: true, paidAt: true } } },
  });

  // cobrança de outro ambiente, ou já removida: aceitar encerra a reentrega
  if (!pagamento) {
    return Response.json({ ok: true, ignorado: "pagamento desconhecido" });
  }

  try {
    await prisma.paymentEvent.create({
      data: {
        paymentId: pagamento.id,
        eventKey: evento.chave,
        kind: evento.tipo,
        payload: (evento.bruto ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return Response.json({ ok: true, repetido: true });
    }
    console.error("[webhook] falha ao registrar o evento", erro);
    return Response.json({ erro: "Não foi possível registrar o evento." }, { status: 500 });
  }

  try {
    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        status: evento.status,
        approvedAt:
          evento.status === "aprovado" ? (pagamento.approvedAt ?? new Date()) : pagamento.approvedAt,
        failReason:
          evento.status === "recusado" && !pagamento.failReason
            ? "Pagamento recusado pelo emissor."
            : pagamento.failReason,
      },
    });

    switch (evento.status) {
      case "aprovado":
        // idempotente por dentro: pedido já pago sai na primeira linha
        await confirmarPagamento(pagamento.orderId);
        break;

      case "em_analise":
        if (!pagamento.order.paidAt && pagamento.order.status === "aguardando_pagamento") {
          await mudarStatus(pagamento.orderId, "pagamento_em_analise", {
            nota: "O provedor colocou o pagamento em análise.",
          });
        }
        break;

      case "recusado":
      case "expirado":
      case "cancelado":
        // Recusa não cancela pedido: o estoque continua reservado e a pessoa
        // pode tentar de novo pela própria página do pedido.
        if (!pagamento.order.paidAt) {
          await prisma.orderStatusEvent.create({
            data: {
              orderId: pagamento.orderId,
              status: pagamento.order.status,
              note:
                evento.status === "recusado"
                  ? "Pagamento recusado. Você pode gerar uma nova cobrança."
                  : evento.status === "expirado"
                    ? "A cobrança expirou. Gere uma nova para concluir o pedido."
                    : "A cobrança foi cancelada no provedor.",
            },
          });
        }
        break;

      case "estornado":
        // "reembolsado" e "cancelado" são estados diferentes, e o pedido
        // estornado precisa continuar dizendo que houve venda e devolução.
        // A devolução de estoque é decidida lá dentro: só volta o que ainda
        // não tinha saído da JB.
        await estornarPedido(pagamento.orderId, "Pagamento estornado pelo provedor.");
        break;

      default:
        // criado/pendente: só o registro do evento já basta
        break;
    }
  } catch (erro) {
    console.error("[webhook] falha ao processar o evento", erro);
    // libera a chave para que a reentrega do provedor volte a valer
    await prisma.paymentEvent
      .delete({ where: { eventKey: evento.chave } })
      .catch(() => undefined);
    return Response.json({ erro: "Falha ao processar o evento." }, { status: 500 });
  }

  revalidatePath(`/pedido/${pagamento.order.number}`);

  return Response.json({ ok: true, status: evento.status });
}
