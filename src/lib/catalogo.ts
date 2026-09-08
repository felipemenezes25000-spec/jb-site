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
  /**
   * Categoria, marca e voltagem aceitam vários valores porque a barra de
   * filtros usa caixas de seleção: marcar ALT e Schuster tem que trazer as
   * duas. Antes só o primeiro valor era usado, e a segunda caixa ficava
   * marcada na tela sem filtrar nada.
   */
  categoria?: string | string[];
  marca?: string | string[];
  condicao?: ProductCondition | ProductCondition[];
  voltagem?: string | string[];
  precoMin?: number;
  precoMax?: number;
  emEstoque?: boolean;
};

/** Normaliza "um ou vários" numa lista sem vazios. */
function comoLista(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  return (Array.isArray(valor) ? valor : [valor]).map((v) => v.trim()).filter(Boolean);
}

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

  const categorias = comoLista(filtros.categoria);
  if (categorias.length) {
    // inclui as subcategorias, para "Biossegurança" trazer o que está abaixo dela
    e.push({
      OR: [
        { category: { slug: { in: categorias } } },
        { category: { parent: { slug: { in: categorias } } } },
      ],
    });
  }

  const marcas = comoLista(filtros.marca);
  if (marcas.length) e.push({ brand: { slug: { in: marcas } } });

  if (filtros.condicao) {
    e.push(
      Array.isArray(filtros.condicao)
        ? { condition: { in: filtros.condicao } }
        : { condition: filtros.condicao },
    );
  }

  const voltagens = comoLista(filtros.voltagem);
  if (voltagens.length) e.push({ voltage: { in: voltagens } });
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

/* ============================================================================
   Abertura das coleções comerciais — /loja (novos) e /seminovos

   As duas páginas abrem com o mesmo cabeçalho e precisam exatamente das
   mesmas quatro respostas. Buscá-las aqui mantém as duas coleções coerentes:
   o que aparece em "Novos 5" na página do seminovo é a mesma contagem que a
   própria /loja publica.
   ============================================================================ */

export type DadosDaColecao = {
  /** Foto real de um equipamento publicado — nunca imagem de ilustração. */
  destaque: {
    url: string;
    alt: string;
    nome: string;
    marca: string | null;
  } | null;
  categorias: { slug: string; nome: string; quantidade: number; href: string }[];
  totalNovos: number;
  totalSeminovos: number;
};

export async function dadosDaColecao(
  condicao: ProductCondition,
  limiteCategorias = 6,
): Promise<DadosDaColecao> {
  const [destaque, categorias, totalNovos, totalSeminovos] = await Promise.all([
    /* `media: { some: {} }` é o que impede o painel de abrir com um quadro
       vazio: o destaque é escolhido entre os equipamentos que têm foto. */
    prisma.product.findFirst({
      where: { ...PUBLICADO, condition: condicao, media: { some: {} } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        brand: { select: { name: true } },
        media: {
          take: 1,
          orderBy: { order: "asc" },
          select: { alt: true, media: { select: { url: true, alt: true } } },
        },
      },
    }),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { ...PUBLICADO, condition: condicao } } } },
      },
    }),
    prisma.product.count({ where: { ...PUBLICADO, condition: "novo" } }),
    prisma.product.count({ where: { ...PUBLICADO, condition: "seminovo" } }),
  ]);

  const foto = destaque?.media[0];

  return {
    destaque: foto
      ? {
          url: foto.media.url,
          alt: foto.alt || foto.media.alt || destaque.name,
          nome: destaque.name,
          marca: destaque.brand?.name ?? null,
        }
      : null,
    /* Categoria sem equipamento naquela condição não vira pastilha: a fileira
       só oferece caminho que chega a uma lista com produto do outro lado. */
    categorias: categorias
      .filter((categoria) => categoria._count.products > 0)
      .slice(0, limiteCategorias)
      .map((categoria) => ({
        slug: categoria.slug,
        nome: categoria.name,
        quantidade: categoria._count.products,
        href: `/categoria/${categoria.slug}?condicao=${condicao}`,
      })),
    totalNovos,
    totalSeminovos,
  };
}

/* ============================================================================
   Home — o catálogo visto da porta de entrada

   Três listas e três números, todos do catálogo publicado. Nenhum valor é
   escrito à mão: quando a JB publica ou tira um equipamento, a home muda
   sozinha. É o mesmo princípio das coleções — a página só diz o que o banco
   sustenta.
   ============================================================================ */

export type DadosDaHome = {
  destaque: ProdutoCard | null;
  ofertas: ProdutoCard[];
  seminovos: ProdutoCard[];
  procurados: ProdutoCard[];
  totalPublicado: number;
  totalMarcas: number;
  menorPrecoCents: number | null;
};

export async function dadosDaHome(): Promise<DadosDaHome> {
  const [destaque, ofertas, seminovos, procurados, totalPublicado, totalMarcas, menorPreco] =
    await Promise.all([
      prisma.product.findFirst({
        where: { ...PUBLICADO, media: { some: {} } },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        select: SELECAO_CARD,
      }),
      /* Oferta é desconto real: `compareAtCents` acima do preço atual. Sem
         isso a faixa viraria "todo mundo em promoção", que é a promoção que
         ninguém acredita. */
      prisma.product.findMany({
        where: { ...PUBLICADO, compareAtCents: { not: null } },
        orderBy: [{ publishedAt: "desc" }],
        take: 8,
        select: SELECAO_CARD,
      }),
      prisma.product.findMany({
        where: { ...PUBLICADO, condition: "seminovo" },
        orderBy: [{ publishedAt: "desc" }],
        take: 4,
        select: SELECAO_CARD,
      }),
      prisma.product.findMany({
        where: { ...PUBLICADO, condition: "novo" },
        orderBy: [{ featured: "desc" }, { stock: "desc" }, { publishedAt: "desc" }],
        take: 8,
        select: SELECAO_CARD,
      }),
      prisma.product.count({ where: PUBLICADO }),
      prisma.brand.count({ where: { published: true, products: { some: PUBLICADO } } }),
      prisma.product.aggregate({
        where: { ...PUBLICADO, priceCents: { gt: 0 } },
        _min: { priceCents: true },
      }),
    ]);

  const emOferta = ofertas
    .map(paraCard)
    .filter((produto) => produto.compareAtCents && produto.compareAtCents > produto.priceCents);

  return {
    destaque: destaque ? paraCard(destaque) : null,
    ofertas: emOferta,
    seminovos: seminovos.map(paraCard),
    procurados: procurados.map(paraCard),
    totalPublicado,
    totalMarcas,
    menorPrecoCents: menorPreco._min.priceCents ?? null,
  };
}
