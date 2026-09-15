import "server-only";

import type { Prisma } from "@prisma/client";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Uma única definição do que conta como avaliação pública de produto.
 *
 * A nota só entra na vitrine quando houve consentimento explícito, curadoria
 * (`publishedAt`) e o convite nasceu de uma compra cujo pedido continha este
 * produto. Topo e bloco completo usam exatamente a mesma fronteira para nunca
 * exibirem números diferentes.
 */
function filtroDeAvaliacaoPublica(productId: string): Prisma.ReviewWhereInput {
  return {
    publicConsent: true,
    publishedAt: { not: null },
    request: {
      kind: "compra",
      order: {
        items: { some: { productId, kind: "produto" } },
      },
    },
  };
}

export type ResumoAvaliacoesProduto = {
  total: number;
  media: number;
  distribuicao: { nota: number; quantidade: number }[];
};

export type ComentarioAvaliacaoProduto = {
  id: string;
  score: number;
  comment: string;
  displayName: string;
  publishedAt: Date | null;
  createdAt: Date;
};

/**
 * Total, média e histograma usam TODAS as avaliações públicas válidas.
 *
 * A versão anterior fazia `findMany(... take: 50)` e depois calculava tudo no
 * JavaScript. Ao chegar na 51ª avaliação, a PDP passaria a dizer "50
 * avaliações" e a média viraria apenas a média das 50 mais recentes. Agregar
 * no banco mantém a estatística correta sem carregar todos os comentários.
 */
export const carregarResumoAvaliacoesProduto = cache(
  async (productId: string): Promise<ResumoAvaliacoesProduto | null> => {
    const where = filtroDeAvaliacaoPublica(productId);
    const [agregado, porNota] = await Promise.all([
      prisma.review.aggregate({
        where,
        _count: { _all: true },
        _avg: { score: true },
      }),
      prisma.review.groupBy({
        by: ["score"],
        where,
        _count: { _all: true },
      }),
    ]);

    const total = agregado._count._all;
    if (total === 0) return null;

    const quantidades = new Map(
      porNota.map((grupo) => [grupo.score, grupo._count._all] as const),
    );

    return {
      total,
      media: agregado._avg.score ?? 0,
      distribuicao: [5, 4, 3, 2, 1].map((nota) => ({
        nota,
        quantidade: quantidades.get(nota) ?? 0,
      })),
    };
  },
);

/**
 * A primeira dobra já tem o SKU, que é único no catálogo. Resolver o id por
 * ele permite reutilizar o MESMO `carregarResumoAvaliacoesProduto` usado pelo
 * bloco completo. A chamada interna recebe o id canônico e, dentro do mesmo
 * render do React, o `cache()` evita recalcular a estatística quando o layout
 * complementar pedir o mesmo resumo.
 */
export const carregarResumoAvaliacoesProdutoPorSku = cache(
  async (sku: string): Promise<ResumoAvaliacoesProduto | null> => {
    const codigo = sku.trim();
    if (!codigo) return null;

    const produto = await prisma.product.findUnique({
      where: { sku: codigo },
      select: { id: true },
    });
    if (!produto) return null;

    return carregarResumoAvaliacoesProduto(produto.id);
  },
);

/**
 * Comentários são conteúdo editorial, não a fonte da estatística.
 *
 * Trazemos uma janela curta e descartamos eventual comentário composto só por
 * espaços. O resumo acima continua completo mesmo quando ninguém escreveu
 * texto público.
 */
export const carregarComentariosAvaliacoesProduto = cache(
  async (productId: string): Promise<ComentarioAvaliacaoProduto[]> => {
    const avaliacoes = await prisma.review.findMany({
      where: {
        ...filtroDeAvaliacaoPublica(productId),
        comment: { not: "" },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        score: true,
        comment: true,
        displayName: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return avaliacoes.filter((avaliacao) => avaliacao.comment.trim()).slice(0, 4);
  },
);
