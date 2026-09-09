import "server-only";

import type { Prisma, ProductCondition } from "@prisma/client";

import type { ProdutoCard } from "@/components/loja/card-produto";
import type { ProdutoMarketplaceCard } from "@/components/loja/marketplace/tipos";
import { mapaDeSinonimos, unificarPorNome } from "@/lib/homonimos";
import { destaquesDoCard } from "@/lib/marketplace/destaques-card";
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

export const SELECAO_CARD_MARKETPLACE = {
  ...SELECAO_CARD,
  voltage: true,
  warrantyMonths: true,
  category: { select: { name: true } },
  specs: {
    orderBy: { order: "asc" },
    take: 6,
    select: { label: true, value: true, order: true },
  },
} satisfies Prisma.ProductSelect;

type LinhaMarketplace = Prisma.ProductGetPayload<{
  select: typeof SELECAO_CARD_MARKETPLACE;
}>;

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

export function paraCardMarketplace(produto: LinhaMarketplace): ProdutoMarketplaceCard {
  return {
    ...paraCard(produto),
    categoryName: produto.category?.name ?? null,
    destaques: destaquesDoCard({
      specs: produto.specs,
      voltage: produto.voltage,
      warrantyMonths: produto.warrantyMonths,
    }),
  };
}

/** Produto visível ao público. Rascunho e arquivado nunca aparecem. */
export const PUBLICADO: Prisma.ProductWhereInput = {
  status: "active",
};

/**
 * Unidade única já vendida — o anúncio continua, a oferta não.
 *
 * Seminovo na JB é unidade, não modelo: quando aquela autoclave específica
 * sai, não existe uma segunda igual esperando reposição. A página dela segue
 * de pé (histórico, link antigo, busca), mas ela deixa de ocupar lugar na
 * lista de quem está escolhendo o que comprar.
 *
 * Produto de linha sem estoque é outra coisa e continua listado: ele volta, e
 * o cartão já diz "Indisponível".
 */
export const UNIDADE_VENDIDA: Prisma.ProductWhereInput = {
  unique: true,
  trackInventory: true,
  stock: { lte: 0 },
};

/** Tem estoque, ou não controla estoque — nos dois casos, dá para comprar. */
export const DISPONIVEL: Prisma.ProductWhereInput = {
  OR: [{ trackInventory: false }, { stock: { gt: 0 } }],
};

/**
 * O que pode encabeçar uma vitrine de destaque.
 *
 * Publicado, com foto e disponível. É o filtro que separa "está no catálogo"
 * de "é o que a JB mostra primeiro": a home abria com uma cadeira sem foto,
 * por R$ 500, já vendida — e anunciava esse mesmo valor como "menor preço do
 * catálogo". Nada disso era mentira do código; era o código promovendo o que
 * o cadastro ainda não terminou.
 *
 * Vitrine é escolha editorial. Lista é inventário. Só a primeira usa isto.
 */
export const VITRINE: Prisma.ProductWhereInput = {
  ...PUBLICADO,
  media: { some: {} },
  /* `AND` e não espalhar `DISPONIVEL` aqui: quem usa isto costuma escrever
     `{ ...VITRINE, condition: "seminovo" }`, e um `OR` solto no topo some no
     primeiro spread que trouxer outro `OR`. */
  AND: [DISPONIVEL],
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
  /**
   * Traz de volta as unidades únicas já vendidas, que a lista esconde por
   * padrão. É a saída explícita — vem de `?vendidos=1`, com ficha removível
   * na barra de filtros — para quem quer ver o histórico do que já saiu.
   */
  incluirVendidos?: boolean;
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
  if (filtros.emEstoque) e.push(DISPONIVEL);

  /* A unidade vendida sai da lista por padrão. Ela não é uma oferta a menos
     na prateleira: é uma prateleira vazia com etiqueta. Continua alcançável
     pelo endereço dela e por `?vendidos=1`. */
  if (!filtros.incluirVendidos) e.push({ NOT: UNIDADE_VENDIDA });

  if (filtros.precoMin !== undefined) e.push({ priceCents: { gte: filtros.precoMin } });
  if (filtros.precoMax !== undefined) e.push({ priceCents: { lte: filtros.precoMax } });

  if (e.length) where.AND = e;
  return where;
}

/* ============================================================================
   Cadastros homônimos — um rótulo, vários slugs

   O catálogo tem duas categorias chamadas "Biossegurança" e duas marcas
   chamadas "Schuster", herdadas de cargas diferentes. A vitrine mostra um
   rótulo só (ver `src/lib/homonimos.ts`); para o resultado do clique bater
   com a contagem do rótulo, o filtro precisa abrir aquele slug em todos os
   cadastros de mesmo nome.

   O endereço continua com um slug só — curto, compartilhável, estável. A
   abertura acontece na consulta, e some sozinha quando o banco deixar de ter
   duplicata.
   ============================================================================ */

async function expandirSinonimos(
  slugs: string[],
  carregar: () => Promise<{ slug: string; name: string }[]>,
): Promise<string[]> {
  if (slugs.length === 0) return slugs;

  try {
    const universo = await carregar();
    const mapa = mapaDeSinonimos(universo.map((l) => ({ slug: l.slug, nome: l.name })));
    return [...new Set(slugs.flatMap((slug) => mapa.get(slug) ?? [slug]))];
  } catch {
    /* Sem o banco, filtrar pelo slug pedido é pior do que nada? Não: é
       exatamente o comportamento antigo. A abertura é melhoria, não
       requisito. */
    return slugs;
  }
}

/** Categorias publicadas de mesmo nome que as pedidas. */
export function expandirCategorias(slugs: string[]) {
  return expandirSinonimos(slugs, () =>
    prisma.category.findMany({ where: { published: true }, select: { slug: true, name: true } }),
  );
}

/** Marcas publicadas de mesmo nome que as pedidas. */
export function expandirMarcas(slugs: string[]) {
  return expandirSinonimos(slugs, () =>
    prisma.brand.findMany({ where: { published: true }, select: { slug: true, name: true } }),
  );
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

export async function buscarProdutosMarketplace(opcoes: {
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
      select: SELECAO_CARD_MARKETPLACE,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    produtos: linhas.map(paraCardMarketplace),
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
  /**
   * Unidades desta condição que já foram vendidas e por isso saíram da lista.
   * A página declara o número em vez de deixar a contagem encolher em
   * silêncio — e oferece o caminho para vê-las.
   */
  vendidos: number;
};

export async function dadosDaColecao(
  condicao: ProductCondition,
  limiteCategorias = 6,
): Promise<DadosDaColecao> {
  /* A contagem do topo tem que ser a mesma da lista logo abaixo: as duas
     tiram as unidades já vendidas. "3 unidades publicadas" com 2 cartões na
     tela é um erro de página, não um detalhe de cadastro. */
  const listavel: Prisma.ProductWhereInput = { ...PUBLICADO, NOT: UNIDADE_VENDIDA };

  const [destaque, categorias, totalNovos, totalSeminovos, vendidos] = await Promise.all([
    /* O destaque sai de `VITRINE`: com foto e disponível. Era só "tem foto", e
       por isso o painel podia abrir com uma unidade já vendida. */
    prisma.product.findFirst({
      where: { ...VITRINE, condition: condicao },
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
        _count: { select: { products: { where: { ...listavel, condition: condicao } } } },
      },
    }),
    prisma.product.count({ where: { ...listavel, condition: "novo" } }),
    prisma.product.count({ where: { ...listavel, condition: "seminovo" } }),
    prisma.product.count({ where: { ...PUBLICADO, condition: condicao, ...UNIDADE_VENDIDA } }),
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
       só oferece caminho que chega a uma lista com produto do outro lado.

       `unificarPorNome` entra antes do corte: a fileira dos seminovos abria
       com "Biossegurança 1 · Biossegurança 1", duas pastilhas idênticas que
       levavam a listas diferentes. Agora é uma, com a soma. */
    categorias: unificarPorNome(
      categorias
        .filter((categoria) => categoria._count.products > 0)
        .map((categoria) => ({
          slug: categoria.slug,
          nome: categoria.name,
          quantidade: categoria._count.products,
        })),
    )
      .slice(0, limiteCategorias)
      .map((categoria) => ({
        slug: categoria.slug,
        nome: categoria.nome,
        quantidade: categoria.quantidade ?? 0,
        href: `/categoria/${categoria.slug}?condicao=${condicao}`,
      })),
    totalNovos,
    totalSeminovos,
    vendidos,
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
  /* Toda faixa da home puxa mais do que vai mostrar. É o que dá margem para a
     curadoria logo abaixo tirar as repetições sem deixar a fileira pela
     metade: quatro cartões sempre foram quatro equipamentos DIFERENTES, e não
     era isso que a página entregava. */
  const [destaque, ofertas, seminovos, procurados, totalPublicado, marcas, menorPreco] =
    await Promise.all([
      prisma.product.findFirst({
        where: VITRINE,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        select: SELECAO_CARD,
      }),
      /* Oferta é desconto real: `compareAtCents` acima do preço atual. Sem
         isso a faixa viraria "todo mundo em promoção", que é a promoção que
         ninguém acredita. */
      prisma.product.findMany({
        where: { ...VITRINE, compareAtCents: { not: null } },
        orderBy: [{ publishedAt: "desc" }],
        take: 12,
        select: SELECAO_CARD,
      }),
      prisma.product.findMany({
        where: { ...VITRINE, condition: "seminovo" },
        orderBy: [{ publishedAt: "desc" }],
        take: 12,
        select: SELECAO_CARD,
      }),
      prisma.product.findMany({
        where: { ...VITRINE, condition: "novo" },
        orderBy: [{ featured: "desc" }, { stock: "desc" }, { publishedAt: "desc" }],
        take: 16,
        select: SELECAO_CARD,
      }),
      /* "Equipamentos em linha" conta o que dá para comprar hoje: unidade já
         vendida engrossa o número sem engrossar a vitrine. */
      prisma.product.count({ where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA } }),
      /* Marca é contada pelo nome, não pelo cadastro: "Schuster" duas vezes
         no banco é uma marca só na frase da home. */
      prisma.brand.findMany({
        where: { published: true, products: { some: { ...PUBLICADO, NOT: UNIDADE_VENDIDA } } },
        select: { slug: true, name: true },
      }),
      /* O menor preço tem que ser o de algo que a pessoa consiga comprar
         clicando. Era o de uma unidade vendida e sem foto, que a home
         anunciava como chamariz. */
      prisma.product.aggregate({
        where: { ...VITRINE, allowDirectPurchase: true, priceCents: { gt: 0 } },
        _min: { priceCents: true },
      }),
    ]);

  /* ------------------------------------------------------------ curadoria

     As quatro vitrines da home tinham o mesmo catálogo de 13 itens por
     trás e nenhuma memória entre si: o mesmo equipamento abria a página no
     painel de destaque, voltava em "ofertas" e voltava de novo em "o que a
     clínica repõe sempre". A página ficava longa dizendo pouco.

     A regra é de ordem: cada faixa fica com o que as anteriores não usaram,
     e a lista maior vem por último — assim a faixa mais específica (oferta,
     seminovo) escolhe primeiro, e a mais genérica se acomoda com o resto.
     Faixa que fica sem nada some sozinha, por conta do `FaixaVitrine`. */
  const jaMostrados = new Set<string>();

  const inedito = (produtos: LinhaCard[], quantidade: number) => {
    const escolhidos: ProdutoCard[] = [];
    for (const linha of produtos) {
      if (escolhidos.length >= quantidade) break;
      if (jaMostrados.has(linha.slug)) continue;
      jaMostrados.add(linha.slug);
      escolhidos.push(paraCard(linha));
    }
    return escolhidos;
  };

  if (destaque) jaMostrados.add(destaque.slug);

  const emOferta = inedito(
    ofertas.filter(
      (linha) => linha.compareAtCents !== null && linha.compareAtCents > linha.priceCents,
    ),
    4,
  );

  return {
    destaque: destaque ? paraCard(destaque) : null,
    ofertas: emOferta,
    seminovos: inedito(seminovos, 4),
    procurados: inedito(procurados, 8),
    totalPublicado,
    totalMarcas: unificarPorNome(marcas.map((m) => ({ slug: m.slug, nome: m.name }))).length,
    menorPrecoCents: menorPreco._min.priceCents ?? null,
  };
}
