"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/* ============================================================================
   A resposta de uma avaliação

   Ação pública, autenticada pelo token opaco do convite — o mesmo modelo do
   acompanhamento de pedido: quem tem o link responde, e o link não é
   adivinhável.

   Duas coisas que esta ação NÃO faz, e que são o motivo de ela existir
   separada:

   - Não pede autorização de uso público como condição de responder. A caixa
     é opcional, vem desmarcada, e a resposta é gravada de qualquer jeito.
   - Não trata nota alta e nota baixa de forma diferente. Nenhum ramo deste
     arquivo lê `score` para decidir o que fazer em seguida.
   ============================================================================ */

export type EstadoDaAvaliacao = {
  erro?: string;
  campo?: string;
  ok?: string;
};

const esquema = z.object({
  token: z.string().trim().min(10).max(64),
  score: z.coerce.number().int().min(1).max(5),
  nps: z.union([z.literal(""), z.coerce.number().int().min(0).max(10)]),
  comentario: z.string().trim().max(2000),
  autoriza: z.string().optional(),
  nome: z.string().trim().max(80),
});

function campo(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : "";
}

export async function responderAvaliacao(
  _anterior: EstadoDaAvaliacao,
  form: FormData,
): Promise<EstadoDaAvaliacao> {
  const dados = esquema.safeParse({
    token: campo(form, "token"),
    score: campo(form, "score"),
    nps: campo(form, "nps"),
    comentario: campo(form, "comentario"),
    autoriza: campo(form, "autoriza"),
    nome: campo(form, "nome"),
  });

  if (!dados.success) {
    const primeiro = dados.error.issues[0];
    return {
      erro:
        primeiro?.path[0] === "score"
          ? "Escolha uma nota de 1 a 5."
          : "Confira o que foi preenchido.",
      campo: String(primeiro?.path[0] ?? ""),
    };
  }

  const convite = await prisma.reviewRequest.findUnique({
    where: { token: dados.data.token },
    select: { id: true, status: true, review: { select: { id: true } } },
  });

  if (!convite) return { erro: "Este link de avaliação não é válido." };
  if (convite.status === "cancelado") {
    return { erro: "Este convite foi cancelado." };
  }
  if (convite.review) {
    return { erro: "Esta avaliação já foi respondida. Obrigado!" };
  }

  const autorizou = dados.data.autoriza === "sim";

  await prisma.$transaction([
    prisma.review.create({
      data: {
        requestId: convite.id,
        score: dados.data.score,
        nps: dados.data.nps === "" ? null : dados.data.nps,
        comment: dados.data.comentario,
        /* A autorização é gravada com a data em que foi dada. Sem data, uma
           autorização vira uma afirmação sem contexto — e uma pessoa que
           autorizou em 2026 não autorizou para sempre. */
        publicConsent: autorizou,
        publicConsentAt: autorizou ? new Date() : null,
        displayName: autorizou ? dados.data.nome : "",
      },
    }),
    prisma.reviewRequest.update({
      where: { id: convite.id },
      data: { status: "respondido", respondedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/avaliacoes");
  return { ok: "Obrigado. A sua resposta chegou à equipe da JB." };
}
