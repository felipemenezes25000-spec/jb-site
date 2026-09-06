import "server-only";

import { prisma } from "@/lib/prisma";
import type { TemaDoArtigo } from "@/lib/central-tecnica";

/* ============================================================================
   Leitura pública da Central Técnica

   Uma porta só, e ela só devolve artigo publicado. O filtro de `status` mora
   aqui e não em cada página — porque o dia em que alguém escrever uma listagem
   nova e esquecer o `where`, um rascunho não revisado vai ao ar.

   `server-only`: o corpo do artigo e as pendências de redação não têm por que
   existir no bundle do navegador.
   ============================================================================ */

/** O recorte que a listagem usa. Sem o corpo — ele é grande e não aparece. */
const SELECAO_DA_LISTA = {
  slug: true,
  title: true,
  lead: true,
  topic: true,
  publishedAt: true,
  reviewedAt: true,
  cover: { select: { url: true, alt: true } },
} as const;

export type ArtigoDaLista = {
  slug: string;
  title: string;
  lead: string;
  topic: TemaDoArtigo;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  cover: { url: string; alt: string } | null;
};

/**
 * Artigos publicados, do mais recente para o mais antigo.
 *
 * `publishedAt` nulo é impossível em artigo publicado — a ação de publicar
 * carimba a data —, mas o `orderBy` trata o caso mesmo assim: um registro
 * gravado por script antigo não pode empurrar a lista para uma ordem
 * arbitrária.
 */
export async function artigosPublicados(opcoes: { tema?: TemaDoArtigo } = {}) {
  const linhas = await prisma.article.findMany({
    where: {
      status: "publicado",
      ...(opcoes.tema ? { topic: opcoes.tema } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: SELECAO_DA_LISTA,
  });

  return linhas as ArtigoDaLista[];
}

/** Quantos artigos publicados há por tema. Alimenta o filtro. */
export async function contagemPorTema() {
  const linhas = await prisma.article.groupBy({
    by: ["topic"],
    where: { status: "publicado" },
    _count: { _all: true },
  });

  const mapa = new Map<TemaDoArtigo, number>();
  for (const linha of linhas) mapa.set(linha.topic as TemaDoArtigo, linha._count._all);
  return mapa;
}

/**
 * Um artigo pelo endereço.
 *
 * Devolve `null` para tudo que não esteja publicado — inclusive arquivado. A
 * página trata os dois casos como "não está no ar"; distinguir aqui daria a
 * quem varre endereços a informação de que o rascunho existe.
 */
export async function artigoPublicado(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "publicado" },
    select: {
      slug: true,
      title: true,
      lead: true,
      body: true,
      topic: true,
      appliesTo: true,
      publishedAt: true,
      reviewedAt: true,
      seoTitle: true,
      seoDescription: true,
      cover: { select: { url: true, alt: true, width: true, height: true } },
      author: { select: { id: true, name: true, role: true } },
      reviewer: { select: { id: true, name: true, role: true } },
      sources: { orderBy: { order: "asc" }, select: { title: true, url: true, note: true } },
      products: {
        orderBy: { order: "asc" },
        take: 3,
        select: {
          product: {
            select: {
              slug: true,
              name: true,
              priceCents: true,
              status: true,
              media: {
                orderBy: { order: "asc" },
                take: 1,
                select: { media: { select: { url: true, alt: true } } },
              },
            },
          },
        },
      },
    },
  });
}

/** Outros artigos do mesmo tema, para o rodapé do texto. */
export async function relacionadosDoTema(tema: TemaDoArtigo, exceto: string) {
  const linhas = await prisma.article.findMany({
    where: { status: "publicado", topic: tema, slug: { not: exceto } },
    orderBy: [{ publishedAt: "desc" }],
    take: 3,
    select: SELECAO_DA_LISTA,
  });

  return linhas as ArtigoDaLista[];
}
