import { construirFicha, type ProdutoParaFicha, type UnidadeParaFicha } from "@/domain/specs/construir";
import type { FichaDeEspecificacoes } from "@/domain/specs/schema";

/* ============================================================================
   A ponte entre a linha do banco e a ficha tipada

   `construirFicha` é domínio puro: ele recebe `ProdutoParaFicha` e não sabe o
   que é Prisma. Alguém precisa traduzir a linha do banco para esse formato —
   e por um tempo esse alguém foi cada tela, à mão:

     · a PDP montava o objeto inline, em `page.tsx`;
     · o mini-comparador tinha o seu, em `comparacao-rapida.tsx`;
     · a página `/comparar` tinha o terceiro;
     · e o prontuário do cliente não tinha nenhum — por isso ele exibia
       "Voltagem: 220" sem unidade e "Marca e modelo: Cristófoli" sem modelo,
       enquanto a página do MESMO produto, dois cliques adiante, dizia
       "Bivolt (110/220 V)" e trazia capacidade, bandejas e ciclo.

   Três cópias da mesma tradução e uma tela sem tradução nenhuma é o mesmo
   defeito que `construirFicha` existe para fechar, um andar acima. Aqui ele
   fecha de vez: uma tradução, um `select`, e o prontuário lê a ficha do
   produto de origem POR REFERÊNCIA — nunca por cópia digitada de novo.

   O `select` mora junto com a tradução de propósito. Um campo novo na ficha
   exige tocar os dois, lado a lado; separados, o campo entrava no tradutor,
   não entrava no `select`, e a ficha perdia o dado em silêncio.
   ============================================================================ */

/**
 * Tudo — e só — o que a ficha precisa ler de um produto.
 *
 * Use com `satisfies Prisma.ProductSelect` no ponto de uso ou espalhe dentro
 * de um `select` maior: `{ ...SELECT_FICHA, priceCents: true }`.
 */
export const SELECT_FICHA = {
  name: true,
  sku: true,
  model: true,
  condition: true,
  voltage: true,
  warrantyMonths: true,
  weightGrams: true,
  widthMm: true,
  heightMm: true,
  depthMm: true,
  manufacturer: true,
  regulatoryHolder: true,
  anvisaCode: true,
  installationPolicy: true,
  boxContents: true,
  infrastructureNotes: true,
  brand: { select: { name: true } },
  category: { select: { slug: true, name: true } },
  specs: {
    orderBy: { order: "asc" as const },
    select: { label: true, value: true, order: true },
  },
} as const;

/**
 * A forma da linha que `paraFicha` sabe ler.
 *
 * Estrutural, e não `Prisma.ProductGetPayload<...>`, porque quem chama quase
 * sempre traz campos a mais (preço, slug, status) no mesmo `select`. Exigir o
 * payload exato obrigaria cada tela a montar um objeto intermediário — que é
 * a cópia manual que este módulo veio apagar.
 */
export type ProdutoDaFicha = {
  name: string;
  sku: string;
  model: string;
  condition: string;
  voltage: string | null;
  warrantyMonths: number | null;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  manufacturer: string | null;
  regulatoryHolder: string | null;
  anvisaCode: string | null;
  installationPolicy: string;
  boxContents: string[];
  infrastructureNotes: string[];
  brand: { name: string } | null;
  category: { slug: string; name: string } | null;
  specs: { label: string; value: string; order: number }[];
};

/** A linha do banco no formato que o domínio entende. */
export function paraFicha(
  produto: ProdutoDaFicha,
  unidade?: UnidadeParaFicha | null,
): ProdutoParaFicha {
  return {
    nome: produto.name,
    sku: produto.sku,
    modelo: produto.model,
    condicao: produto.condition,
    marca: produto.brand?.name ?? null,
    categoria: produto.category
      ? { slug: produto.category.slug, nome: produto.category.name }
      : null,
    fabricante: produto.manufacturer,
    detentor: produto.regulatoryHolder,
    anvisa: produto.anvisaCode,
    voltagem: produto.voltage,
    pesoGramas: produto.weightGrams,
    larguraMm: produto.widthMm,
    alturaMm: produto.heightMm,
    profundidadeMm: produto.depthMm,
    garantiaMeses: produto.warrantyMonths,
    requisitos: produto.infrastructureNotes,
    itensInclusos: produto.boxContents,
    politicaDeInstalacao: produto.installationPolicy,
    specs: produto.specs,
    unidade: unidade ?? null,
  };
}

/** A ficha completa de um produto do catálogo, com a unidade física quando há. */
export function fichaDoProduto(
  produto: ProdutoDaFicha,
  unidade?: UnidadeParaFicha | null,
): FichaDeEspecificacoes {
  return construirFicha(paraFicha(produto, unidade));
}
