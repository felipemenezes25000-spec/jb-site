"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  impedimentoDePublicacao,
  slugDeArtigo,
  slugDisponivel,
} from "@/lib/central-tecnica";
import { textoDeHtml } from "@/lib/html";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Escritas da Central Técnica

   O contrato é o mesmo do resto do backoffice: autorização no servidor,
   validação com zod, gravação, auditoria e revalidação.

   O que é próprio daqui está numa ação só, `publicarArtigo`. Ela não é um
   `update` de status: ela pergunta a `impedimentoDePublicacao` se o artigo
   pode ir ao ar e devolve a lista do que falta quando não pode. Publicar sem
   autor e sem revisor não é um caminho que exija disciplina de quem opera —
   é um caminho que não existe.
   ============================================================================ */

export type EstadoDoArtigo = {
  erro?: string;
  campo?: string;
  ok?: string;
  id?: string;
};

const texto = (max: number) => z.string().trim().max(max);

const esquema = z.object({
  title: texto(160).min(3, "O título precisa de pelo menos 3 caracteres."),
  slug: texto(80),
  lead: texto(300),
  body: z.string().max(120_000).optional().default(""),
  topic: z.enum(["autoclave", "compressor", "vacuo", "compra", "operacao"]),
  appliesTo: z.string().max(2000).optional().default(""),
  pendingNote: texto(600),
  seoTitle: texto(70),
  seoDescription: texto(180),
  authorId: texto(40),
  reviewerId: texto(40),
  coverId: texto(40),
});

function campo(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : "";
}

/** Uma linha por modelo. Linha vazia some — ela viraria item invisível. */
function linhas(bruto: string) {
  return bruto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function doZod(erro: z.ZodError): EstadoDoArtigo {
  const primeiro = erro.issues[0];
  return { erro: primeiro?.message ?? "Confira os campos.", campo: String(primeiro?.path[0] ?? "") };
}

type Leitura =
  | { ok: true; valor: Prisma.ArticleUncheckedCreateInput }
  | { ok: false; estado: EstadoDoArtigo };

async function ler(form: FormData): Promise<Leitura> {
  const dados = esquema.safeParse({
    title: campo(form, "title"),
    slug: campo(form, "slug"),
    lead: campo(form, "lead"),
    body: campo(form, "body"),
    topic: campo(form, "topic") || "operacao",
    appliesTo: campo(form, "appliesTo"),
    pendingNote: campo(form, "pendingNote"),
    seoTitle: campo(form, "seoTitle"),
    seoDescription: campo(form, "seoDescription"),
    authorId: campo(form, "authorId"),
    reviewerId: campo(form, "reviewerId"),
    coverId: campo(form, "coverId"),
  });

  if (!dados.success) return { ok: false, estado: doZod(dados.error) };

  const slug = slugDeArtigo(dados.data.slug || dados.data.title);
  if (!slugDisponivel(slug)) {
    return {
      ok: false,
      estado: {
        erro:
          "Este endereço não pode ser usado: ele é rota da própria Central Técnica, e um " +
          "artigo com esse nome derrubaria a seção.",
        campo: "slug",
      },
    };
  }

  return {
    ok: true,
    valor: {
      title: dados.data.title,
      slug,
      lead: dados.data.lead,
      body: sanitizarHtml(dados.data.body),
      topic: dados.data.topic,
      appliesTo: linhas(dados.data.appliesTo),
      pendingNote: dados.data.pendingNote,
      seoTitle: dados.data.seoTitle || null,
      seoDescription: dados.data.seoDescription || null,
      authorId: dados.data.authorId || null,
      reviewerId: dados.data.reviewerId || null,
      coverId: dados.data.coverId || null,
    },
  };
}

function revalidar(slug: string) {
  revalidatePath("/admin/central-tecnica");
  revalidatePath("/central-tecnica");
  revalidatePath(`/central-tecnica/${slug}`);
  revalidatePath("/sitemap.xml");
}

/* ------------------------------------------------------------- criar */

export async function criarArtigo(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const lido = await ler(form);
  if (!lido.ok) return lido.estado;

  let id: string;
  try {
    const criado = await prisma.article.create({
      /* Nasce sempre em rascunho, e a ação de criar não aceita status vindo
         do formulário. Criar já publicado pularia a revisão inteira. */
      data: { ...lido.valor, status: "rascunho" },
      select: { id: true, slug: true, title: true },
    });
    id = criado.id;

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "artigo",
      entidadeId: criado.id,
      depois: { slug: criado.slug, title: criado.title, status: "rascunho" },
    });

    revalidar(criado.slug);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um artigo neste endereço.", campo: "slug" };
    }
    throw erro;
  }

  redirect(`/admin/central-tecnica/${id}?ok=criado`);
}

/* ------------------------------------------------------------ salvar */

export async function salvarArtigo(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "id");
  if (!id) return { erro: "Artigo não identificado." };

  const lido = await ler(form);
  if (!lido.ok) return lido.estado;

  const antes = await prisma.article.findUnique({
    where: { id },
    select: {
      slug: true,
      title: true,
      status: true,
      authorId: true,
      reviewerId: true,
      reviewedAt: true,
    },
  });
  if (!antes) return { erro: "Artigo não encontrado." };

  /* Trocar autor ou revisor invalida a revisão anterior: o texto que aquela
     pessoa conferiu não é mais o texto assinado. Deixar a data de pé faria a
     página mostrar "revisado por Fulano" com a conferência de outra pessoa. */
  const trocouAssinatura =
    antes.authorId !== lido.valor.authorId || antes.reviewerId !== lido.valor.reviewerId;

  try {
    const depois = await prisma.article.update({
      where: { id },
      data: {
        ...lido.valor,
        ...(trocouAssinatura ? { reviewedAt: null } : {}),
        /* Artigo publicado que perde o revisor sai do ar. Não há estado em
           que uma página pública fique sem quem a conferiu. */
        ...(trocouAssinatura && antes.status === "publicado"
          ? { status: "em_revisao" as const, publishedAt: null }
          : {}),
      },
      select: { id: true, slug: true, title: true, status: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "artigo",
      entidadeId: id,
      antes: { ...antes },
      depois: { ...depois },
    });

    revalidar(antes.slug);
    if (depois.slug !== antes.slug) revalidar(depois.slug);

    return {
      ok:
        trocouAssinatura && antes.status === "publicado"
          ? "Salvo. O artigo saiu do ar porque a assinatura mudou e precisa de nova revisão."
          : "Artigo salvo.",
    };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um artigo neste endereço.", campo: "slug" };
    }
    throw erro;
  }
}

/* ---------------------------------------------------------- revisão */

/**
 * Registra que a revisão aconteceu.
 *
 * Só o próprio revisor escolhido pode marcar — e é por isso que esta ação
 * existe separada de `salvarArtigo`. Se qualquer editor pudesse carimbar a
 * data, "revisado por" viraria um campo de texto com aparência de garantia.
 */
export async function registrarRevisao(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "id");

  const artigo = await prisma.article.findUnique({
    where: { id },
    select: { id: true, slug: true, authorId: true, reviewerId: true },
  });
  if (!artigo) return { erro: "Artigo não encontrado." };

  if (!artigo.reviewerId) {
    return { erro: "Escolha o revisor técnico antes de registrar a revisão." };
  }
  if (artigo.reviewerId !== usuario.id) {
    return {
      erro:
        "Só quem está indicado como revisor pode registrar a revisão. " +
        "Marcar por outra pessoa transformaria a assinatura numa formalidade.",
    };
  }
  if (artigo.authorId === usuario.id) {
    return { erro: "Revisão do próprio texto pelo próprio autor não é revisão." };
  }

  await prisma.article.update({ where: { id }, data: { reviewedAt: new Date() } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "artigo",
    entidadeId: id,
    depois: { revisao: "registrada" },
  });

  revalidar(artigo.slug);
  return { ok: "Revisão registrada." };
}

/* --------------------------------------------------------- publicar */

export async function publicarArtigo(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "id");

  const artigo = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      status: true,
      authorId: true,
      reviewerId: true,
      reviewedAt: true,
      publishedAt: true,
      _count: { select: { sources: true } },
    },
  });
  if (!artigo) return { erro: "Artigo não encontrado." };

  const impedimento = impedimentoDePublicacao({
    temTitulo: artigo.title.trim().length > 2,
    tamanhoDoCorpo: textoDeHtml(artigo.body).length,
    autorId: artigo.authorId,
    revisorId: artigo.reviewerId,
    revisadoEm: artigo.reviewedAt,
    fontes: artigo._count.sources,
    /* Todo artigo da Central orienta conduta sobre equipamento. Não há aqui
       a categoria "texto solto" que dispensaria fonte. */
    orientaConduta: true,
  });

  if (impedimento) {
    return {
      erro: `Este artigo ainda não pode ir ao ar. Falta: ${impedimento.falta.join("; ")}.`,
    };
  }

  await prisma.article.update({
    where: { id },
    data: {
      status: "publicado",
      /* A data da primeira publicação não se renova numa republicação: ela
         diz quando o texto passou a existir para o público. */
      publishedAt: artigo.publishedAt ?? new Date(),
    },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "artigo",
    entidadeId: id,
    antes: { status: artigo.status },
    depois: { status: "publicado" },
  });

  revalidar(artigo.slug);
  return { ok: "Artigo publicado." };
}

/* ------------------------------------------------- mudar de estado */

const ESTADOS_MANUAIS = ["rascunho", "em_revisao", "arquivado"] as const;

export async function mudarEstadoDoArtigo(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "id");
  const alvo = campo(form, "status");

  if (!(ESTADOS_MANUAIS as readonly string[]).includes(alvo)) {
    /* Publicar não passa por aqui de propósito: tem ação própria, com a
       verificação de assinatura. Sem esta guarda, um formulário adulterado
       publicaria sem revisor. */
    return { erro: "Estado inválido. Para publicar, use o botão de publicar." };
  }

  const artigo = await prisma.article.findUnique({
    where: { id },
    select: { slug: true, status: true },
  });
  if (!artigo) return { erro: "Artigo não encontrado." };

  await prisma.article.update({
    where: { id },
    data: {
      status: alvo as (typeof ESTADOS_MANUAIS)[number],
      /* Sair do ar zera a data de publicação: ela volta a ser carimbada se o
         texto for publicado de novo, e enquanto isso não há data a mostrar. */
      ...(artigo.status === "publicado" ? { publishedAt: null } : {}),
    },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "artigo",
    entidadeId: id,
    antes: { status: artigo.status },
    depois: { status: alvo },
  });

  revalidar(artigo.slug);
  return { ok: "Situação alterada." };
}

/* ----------------------------------------------------------- fontes */

export async function adicionarFonte(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "articleId");
  const titulo = campo(form, "title").trim().slice(0, 200);
  const url = campo(form, "url").trim().slice(0, 500);
  const nota = campo(form, "note").trim().slice(0, 300);

  if (titulo.length < 3) return { erro: "Descreva a fonte.", campo: "title" };
  if (url && !/^https?:\/\/\S+$/i.test(url)) {
    return { erro: "Endereço da fonte: comece com https://.", campo: "url" };
  }

  const artigo = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  if (!artigo) return { erro: "Artigo não encontrado." };

  const ultima = await prisma.articleSource.findFirst({
    where: { articleId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.articleSource.create({
    data: { articleId: id, title: titulo, url: url || null, note: nota, order: (ultima?.order ?? -1) + 1 },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "artigo",
    entidadeId: id,
    depois: { fonte: titulo },
  });

  revalidar(artigo.slug);
  return { ok: "Fonte adicionada." };
}

export async function removerFonte(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const fonteId = campo(form, "fonteId");

  const fonte = await prisma.articleSource.findUnique({
    where: { id: fonteId },
    select: { title: true, articleId: true, article: { select: { slug: true } } },
  });
  if (!fonte) return { erro: "Fonte não encontrada." };

  await prisma.articleSource.delete({ where: { id: fonteId } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "artigo",
    entidadeId: fonte.articleId,
    antes: { fonte: fonte.title },
  });

  revalidar(fonte.article.slug);
  return { ok: "Fonte removida." };
}

/* ---------------------------------------------------------- excluir */

export async function excluirArtigo(
  _anterior: EstadoDoArtigo,
  form: FormData,
): Promise<EstadoDoArtigo> {
  const usuario = await exigirEdicao("central");
  const id = campo(form, "id");

  const artigo = await prisma.article.findUnique({
    where: { id },
    select: { slug: true, title: true, status: true },
  });
  if (!artigo) return { erro: "Artigo não encontrado." };

  /* Artigo que já esteve no ar não se apaga: o endereço circulou, e apagar
     transforma um link compartilhado em 404 sem explicação. Arquivar mantém
     a página respondendo e dizendo que o texto saiu. */
  if (artigo.status === "publicado") {
    return { erro: "Arquive antes de excluir: o endereço deste artigo já é público." };
  }

  await prisma.article.delete({ where: { id } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "artigo",
    entidadeId: id,
    antes: { slug: artigo.slug, title: artigo.title },
  });

  revalidar(artigo.slug);
  redirect("/admin/central-tecnica?ok=excluido");
}
