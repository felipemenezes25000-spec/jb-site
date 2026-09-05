import "server-only";

import type { Prisma, ProductCondition } from "@prisma/client";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { prisma } from "@/lib/prisma";

/** Só o necessário para montar um card — evita trazer descrição e ficha à toa. */
export const SELECAO_CARD = {
  slug: true,
  name: true,
  model: true,
  condition: true,
  priceCents: true,
  compareAtCents: true,
  allowDirectPurchase: true,
  trackInventory: true,
  stock: true,
  unique: true,
  brand: { select: { name: true } },
  media: {
    orderBy: { order: "asc" },
    take: 1,
    select: { alt: true, media: { select: { url: true, alt: true } } },
  },
} satisfies Prisma.ProductSelect;

type LinhaCard = Prisma.ProductGetPayload<{ select: typeof SELECAO_CARD }>;

export function paraCard(produto: LinhaCard): ProdutoCard {
  const primeira = produto.media[0];
  return {
    slug: produto.slug,
    name: produto.name,
    model: produto.model,
    condition: produto.condition,
    priceCents: produto.priceCents,
    compareAtCents: produto.compareAtCents,
    allowDirectPurchase: produto.allowDirectPurchase,
    trackInventory: produto.trackInventory,
    stock: produto.stock,
    unique: produto.unique,
    brandName: produto.brand?.name ?? null,
    imageUrl: primeira?.media.url ?? null,
    imageAlt: primeira?.alt || primeira?.media.alt || produto.name,
  };
}

/** Produto visível ao público. Rascunho e arquivado nunca aparecem. */
export const PUBLICADO: Prisma.ProductWhereInput = {
  status: "active",
};

export type Ordenacao =
  | "relevancia"
  | "menor-preco"
  | "maior-preco"
  | "novidades"
  | "destaque";

export function ordenar(valor: Ordenacao | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (valor) {
    case "menor-preco":
      return [{ priceCents: "asc" }, { name: "asc" }];
    case "maior-preco":
      return [{ priceCents: "desc" }, { name: "asc" }];
    case "novidades":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "destaque":
      return [{ featured: "desc" }, { publishedAt: "desc" }];
    default:
      // relevância: destaque primeiro, depois o que está em estoque, depois recente
      return [{ featured: "desc" }, { stock: "desc" }, { publishedAt: "desc" }];
  }
}

export type FiltrosCatalogo = {
  busca?: string;
  categoria?: string;
  marca?: string;
  condicao?: ProductCondition | ProductCondition[];
  voltagem?: string;
  precoMin?: number;
  precoMax?: number;
  emEstoque?: boolean;
};

export function montarFiltro(filtros: FiltrosCatalogo): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...PUBLICADO };
  const e: Prisma.ProductWhereInput[] = [];

  if (filtros.busca?.trim()) {
    const termo = filtros.busca.trim();
    e.push({
      OR: [
        { name: { contains: termo, mode: "insensitive" } },
        { model: { contains: termo, mode: "insensitive" } },
        { sku: { contains: termo, mode: "insensitive" } },
        { shortDescription: { contains: termo, mode: "insensitive" } },
        { brand: { name: { contains: termo, mode: "insensitive" } } },
        { category: { name: { contains: termo, mode: "insensitive" } } },
        { specs: { some: { value: { contains: termo, mode: "insensitive" } } } },
      ],
    });
  }

  if (filtros.categoria) {
    // inclui as subcategorias, para "Biossegurança" trazer o que está abaixo dela
    e.push({
      OR: [
        { category: { slug: filtros.categoria } },
        { category: { parent: { slug: filtros.categoria } } },
      ],
    });
  }

  if (filtros.marca) e.push({ brand: { slug: filtros.marca } });

  if (filtros.condicao) {
    e.push(
      Array.isArray(filtros.condicao)
        ? { condition: { in: filtros.condicao } }
        : { condition: filtros.condicao },
    );
  }

  if (filtros.voltagem) e.push({ voltage: filtros.voltagem });
  if (filtros.emEstoque) e.push({ OR: [{ trackInventory: false }, { stock: { gt: 0 } }] });
  if (filtros.precoMin !== undefined) e.push({ priceCents: { gte: filtros.precoMin } });
  if (filtros.precoMax !== undefined) e.push({ priceCents: { lte: filtros.precoMax } });

  if (e.length) where.AND = e;
  return where;
}

export async function buscarProdutos(opcoes: {
  filtros?: FiltrosCatalogo;
  ordem?: Ordenacao;
  pagina?: number;
  porPagina?: number;
}) {
  const porPagina = opcoes.porPagina ?? 24;
  const pagina = Math.max(1, opcoes.pagina ?? 1);
  const where = montarFiltro(opcoes.filtros ?? {});

  const [linhas, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: ordenar(opcoes.ordem),
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: SELECAO_CARD,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    produtos: linhas.map(paraCard),
    total,
    pagina,
    porPagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

export async function produtosEmDestaque(quantidade = 8) {
  const linhas = await prisma.product.findMany({
    where: { ...PUBLICADO, featured: true },
    orderBy: [{ publishedAt: "desc" }],
    take: quantidade,
    select: SELECAO_CARD,
  });
  return linhas.map(paraCard);
}

export async function produtosPorCondicao(
  condicao: ProductCondition,
  quantidade = 4,
) {
  const linhas = await prisma.product.findMany({
    where: { ...PUBLICADO, condition: condicao },
    orderBy: [{ stock: "desc" }, { publishedAt: "desc" }],
    take: quantidade,
    select: SELECAO_CARD,
  });
  return linhas.map(paraCard);
}
