import type { Prisma } from "@prisma/client";

import type { Tom } from "@/components/ui/data";
import { calcularParcelas, formatarPreco, paraCentavos } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import type { SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Peças compartilhadas pelos blocos da página principal

   Um único `select` para todos eles: o que o card da home mostra e nada além.
   Descrição, ficha técnica e documentos ficam na página do equipamento.
   ============================================================================ */

export const SELECAO_HOME = {
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
  warrantyMonths: true,
  brand: { select: { name: true } },
  media: {
    orderBy: { order: "asc" },
    take: 1,
    select: { alt: true, media: { select: { url: true, alt: true } } },
  },
} satisfies Prisma.ProductSelect;

export type ProdutoHome = Prisma.ProductGetPayload<{ select: typeof SELECAO_HOME }>;

/** Rótulo e tom de cada condição — texto sempre presente, nunca só a cor. */
export const CONDICAO_HOME: Record<ProdutoHome["condition"], { rotulo: string; tom: Tom }> = {
  novo: { rotulo: "Novo", tom: "neutro" },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" },
  usado: { rotulo: "Usado", tom: "neutro" },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" },
};

export type Foto = { url: string; alt: string };

/** Primeira foto cadastrada. Sem foto, devolve null — nada de imagem inventada. */
export function fotoDe(produto: ProdutoHome): Foto | null {
  const primeira = produto.media[0];
  if (!primeira) return null;
  return {
    url: imagemProdutoSemFundo(primeira.media.url),
    alt: primeira.alt || primeira.media.alt || produto.name,
  };
}

/* ------------------------------------------------------------ parcelamento */

export type Parcelamento = { max: number; minimaCents: number };

/**
 * Lê o parcelamento das configurações. Valor inválido cai no padrão da loja
 * em vez de derrubar a página — e a simulação some sozinha quando a parcela
 * fica abaixo do mínimo.
 */
export function lerParcelamento(s: SettingsMap): Parcelamento {
  const max = Number.parseInt(s.parcelas_max, 10);
  const minima = paraCentavos(s.parcela_minima);
  return {
    max: Number.isFinite(max) && max >= 2 ? Math.min(max, 24) : 12,
    minimaCents: minima > 0 ? minima : 5000,
  };
}

/* ----------------------------------------------------------- disponibilidade */

export type Disponibilidade = { texto: string; tom: Tom };

type EstadoVenda = Pick<
  ProdutoHome,
  "allowDirectPurchase" | "priceCents" | "trackInventory" | "stock" | "unique"
>;

/** O estado de venda em palavras, sempre a partir do dado — nunca de promessa. */
export function disponibilidadeDe(produto: EstadoVenda): Disponibilidade {
  if (!produto.allowDirectPurchase || produto.priceCents <= 0) {
    return { texto: "Sob orçamento", tom: "neutro" };
  }
  if (produto.trackInventory && produto.stock <= 0) {
    return { texto: produto.unique ? "Vendido" : "Indisponível", tom: "neutro" };
  }
  if (produto.trackInventory && produto.unique) {
    return { texto: "Unidade única disponível", tom: "alerta" };
  }
  if (produto.trackInventory && produto.stock <= 3) {
    return {
      texto: `Últimas ${produto.stock} ${produto.stock === 1 ? "unidade" : "unidades"}`,
      tom: "aguardando",
    };
  }
  return { texto: "Disponível", tom: "ok" };
}

/* ------------------------------------------------------------------- preço */

/**
 * Preço, preço anterior e simulação de parcela.
 *
 * O parcelamento é calculado aqui, com o teto e o mínimo que a JB configurou —
 * nunca escrito à mão no texto de uma seção.
 */
export function BlocoPreco({
  produto,
  parcelamento,
  tamanho = "md",
  className,
}: {
  produto: Pick<
    ProdutoHome,
    "priceCents" | "compareAtCents" | "allowDirectPurchase" | "trackInventory" | "stock"
  >;
  parcelamento: Parcelamento;
  tamanho?: "md" | "lg";
  className?: string;
}) {
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;

  if (soOrcamento) {
    return (
      <p className={cn("font-bold text-graf-800", tamanho === "lg" ? "text-xl" : "text-lg", className)}>
        Sob orçamento
      </p>
    );
  }

  const parcelas = calcularParcelas(
    produto.priceCents,
    parcelamento.max,
    parcelamento.minimaCents,
  );
  const anterior =
    produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;

  return (
    <div className={className}>
      {anterior ? (
        <p className="text-sm text-graf-500 line-through">{formatarPreco(anterior)}</p>
      ) : null}
      <p
        className={cn(
          "tabular font-extrabold tracking-tight text-graf-950",
          tamanho === "lg" ? "text-3xl" : "text-2xl",
        )}
      >
        {formatarPreco(produto.priceCents)}
      </p>
      {parcelas ? (
        <p className="mt-1 text-sm text-graf-500">
          em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
        </p>
      ) : null}
    </div>
  );
}
