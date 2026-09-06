"use server";

import { revalidatePath } from "next/cache";

import { registrarAuditoria } from "@/lib/auditoria";
import { impedimentoDeDepoimento, EXPLICACAO_DEPOIMENTO } from "@/lib/avaliacoes";
import { enviarConvite, montarFilaDeConvites } from "@/lib/convites";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Escritas da fila de avaliações

   `gerarConvites` monta a fila e não envia nada. `dispararConvite` é o único
   caminho de saída, e ele passa pelo portão da configuração.

   `publicarDepoimento` tem uma ausência deliberada: ele não lê a nota. A
   curadoria existe para conferir dado pessoal exposto e conteúdo ofensivo —
   não para escolher elogio. Um depoimento de nota 2, autorizado e conferido,
   é publicável, e nada neste arquivo o impede.
   ============================================================================ */

export type EstadoDeAvaliacoes = {
  erro?: string;
  ok?: string;
};

function campo(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : "";
}

export async function gerarConvites(): Promise<EstadoDeAvaliacoes> {
  const usuario = await exigirEdicao("avaliacoes");
  const resultado = await montarFilaDeConvites();

  await registrarAuditoria({
    userId: usuario.id,
    acao: "criar",
    entidade: "avaliacao",
    entidadeId: "fila",
    depois: { criados: resultado.criados, ignorados: resultado.ignorados.length },
  });

  revalidatePath("/admin/avaliacoes");

  if (resultado.criados === 0) {
    return {
      ok: "Nenhum convite novo. Tudo que estava elegível já tem convite, ou ainda está na carência.",
    };
  }

  return {
    ok: `${resultado.criados} ${resultado.criados === 1 ? "convite criado" : "convites criados"} em rascunho. Nada foi enviado.`,
  };
}

export async function dispararConvite(
  _anterior: EstadoDeAvaliacoes,
  form: FormData,
): Promise<EstadoDeAvaliacoes> {
  const usuario = await exigirEdicao("avaliacoes");
  const id = campo(form, "id");

  const resultado = await enviarConvite(id);
  if (!resultado.ok) return { erro: resultado.motivo };

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "avaliacao",
    entidadeId: id,
    depois: { convite: "enviado" },
  });

  revalidatePath("/admin/avaliacoes");
  return {
    ok: resultado.jaEstavaEnviado ? "Este convite já havia sido enviado." : "Convite enviado.",
  };
}

export async function cancelarConvite(
  _anterior: EstadoDeAvaliacoes,
  form: FormData,
): Promise<EstadoDeAvaliacoes> {
  const usuario = await exigirEdicao("avaliacoes");
  const id = campo(form, "id");

  const convite = await prisma.reviewRequest.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!convite) return { erro: "Convite não encontrado." };
  if (convite.status === "respondido") {
    return { erro: "Este convite já foi respondido. Cancelar não apaga a resposta." };
  }

  await prisma.reviewRequest.update({ where: { id }, data: { status: "cancelado" } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "avaliacao",
    entidadeId: id,
    antes: { status: convite.status },
    depois: { status: "cancelado" },
  });

  revalidatePath("/admin/avaliacoes");
  return { ok: "Convite cancelado." };
}

/* --------------------------------------------------------- depoimentos */

export async function publicarDepoimento(
  _anterior: EstadoDeAvaliacoes,
  form: FormData,
): Promise<EstadoDeAvaliacoes> {
  const usuario = await exigirEdicao("avaliacoes");
  const id = campo(form, "id");

  const resposta = await prisma.review.findUnique({
    where: { id },
    select: { score: true, comment: true, publicConsent: true, publishedAt: true },
  });
  if (!resposta) return { erro: "Resposta não encontrada." };

  const impedimento = impedimentoDeDepoimento({
    nota: resposta.score,
    comentario: resposta.comment,
    autorizou: resposta.publicConsent,
    /* A curadoria é este clique. Chamar a regra com `curado: true` aqui é o
       que torna a verificação honesta: as outras duas condições continuam
       valendo, e nenhuma delas é a nota. */
    curado: true,
  });

  if (impedimento) return { erro: EXPLICACAO_DEPOIMENTO[impedimento] };

  await prisma.review.update({ where: { id }, data: { publishedAt: new Date() } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "avaliacao",
    entidadeId: id,
    depois: { depoimento: "publicado" },
  });

  revalidatePath("/admin/avaliacoes");
  revalidatePath("/depoimentos");
  return { ok: "Depoimento publicado." };
}

export async function despublicarDepoimento(
  _anterior: EstadoDeAvaliacoes,
  form: FormData,
): Promise<EstadoDeAvaliacoes> {
  const usuario = await exigirEdicao("avaliacoes");
  const id = campo(form, "id");

  await prisma.review.update({ where: { id }, data: { publishedAt: null } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "avaliacao",
    entidadeId: id,
    depois: { depoimento: "retirado" },
  });

  revalidatePath("/admin/avaliacoes");
  revalidatePath("/depoimentos");
  return { ok: "Depoimento retirado do site." };
}
