import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { PUBLICADO, UNIDADE_VENDIDA } from "@/lib/catalogo";
import { unificarPorNome } from "@/lib/homonimos";
import { ETIQUETA_CATALOGO } from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Os números do catálogo — um lugar só

   A auditoria encontrou três verdades para a mesma coisa na mesma tela: a
   barra dizia "BIOSSEGURANÇA 4", o chip logo abaixo dizia "Biossegurança 3", e
   o link entre os dois se chamava "TODO O CATÁLOGO" levando a uma página cujo
   título era "Produtos odontológicos novos" com 10 de 12 itens.

   Nenhum dos números estava errado isoladamente. Eles contavam recortes
   diferentes — um com seminovo, outro sem — e nada no sistema dizia qual
   recorte cada superfície usava.

   Este módulo é esse lugar. Toda superfície que mostra um número de catálogo
   (home, mega menu, barra de categorias, coleções, rodapé) chama uma função
   daqui e diz explicitamente o recorte. Se dois números divergem, é porque os
   recortes divergem — e isso passa a ser visível no código.

   Recorte padrão, usado por todas: publicado, e sem unidade já vendida.
   "3 unidades publicadas" com 2 cartões na tela é erro de página.
   ============================================================================ */

export type RecorteDeCatalogo = {
  /** `null` = todas as condições. */
  condicao?: "novo" | "seminovo" | "usado" | "recondicionado" | null;
};

export type ContagemDeCategoria = {
  slug: string;
  nome: string;
  total: number;
};

export type ContagemDoCatalogo = {
  /** Tudo que está publicado e disponível, em todas as condições. */
  total: number;
  /** Por condição, só as que têm algo publicado. */
  porCondicao: Record<string, number>;
  /** Categorias com pelo menos um item no recorte, já unificadas por nome. */
  categorias: ContagemDeCategoria[];
  /** Marcas com pelo menos um item publicado, unificadas por nome. */
  marcasComProduto: number;
  /** Marcas publicadas, inclusive as que hoje não têm item — o que /marcas lista. */
  marcasPublicadas: number;
};

function filtro(recorte: RecorteDeCatalogo) {
  return {
    ...PUBLICADO,
    NOT: UNIDADE_VENDIDA,
    ...(recorte.condicao ? { condition: recorte.condicao } : {}),
  };
}

/**
 * Todos os números do catálogo de uma vez.
 *
 * Uma consulta só, cacheada pela mesma etiqueta do resto do catálogo: publicar
 * ou arquivar um produto derruba a contagem junto com a vitrine.
 */
export async function contagemDoCatalogo(
  recorte: RecorteDeCatalogo = {},
): Promise<ContagemDoCatalogo> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  cacheLife("hours");

  const onde = filtro(recorte);

  const [total, porCondicaoBruto, categorias, marcasComProduto, marcasPublicadas] =
    await Promise.all([
      prisma.product.count({ where: onde }),
      prisma.product.groupBy({
        by: ["condition"],
        where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA },
        _count: { _all: true },
      }),
      prisma.category.findMany({
        where: { published: true, parentId: null },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          _count: { select: { products: { where: onde } } },
        },
      }),
      prisma.brand.findMany({
        where: { published: true, products: { some: onde } },
        select: { slug: true, name: true },
      }),
      prisma.brand.findMany({ where: { published: true }, select: { slug: true, name: true } }),
    ]);

  const porCondicao: Record<string, number> = {};
  for (const linha of porCondicaoBruto) porCondicao[linha.condition] = linha._count._all;

  return {
    total,
    porCondicao,
    categorias: unificarPorNome(
      categorias
        .filter((categoria) => categoria._count.products > 0)
        .map((categoria) => ({
          slug: categoria.slug,
          nome: categoria.name,
          quantidade: categoria._count.products,
        })),
    ).map((categoria) => ({
      slug: categoria.slug,
      nome: categoria.nome,
      total: categoria.quantidade ?? 0,
    })),
    marcasComProduto: unificarPorNome(
      marcasComProduto.map((marca) => ({ slug: marca.slug, nome: marca.name })),
    ).length,
    marcasPublicadas: unificarPorNome(
      marcasPublicadas.map((marca) => ({ slug: marca.slug, nome: marca.name })),
    ).length,
  };
}

/**
 * O rótulo honesto de um recorte.
 *
 * "Todo o catálogo" só pode ser escrito quando o destino mostra o catálogo
 * todo. Quando o destino é uma coleção, o rótulo diz qual coleção é.
 */
export function rotuloDoRecorte(recorte: RecorteDeCatalogo): string {
  switch (recorte.condicao) {
    case "novo":
      return "Produtos novos";
    case "seminovo":
      return "Seminovos JB";
    case "usado":
      return "Usados";
    case "recondicionado":
      return "Recondicionados JB";
    default:
      return "Todo o catálogo";
  }
}
