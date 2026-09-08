import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { Etiqueta } from "@/components/ui/data";
import { Grade, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cartão de produto

   É a peça mais repetida da loja: aparece na home, na vitrine, na busca, na
   página do produto e nos favoritos. A ordem de leitura é sempre a mesma —
   imagem, condição, marca, nome, preço, parcelamento, disponibilidade e o
   convite para abrir o equipamento.

   A foto manda. Equipamento de alto valor não pode aparecer como miniatura no
   meio de uma caixa vazia: a moldura mantém proporção estável e a imagem usa o
   máximo da área disponível sem cortar o equipamento.
   ============================================================================ */

export type ProdutoCard = {
  slug: string;
  name: string;
  model: string;
  condition: "novo" | "seminovo" | "usado" | "recondicionado";
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string;
};

/**
 * Regras de parcelamento da loja, vindas de `getSettings`. Quem renderiza em
 * Server Component passa os valores reais; sem isso vale o padrão de
 * `calcularParcelas`, que é o mesmo do cadastro inicial.
 */
export type Parcelamento = { max: number; minimoCents: number };

/** Rótulo e tom de cada condição. Texto sempre presente — nunca só a cor. */
export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

/** Uma frase curta sobre a disponibilidade — ou nada, quando não se sabe. */
function disponibilidade(produto: ProdutoCard) {
  if (!produto.trackInventory) return null;
  if (produto.stock <= 0) {
    return {
      texto: produto.unique ? "Unidade vendida" : "Indisponível",
      classe: "text-graf-500",
      pontoClasse: "bg-graf-400",
    };
  }
  if (produto.unique) {
    return { texto: "Unidade única", classe: "text-jb-700", pontoClasse: "bg-jb-500" };
  }
  if (produto.stock <= 3) {
    return {
      texto: `Últimas ${produto.stock} unidades`,
      classe: "text-warn-700",
      pontoClasse: "bg-warn-500",
    };
  }
  return { texto: "Em estoque", classe: "text-ok-700", pontoClasse: "bg-ok-500" };
}

export function CardProduto({
  produto,
  prioridade,
  parcelamento,
  className,
}: {
  produto: ProdutoCard;
  /** Carrega a imagem sem esperar — só nos primeiros cartões da primeira dobra. */
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);
  const condicao = CONDICAO[produto.condition];
  const estado = disponibilidade(produto);
  const imagemLocal = Boolean(produto.imageUrl?.startsWith("/"));

  const precoAnterior =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;

  const desconto =
    !semEstoque && precoAnterior
      ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
      : 0;

  const chamada = soOrcamento ? "Pedir orçamento" : "Ver detalhes";

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-xl border border-graf-200 bg-white",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-px hover:border-graf-300 hover:shadow-raised",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-raised",
        className,
      )}
    >
      <div className="relative aspect-5/4 overflow-hidden bg-gradient-to-b from-white to-graf-50">
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            unoptimized={imagemLocal}
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, (max-width: 1536px) 30vw, 25vw"
            className={cn(
              "object-contain p-1 transition-transform duration-500 ease-out-quint sm:p-1.5",
              "group-hover:scale-[1.025]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-graf-500">
            <ImageOff className="size-8" aria-hidden />
            <span className="text-[0.8125rem] text-graf-500">Sem foto</span>
          </div>
        )}

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <span className="flex flex-wrap items-start gap-1.5">
            <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          </span>
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>

        {semEstoque ? (
          <p
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-graf-950/90 py-2 text-center text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-white"
          >
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-graf-100 p-4 sm:p-5">
        {produto.brandName ? (
          <p className="mb-1.5 truncate text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
            {produto.brandName}
          </p>
        ) : null}

        <h3 className="line-2 min-h-11 text-base font-bold leading-snug text-graf-950 sm:min-h-[3.125rem] sm:text-lg">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-xs after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="mt-1 truncate text-[0.8125rem] text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex h-6 items-center gap-2">
            {precoAnterior ? (
              <span className="tabular text-[0.8125rem] text-graf-500 line-through">
                {formatarPreco(precoAnterior)}
              </span>
            ) : null}
            {desconto >= 5 ? (
              <Etiqueta tom="ok" className="px-2 py-0.5 text-xs">
                −{desconto}%
              </Etiqueta>
            ) : null}
          </div>

          {soOrcamento ? (
            <p className="text-xl font-extrabold leading-8 tracking-tight text-graf-950">
              Sob orçamento
            </p>
          ) : (
            <p className="tabular text-2xl font-extrabold leading-8 tracking-tight text-graf-950">
              {formatarPreco(produto.priceCents)}
            </p>
          )}

          <div className="flex h-5 items-center">
            {soOrcamento ? (
              <span className="truncate text-[0.8125rem] text-graf-500">
                A equipe responde com preço e prazo.
              </span>
            ) : parcelas ? (
              <span className="tabular truncate text-[0.8125rem] text-graf-500">
                em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 border-t border-graf-100 pt-3">
            <div className="flex h-6 items-center justify-between gap-3">
              {estado ? (
                <span
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold",
                    estado.classe,
                  )}
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", estado.pontoClasse)}
                    aria-hidden
                  />
                  <span className="truncate">{estado.texto}</span>
                </span>
              ) : (
                <span aria-hidden />
              )}

              <span
                aria-hidden
                className={cn(
                  "flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-bold text-graf-800",
                  "transition-colors duration-150 group-hover:text-jb-600",
                )}
              >
                {chamada}
                <ArrowRight className="size-4 shrink-0 transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Vitrine de cartões. Uma coluna no celular — equipamento caro pede leitura confortável. */
export function GradeProdutos({
  produtos,
  colunas,
  parcelamento,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  className?: string;
}) {
  return (
    <Grade
      como="ul"
      espaco="md"
      colunas={colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 }}
      className={className}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardProduto
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            className="w-full"
          />
        </li>
      ))}
    </Grade>
  );
}
