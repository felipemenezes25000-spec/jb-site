import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import type { ProdutoCard, Parcelamento } from "@/components/loja/card-produto";
import { Grade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cartão de vitrine

   O mesmo dado do `CardProduto`, com a apresentação da vitrine: filete de 1px
   no lugar da sombra, canto de 4px, foto em fundo branco chapado, nome em
   peso médio e preço em condensada tabular.

   O que este cartão NÃO mostra, de propósito: nota e número de avaliações. A
   referência que inspirou o desenho exibe "4.9 · 38 avaliações" em todo
   produto, e aquilo é dado inventado do protótipo. Aqui a avaliação só entra
   quando existir avaliação de verdade no banco — foi exatamente por anunciar
   o que não se tem que o catálogo já precisou ser consertado uma vez.
   ============================================================================ */

const CONDICAO_ETIQUETA = {
  novo: { rotulo: "Novo", classe: "bg-graf-950 text-white" },
  seminovo: { rotulo: "Seminovo JB", classe: "bg-white text-jb-600 ring-1 ring-jb-500" },
  usado: { rotulo: "Usado", classe: "bg-graf-950 text-white" },
  recondicionado: { rotulo: "Recondicionado JB", classe: "bg-graf-950 text-white" },
} as const;

function disponibilidade(produto: ProdutoCard) {
  if (!produto.trackInventory) return null;
  if (produto.stock <= 0) {
    return {
      texto: produto.unique ? "Unidade vendida" : "Indisponível",
      classe: "text-graf-500",
      ponto: "bg-graf-400",
    };
  }
  if (produto.unique) return { texto: "Unidade única", classe: "text-jb-700", ponto: "bg-jb-500" };
  if (produto.stock <= 3) {
    return {
      texto: `Últimas ${produto.stock} un`,
      classe: "text-warn-700",
      ponto: "bg-warn-500",
    };
  }
  return { texto: `${produto.stock} em estoque`, classe: "text-ok-700", ponto: "bg-ok-500" };
}

export function CardVitrine({
  produto,
  prioridade,
  parcelamento,
  className,
}: {
  produto: ProdutoCard;
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);
  const condicao = CONDICAO_ETIQUETA[produto.condition];
  const estado = disponibilidade(produto);

  const precoAnterior =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;

  const desconto =
    !semEstoque && precoAnterior
      ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
      : 0;

  const chamada = soOrcamento ? "Pedir orçamento" : "Ver equipamento";

  return (
    <article
      className={cn(
        "placa group relative isolate flex flex-col overflow-hidden",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-0.5 hover:border-graf-400 hover:shadow-raised",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-raised",
        className,
      )}
    >
      <div className="relative aspect-4/3 max-h-72 overflow-hidden bg-white">
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            unoptimized={produto.imageUrl.startsWith("/")}
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, 24vw"
            className={cn(
              "object-contain p-3 transition-transform duration-500 ease-out-quint",
              "group-hover:scale-[1.03]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-graf-500">
            <ImageOff className="size-6" aria-hidden />
            <span className="micro text-graf-500">Foto em cadastro</span>
          </div>
        )}

        {/* Etiquetas em coluna, sempre no mesmo canto: condição primeiro,
            desconto embaixo. Quem varre a grade lê as duas na vertical. */}
        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          <span className={cn("micro rounded-xs px-2 py-1.5", condicao.classe)}>
            {condicao.rotulo}
          </span>
          {desconto >= 5 ? (
            <span className="micro rounded-xs bg-jb-500 px-2 py-1.5 text-white">−{desconto}%</span>
          ) : null}
        </div>

        {semEstoque ? (
          <p
            aria-hidden
            className="micro absolute inset-x-0 bottom-0 z-10 bg-graf-950/90 py-2.5 text-center text-white"
          >
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-hairline p-4">
        {produto.brandName ? (
          <p className="micro truncate text-graf-500">{produto.brandName}</p>
        ) : null}

        <h3 className="mt-2 line-2 min-h-10 text-[0.9375rem] font-semibold leading-snug text-graf-950">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-xs after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="micro mt-1.5 truncate text-graf-400">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex h-4 items-center gap-2">
            {precoAnterior ? (
              <span className="micro text-graf-400 line-through">
                {formatarPreco(precoAnterior)}
              </span>
            ) : null}
          </div>

          {soOrcamento ? (
            <p className="numero text-xl text-graf-950">Sob orçamento</p>
          ) : (
            <p className="numero text-[1.5rem] leading-8 text-graf-950">
              {formatarPreco(produto.priceCents)}
            </p>
          )}

          <div className="flex h-4 items-center">
            {parcelas ? (
              <span className="micro text-graf-500">
                {parcelas.parcelas}x {formatarPreco(parcelas.valorCents)}
              </span>
            ) : soOrcamento ? (
              <span className="micro truncate text-graf-500">A equipe responde com prazo</span>
            ) : null}
          </div>

          <div className="mt-3 flex h-4 items-center">
            {estado ? (
              <span className={cn("micro flex items-center gap-1.5", estado.classe)}>
                <span aria-hidden className={cn("size-1.5 rounded-full", estado.ponto)} />
                {estado.texto}
              </span>
            ) : null}
          </div>

          <div className="mt-3.5 flex items-center gap-1.5">
            {/* Decorativo: o cartão inteiro já é o link do equipamento. O que
                muda aqui é o peso — o convite passa a ter a forma de botão. */}
            <span
              aria-hidden
              className={cn(
                "micro flex h-11 flex-1 items-center justify-center gap-2 rounded-xs px-3",
                "bg-graf-950 text-white transition-colors group-hover:bg-jb-500",
                semEstoque && "bg-graf-400 group-hover:bg-graf-400",
              )}
            >
              {chamada}
              <ArrowRight className="size-3.5 transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5" />
            </span>

            <BotaoComparar
              slug={produto.slug}
              nome={produto.name}
              className="size-11 rounded-xs border-hairline bg-white"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/** A grade da vitrine. Fecha a fileira pela quantidade, como a do catálogo. */
export function GradeVitrine({
  produtos,
  colunas,
  parcelamento,
  extra,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  extra?: React.ReactNode;
  className?: string;
}) {
  const teto = colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 };
  const celulas = produtos.length + (extra ? 1 : 0);

  return (
    <Grade como="ul" espaco="sm" colunas={colunasAte(celulas, teto)} className={className}>
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardVitrine
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            className="w-full"
          />
        </li>
      ))}
      {extra ? <li className="flex">{extra}</li> : null}
    </Grade>
  );
}
