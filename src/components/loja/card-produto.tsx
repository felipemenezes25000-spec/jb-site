import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { Etiqueta } from "@/components/ui/data";
import { Grade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

export type ProdutoCard = {
  /** Chave do produto — usada por quem precisa agir sobre ele (guardar, etc.). */
  id: string;
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

export type Parcelamento = { max: number; minimoCents: number };

export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

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
  chamadaDestacada,
  className,
}: {
  produto: ProdutoCard;
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  chamadaDestacada?: boolean;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);
  const condicao = CONDICAO[produto.condition];
  const estado = disponibilidade(produto);
  const precoAnterior =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto =
    !semEstoque && precoAnterior
      ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
      : 0;
  const chamada = soOrcamento ? "Pedir orçamento" : "Ver produto";

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-xl border border-graf-200 bg-white",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-px hover:border-graf-300 hover:shadow-card",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-card",
        className,
      )}
    >
      <div
        data-palco-imagem-produto
        className="relative aspect-[4/3] max-h-72 overflow-hidden bg-graf-50/45"
      >
        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, (max-width: 1536px) 30vw, 25vw"
            className={cn(
              "object-contain p-2.5 transition-transform duration-300 ease-out-quint sm:p-3",
              "group-hover:scale-[1.02]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-graf-500">
            <span className="flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-400">
              <ImageOff className="size-5" aria-hidden />
            </span>
            <span className="text-xs font-semibold">Foto em cadastro</span>
          </div>
        )}

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>

        {desconto >= 5 ? (
          <span className="absolute bottom-3 left-3 rounded-md bg-jb-500 px-2 py-1 text-xs font-extrabold text-white">
            −{desconto}%
          </span>
        ) : null}

        {semEstoque ? (
          <p className="absolute inset-x-0 bottom-0 z-10 bg-graf-950/90 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white">
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-graf-100 p-4">
        {produto.brandName ? (
          <p className="truncate text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-graf-500">
            {produto.brandName}
          </p>
        ) : null}

        <h3 className="mt-1 line-clamp-2 min-h-10 text-corpo font-bold leading-5 text-graf-950 sm:text-base">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-xs after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="mt-1 truncate text-xs text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          {precoAnterior ? (
            <p className="text-xs tabular text-graf-500 line-through">
              {formatarPreco(precoAnterior)}
            </p>
          ) : null}

          <p className="tabular text-xl font-extrabold leading-7 tracking-tight text-graf-950 sm:text-2xl">
            {soOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents)}
          </p>

          <p className="min-h-5 truncate text-xs text-graf-500">
            {soOrcamento
              ? "Preço e prazo com a equipe JB"
              : parcelas
                ? `${parcelas.parcelas}× de ${formatarPreco(parcelas.valorCents)} sem juros`
                : "Pagamento à vista"}
          </p>

          <div className="mt-3 flex min-h-6 items-center justify-between gap-3 border-t border-graf-100 pt-3">
            {estado ? (
              <span className={cn("flex min-w-0 items-center gap-1.5 text-xs font-semibold", estado.classe)}>
                <span className={cn("size-1.5 shrink-0 rounded-full", estado.pontoClasse)} aria-hidden />
                <span className="truncate">{estado.texto}</span>
              </span>
            ) : (
              <span aria-hidden />
            )}

            {chamadaDestacada ? null : (
              <span
                aria-hidden
                className="flex shrink-0 items-center gap-1 text-xs font-bold text-graf-800 transition-colors group-hover:text-jb-600"
              >
                {chamada}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>

          {chamadaDestacada ? (
            <span
              aria-hidden
              className={cn(
                "mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold",
                semEstoque
                  ? "bg-graf-200 text-graf-700"
                  : "bg-jb-500 text-white transition-colors group-hover:bg-jb-600",
              )}
            >
              {chamada}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const LARGURA_LISTA_CURTA: Record<number, string> = {
  1: "sm:max-w-sm",
  2: "sm:max-w-3xl",
};

export function GradeProdutos({
  produtos,
  colunas,
  parcelamento,
  chamadaDestacada,
  extra,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  chamadaDestacada?: boolean;
  extra?: React.ReactNode;
  className?: string;
}) {
  const teto = colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 };
  const celulas = produtos.length + (extra ? 1 : 0);

  return (
    <Grade
      como="ul"
      espaco="md"
      colunas={colunasAte(celulas, teto)}
      className={cn(extra ? undefined : LARGURA_LISTA_CURTA[celulas], className)}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardProduto
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            chamadaDestacada={chamadaDestacada}
            className="w-full"
          />
        </li>
      ))}

      {extra ? <li className="flex">{extra}</li> : null}
    </Grade>
  );
}
