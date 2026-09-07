import "server-only";

import { termosDaBusca, validarConsulta } from "@/lib/busca/intencao";
import { PUBLICADO } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Sugestões da busca — o que aparece enquanto se digita

   Isto NÃO é a busca. A busca é `buscarTudo`, que roda em /busca com quatro
   grupos e explicação de pertinência. Aqui a pergunta é outra e mais estreita:
   "o que a JB tem que já responde ao que está sendo digitado?" — para quem
   ainda está digitando, e vai decidir em menos de um segundo.

   Três decisões desenham o arquivo:

   1. **Teto baixo de propósito.** Cinco produtos, quatro categorias, quatro
      marcas. Uma lista de vinte itens sob o campo esconde a página inteira e
      não é lida; o resto está a um Enter de distância, em /busca.

   2. **Identificador tem caminho próprio.** Digitar um SKU, um código de
      fabricante ou um EAN não é a mesma coisa que digitar "autoclave": é
      pergunta com resposta única. Quando a consulta casa exatamente com um
      identificador, esse produto vem primeiro e vem marcado — a pessoa está
      conferindo se é o equipamento certo, não navegando.

   3. **Nada é inventado.** Categoria e marca só entram com contagem real de
      equipamento publicado; sugestão de termo sai da taxonomia do catálogo,
      não de uma lista escrita à mão que envelhece sozinha.
   ============================================================================ */

const TETO_PRODUTOS = 5;
const TETO_TAXONOMIA = 4;

export type SugestaoDeProduto = {
  slug: string;
  nome: string;
  marca: string | null;
  modelo: string;
  condicao: string;
  precoCents: number;
  compraDireta: boolean;
  imagem: string | null;
  /** `true` quando a consulta casou com SKU, MPN ou GTIN deste equipamento. */
  porIdentificador: boolean;
};

export type SugestaoDeTaxonomia = {
  slug: string;
  nome: string;
  total: number;
};

export type Sugestoes = {
  consulta: string;
  produtos: SugestaoDeProduto[];
  categorias: SugestaoDeTaxonomia[];
  marcas: SugestaoDeTaxonomia[];
  /** Total aproximado no catálogo, para o "ver todos os N resultados". */
  totalDeProdutos: number;
};

export const SEM_SUGESTOES: Sugestoes = {
  consulta: "",
  produtos: [],
  categorias: [],
  marcas: [],
  totalDeProdutos: 0,
};

/** `OR` de `contains` para uma lista de termos sobre uma lista de campos. */
function ou(termos: string[], campos: string[]) {
  return termos.flatMap((termo) =>
    campos.map((campo) => ({ [campo]: { contains: termo, mode: "insensitive" as const } })),
  );
}

/**
 * A consulta parece um identificador?
 *
 * SKU, MPN e EAN da JB e dos fabricantes são alfanuméricos com hífen e sem
 * espaço. "DEMO-ULT-JT" passa; "autoclave 21 litros" não. O teste é grosseiro
 * de propósito — ele só decide se vale a pena fazer a consulta exata, e uma
 * consulta exata que não acha nada não custa nada além dela mesma.
 */
function pareceIdentificador(consulta: string): boolean {
  const texto = consulta.trim();
  if (texto.length < 3 || texto.includes(" ")) return false;
  return /^[a-z0-9][a-z0-9._/-]*$/i.test(texto) && /\d|-/.test(texto);
}

export async function sugerir(bruta: string): Promise<Sugestoes> {
  const validada = validarConsulta(bruta);
  if (!validada.ok) return SEM_SUGESTOES;

  const consulta = validada.consulta;
  const termos = termosDaBusca(consulta);
  const porCodigo = pareceIdentificador(consulta);

  const selecaoDeProduto = {
    slug: true,
    name: true,
    model: true,
    condition: true,
    priceCents: true,
    allowDirectPurchase: true,
    sku: true,
    mpn: true,
    gtin: true,
    brand: { select: { name: true } },
    media: {
      orderBy: { order: "asc" as const },
      take: 1,
      select: { media: { select: { url: true } } },
    },
  };

  const [porNome, porIdentificador, categorias, marcas, totalDeProdutos] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...PUBLICADO,
        OR: ou(termos, ["name", "shortDescription", "model"]),
      },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: TETO_PRODUTOS,
      select: selecaoDeProduto,
    }),

    /* Identificador é igualdade, não `contains`: "DEMO-ULT" não deve casar com
       "DEMO-ULT-JT" como se fosse a mesma peça. `mode: insensitive` porque o
       cadastro grava como o fabricante escreve e ninguém digita a caixa certa. */
    porCodigo
      ? prisma.product.findMany({
          where: {
            ...PUBLICADO,
            OR: [
              { sku: { equals: consulta, mode: "insensitive" } },
              { mpn: { equals: consulta, mode: "insensitive" } },
              { gtin: { equals: consulta.replace(/\D/g, "") } },
            ],
          },
          take: 2,
          select: selecaoDeProduto,
        })
      : Promise.resolve([]),

    prisma.category.findMany({
      where: {
        OR: ou(termos, ["name"]),
        products: { some: PUBLICADO },
      },
      orderBy: { name: "asc" },
      take: TETO_TAXONOMIA,
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: PUBLICADO } } },
      },
    }),

    prisma.brand.findMany({
      where: {
        OR: ou(termos, ["name"]),
        products: { some: PUBLICADO },
      },
      orderBy: { name: "asc" },
      take: TETO_TAXONOMIA,
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: PUBLICADO } } },
      },
    }),

    prisma.product.count({
      where: {
        ...PUBLICADO,
        OR: ou(termos, ["name", "shortDescription", "model", "sku"]),
      },
    }),
  ]);

  type Linha = (typeof porNome)[number];

  const paraSugestao = (linha: Linha, achadoPorCodigo: boolean): SugestaoDeProduto => ({
    slug: linha.slug,
    nome: linha.name,
    marca: linha.brand?.name ?? null,
    modelo: linha.model,
    condicao: linha.condition,
    precoCents: linha.priceCents,
    compraDireta: linha.allowDirectPurchase,
    imagem: linha.media[0]?.media.url ?? null,
    porIdentificador: achadoPorCodigo,
  });

  // O casamento por código vem primeiro e não é repetido embaixo.
  const vistos = new Set(porIdentificador.map((linha) => linha.slug));
  const produtos = [
    ...porIdentificador.map((linha) => paraSugestao(linha, true)),
    ...porNome
      .filter((linha) => !vistos.has(linha.slug))
      .map((linha) => paraSugestao(linha, false)),
  ].slice(0, TETO_PRODUTOS);

  return {
    consulta,
    produtos,
    categorias: categorias.map((categoria) => ({
      slug: categoria.slug,
      nome: categoria.name,
      total: categoria._count.products,
    })),
    marcas: marcas.map((marca) => ({
      slug: marca.slug,
      nome: marca.name,
      total: marca._count.products,
    })),
    totalDeProdutos,
  };
}

/* ============================================================================
   Atalhos do campo vazio

   O campo aberto sem nada digitado não pode ficar mudo: é onde a pessoa que
   não sabe o nome exato do equipamento decide se a busca vale a pena. As
   categorias com mais itens publicados respondem isso melhor que uma lista
   fixa — elas mudam sozinhas quando o catálogo muda.
   ============================================================================ */

export type AtalhosDaBusca = {
  categorias: SugestaoDeTaxonomia[];
};

export async function atalhosDaBusca(quantidade = 6): Promise<AtalhosDaBusca> {
  const categorias = await prisma.category.findMany({
    where: { products: { some: PUBLICADO } },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: PUBLICADO } } },
    },
  });

  return {
    categorias: categorias
      .map((categoria) => ({
        slug: categoria.slug,
        nome: categoria.name,
        total: categoria._count.products,
      }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, quantidade),
  };
}
