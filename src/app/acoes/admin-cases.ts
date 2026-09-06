"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { slugDeArtigo, slugDisponivel } from "@/lib/central-tecnica";
import { impedimentoDoCase } from "@/lib/cases";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Escritas dos cases técnicos

   `publicarCase` é o coração: ela consulta `impedimentoDoCase` e devolve a
   lista do que falta. A autorização do cliente é uma das condições, e não há
   caminho que a contorne — nem para um case completo, revisado e bonito.

   `registrarAutorizacao` existe separada porque autorização é um ato com
   data e com quem a obteve. Uma caixinha no formulário de edição faria dela
   um campo como outro qualquer.
   ============================================================================ */

export type EstadoDoCase = {
  erro?: string;
  campo?: string;
  ok?: string;
};

const texto = (max: number) => z.string().trim().max(max);

const esquema = z.object({
  title: texto(160).min(3, "O título precisa de pelo menos 3 caracteres."),
  slug: texto(80),
  symptom: texto(1000),
  equipmentLabel: texto(120),
  modelLabel: texto(120),
  diagnosis: texto(2000),
  intervention: texto(2000),
  parts: z.string().max(2000).optional().default(""),
  finalTests: texto(1500),
  durationLabel: texto(80),
  result: texto(1500),
  technicianId: texto(40),
  reviewerId: texto(40),
  workOrderId: texto(40),
  pendingNote: texto(600),
});

function campo(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : "";
}

function linhas(bruto: string) {
  return bruto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 30);
}

type Leitura =
  | { ok: true; valor: Prisma.TechCaseUncheckedCreateInput }
  | { ok: false; estado: EstadoDoCase };

function ler(form: FormData): Leitura {
  const dados = esquema.safeParse({
    title: campo(form, "title"),
    slug: campo(form, "slug"),
    symptom: campo(form, "symptom"),
    equipmentLabel: campo(form, "equipmentLabel"),
    modelLabel: campo(form, "modelLabel"),
    diagnosis: campo(form, "diagnosis"),
    intervention: campo(form, "intervention"),
    parts: campo(form, "parts"),
    finalTests: campo(form, "finalTests"),
    durationLabel: campo(form, "durationLabel"),
    result: campo(form, "result"),
    technicianId: campo(form, "technicianId"),
    reviewerId: campo(form, "reviewerId"),
    workOrderId: campo(form, "workOrderId"),
    pendingNote: campo(form, "pendingNote"),
  });

  if (!dados.success) {
    const primeiro = dados.error.issues[0];
    return {
      ok: false,
      estado: {
        erro: primeiro?.message ?? "Confira os campos.",
        campo: String(primeiro?.path[0] ?? ""),
      },
    };
  }

  const slug = slugDeArtigo(dados.data.slug || dados.data.title);
  if (!slugDisponivel(slug)) {
    return { ok: false, estado: { erro: "Este endereço não pode ser usado.", campo: "slug" } };
  }

  return {
    ok: true,
    valor: {
      title: dados.data.title,
      slug,
      symptom: dados.data.symptom,
      equipmentLabel: dados.data.equipmentLabel,
      modelLabel: dados.data.modelLabel,
      diagnosis: dados.data.diagnosis,
      intervention: dados.data.intervention,
      parts: linhas(dados.data.parts),
      finalTests: dados.data.finalTests,
      durationLabel: dados.data.durationLabel,
      result: dados.data.result,
      technicianId: dados.data.technicianId || null,
      reviewerId: dados.data.reviewerId || null,
      workOrderId: dados.data.workOrderId || null,
      pendingNote: dados.data.pendingNote,
    },
  };
}

function revalidar(slug: string) {
  revalidatePath("/admin/cases");
  revalidatePath("/cases");
  revalidatePath(`/cases/${slug}`);
}

export async function criarCase(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const lido = ler(form);
  if (!lido.ok) return lido.estado;

  let id: string;
  try {
    const criado = await prisma.techCase.create({
      data: { ...lido.valor, status: "rascunho" },
      select: { id: true, slug: true, title: true },
    });
    id = criado.id;

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "case",
      entidadeId: criado.id,
      depois: { slug: criado.slug, title: criado.title },
    });
    revalidar(criado.slug);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um case neste endereço.", campo: "slug" };
    }
    throw erro;
  }

  redirect(`/admin/cases/${id}?ok=criado`);
}

export async function salvarCase(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");
  if (!id) return { erro: "Case não identificado." };

  const lido = ler(form);
  if (!lido.ok) return lido.estado;

  const antes = await prisma.techCase.findUnique({
    where: { id },
    select: { slug: true, status: true, technicianId: true, reviewerId: true },
  });
  if (!antes) return { erro: "Case não encontrado." };

  /* Trocar quem executou ou quem revisou invalida a revisão: o atendimento
     que aquela pessoa conferiu não é mais o que está escrito. */
  const trocouAssinatura =
    antes.technicianId !== lido.valor.technicianId ||
    antes.reviewerId !== lido.valor.reviewerId;

  try {
    const depois = await prisma.techCase.update({
      where: { id },
      data: {
        ...lido.valor,
        ...(trocouAssinatura ? { reviewedAt: null } : {}),
        ...(trocouAssinatura && antes.status === "publicado"
          ? { status: "em_revisao" as const, publishedAt: null }
          : {}),
      },
      select: { id: true, slug: true, status: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "case",
      entidadeId: id,
      antes: { ...antes },
      depois: { ...depois },
    });

    revalidar(antes.slug);
    if (depois.slug !== antes.slug) revalidar(depois.slug);

    return {
      ok:
        trocouAssinatura && antes.status === "publicado"
          ? "Salvo. O case saiu do ar porque a assinatura mudou e precisa de nova revisão."
          : "Case salvo.",
    };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um case neste endereço.", campo: "slug" };
    }
    throw erro;
  }
}

/**
 * Registra a autorização do cliente.
 *
 * Pede a anotação de como ela foi obtida — e-mail, WhatsApp, assinatura em
 * visita —, porque "o cliente autorizou" sem procedência é uma afirmação que
 * ninguém consegue conferir seis meses depois.
 */
export async function registrarAutorizacao(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");
  const nota = campo(form, "consentNote").trim().slice(0, 400);

  if (nota.length < 10) {
    return {
      erro:
        "Descreva como a autorização foi obtida — por e-mail, WhatsApp, ou assinada em visita. " +
        "Sem procedência, ninguém consegue conferir isso depois.",
      campo: "consentNote",
    };
  }

  const caso = await prisma.techCase.findUnique({ where: { id }, select: { slug: true } });
  if (!caso) return { erro: "Case não encontrado." };

  await prisma.techCase.update({
    where: { id },
    data: { customerConsent: true, customerConsentAt: new Date(), consentNote: nota },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "case",
    entidadeId: id,
    depois: { autorizacao: "registrada", nota },
  });

  revalidar(caso.slug);
  return { ok: "Autorização registrada." };
}

export async function revogarAutorizacao(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");

  const caso = await prisma.techCase.findUnique({
    where: { id },
    select: { slug: true, status: true },
  });
  if (!caso) return { erro: "Case não encontrado." };

  /* Revogar tira do ar na mesma operação. Um case publicado cuja autorização
     foi retirada e que continua no site é o pior estado possível deste
     modelo. */
  await prisma.techCase.update({
    where: { id },
    data: {
      customerConsent: false,
      customerConsentAt: null,
      ...(caso.status === "publicado"
        ? { status: "arquivado" as const, publishedAt: null }
        : {}),
    },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "case",
    entidadeId: id,
    depois: { autorizacao: "revogada" },
  });

  revalidar(caso.slug);
  return {
    ok:
      caso.status === "publicado"
        ? "Autorização revogada. O case saiu do ar."
        : "Autorização revogada.",
  };
}

export async function registrarRevisaoDoCase(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");

  const caso = await prisma.techCase.findUnique({
    where: { id },
    select: { slug: true, technicianId: true, reviewerId: true },
  });
  if (!caso) return { erro: "Case não encontrado." };

  if (!caso.reviewerId) return { erro: "Escolha o revisor técnico antes." };
  if (caso.reviewerId !== usuario.id) {
    return { erro: "Só quem está indicado como revisor pode registrar a revisão." };
  }
  if (caso.technicianId === usuario.id) {
    return { erro: "Quem executou o atendimento não pode ser quem o revisa." };
  }

  await prisma.techCase.update({ where: { id }, data: { reviewedAt: new Date() } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "case",
    entidadeId: id,
    depois: { revisao: "registrada" },
  });

  revalidar(caso.slug);
  return { ok: "Revisão registrada." };
}

export async function publicarCase(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");

  const caso = await prisma.techCase.findUnique({
    where: { id },
    select: {
      slug: true,
      title: true,
      symptom: true,
      diagnosis: true,
      intervention: true,
      finalTests: true,
      technicianId: true,
      reviewerId: true,
      reviewedAt: true,
      customerConsent: true,
      status: true,
      publishedAt: true,
    },
  });
  if (!caso) return { erro: "Case não encontrado." };

  const impedimento = impedimentoDoCase({
    temTitulo: caso.title.trim().length > 2,
    temSintoma: caso.symptom.trim().length > 10,
    temDiagnostico: caso.diagnosis.trim().length > 10,
    temIntervencao: caso.intervention.trim().length > 10,
    temTesteFinal: caso.finalTests.trim().length > 5,
    tecnicoId: caso.technicianId,
    revisorId: caso.reviewerId,
    revisadoEm: caso.reviewedAt,
    autorizadoPeloCliente: caso.customerConsent,
  });

  if (impedimento) {
    return { erro: `Este case ainda não pode ir ao ar. Falta: ${impedimento.falta.join("; ")}.` };
  }

  await prisma.techCase.update({
    where: { id },
    data: { status: "publicado", publishedAt: caso.publishedAt ?? new Date() },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "case",
    entidadeId: id,
    antes: { status: caso.status },
    depois: { status: "publicado" },
  });

  revalidar(caso.slug);
  return { ok: "Case publicado." };
}

const ESTADOS_MANUAIS = ["rascunho", "em_revisao", "arquivado"] as const;

export async function mudarEstadoDoCase(
  _anterior: EstadoDoCase,
  form: FormData,
): Promise<EstadoDoCase> {
  const usuario = await exigirEdicao("cases");
  const id = campo(form, "id");
  const alvo = campo(form, "status");

  if (!(ESTADOS_MANUAIS as readonly string[]).includes(alvo)) {
    return { erro: "Estado inválido. Para publicar, use o botão de publicar." };
  }

  const caso = await prisma.techCase.findUnique({
    where: { id },
    select: { slug: true, status: true },
  });
  if (!caso) return { erro: "Case não encontrado." };

  await prisma.techCase.update({
    where: { id },
    data: {
      status: alvo as (typeof ESTADOS_MANUAIS)[number],
      ...(caso.status === "publicado" ? { publishedAt: null } : {}),
    },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "case",
    entidadeId: id,
    antes: { status: caso.status },
    depois: { status: alvo },
  });

  revalidar(caso.slug);
  return { ok: "Situação alterada." };
}
