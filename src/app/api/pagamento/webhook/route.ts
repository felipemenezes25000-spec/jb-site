import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { processarPedidoMelhorEnvio } from "@/lib/melhor-envio";
import { provedorPagamento } from "@/lib/pagamento";
import { confirmarPagamento, estornarPedido, mudarStatus } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";

/**
 * Notificação do provedor de pagamento.
 *
 * Pagamento e logística têm fronteiras diferentes. O pagamento aprovado é
 * confirmado primeiro e de forma idempotente. Só depois tentamos a etiqueta:
 * falta de NF-e, saldo no Melhor Envio ou indisponibilidade da transportadora
 * nunca podem transformar um pagamento válido em webhook com erro.
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

  if (!evento) {
    return Response.json({ erro: "Notificação inválida." }, { status: 400 });
  }

  const pagamento = await prisma.payment.findUnique({
    where: { externalId: evento.externalId },
    include: { order: { select: { id: true, number: true, status: true, paidAt: true } } },
  });

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
      case "aprovado": {
        await confirmarPagamento(pagamento.orderId);

        // Melhor Envio é efeito pós-pagamento. A própria função é idempotente:
        // se o webhook repetir, ela recupera a etiqueta/rastreio em vez de
        // comprar outro frete. Pendência fiscal fica gravada no pedido.
        try {
          const logistica = await processarPedidoMelhorEnvio(pagamento.orderId);
          if (!logistica.ok && !("skipped" in logistica)) {
            console.warn("[webhook/logistica] etiqueta pendente", logistica.error);
          }
        } catch (erro) {
          console.error("[webhook/logistica] falha pós-pagamento", erro);
        }
        break;
      }

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
        await estornarPedido(pagamento.orderId, "Pagamento estornado pelo provedor.");
        break;

      default:
        break;
    }
  } catch (erro) {
    console.error("[webhook] falha ao processar o evento", erro);
    await prisma.paymentEvent
      .delete({ where: { eventKey: evento.chave } })
      .catch(() => undefined);
    return Response.json({ erro: "Falha ao processar o evento." }, { status: 500 });
  }

  revalidatePath(`/pedido/${pagamento.order.number}`);
  revalidatePath(`/minha-jb/pedidos/${pagamento.order.number}`);

  return Response.json({ ok: true, status: evento.status });
}
