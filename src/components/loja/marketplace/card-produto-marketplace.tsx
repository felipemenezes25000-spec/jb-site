import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import type {
  ParcelamentoMarketplace,
  ProdutoMarketplaceCard,
} from "@/components/loja/marketplace/tipos";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

import styles from "./marketplace.module.css";

const CONDICAO: Record<ProdutoMarketplaceCard["condition"], string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

function disponibilidade(produto: ProdutoMarketplaceCard) {
  if (produto.trackInventory && produto.stock <= 0) {
    return produto.unique ? "Unidade vendida" : "Indisponível";
  }
  if (produto.unique) return "Unidade única";
  return produto.trackInventory ? "Em estoque" : "Disponível";
}

export function CardProdutoMarketplace({
  produto,
  parcelamento,
  prioridade,
}: {
  produto: ProdutoMarketplaceCard;
  parcelamento: ParcelamentoMarketplace;
  prioridade?: boolean;
}) {
  const indisponivel = produto.trackInventory && produto.stock <= 0;
  const sobOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = sobOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento.max, parcelamento.minimoCents);
  const anterior =
    !sobOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto = anterior
    ? Math.round(((anterior - produto.priceCents) / anterior) * 100)
    : 0;

  return (
    <article
      data-marketplace-card
      className={`${styles.card} group relative flex w-full flex-col overflow-hidden`}
    >
      <div
        data-palco-imagem-produto
        className="relative aspect-[4/3] bg-[linear-gradient(145deg,#fff_0%,#fff8f8_100%)]"
      >
        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            sizes="(max-width: 374px) 94vw, (max-width: 1023px) 46vw, (max-width: 1439px) 31vw, 24vw"
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-graf-50 text-xs font-semibold text-graf-500">
            <ImageOff className="size-5" aria-hidden />
            <span>Foto em cadastro</span>
          </div>
        )}

        <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          <span className="rounded-md border border-graf-200 bg-white/95 px-2 py-1 text-[0.625rem] font-extrabold uppercase tracking-[0.06em] text-graf-700 shadow-sm sm:text-xs sm:normal-case sm:tracking-normal">
            {CONDICAO[produto.condition]}
          </span>
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>

        {desconto >= 5 ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-jb-500 px-2 py-1 text-[0.6875rem] font-extrabold text-white sm:bottom-3 sm:left-3 sm:text-xs">
            −{desconto}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[0.625rem] font-extrabold uppercase tracking-[0.09em] text-graf-500 sm:text-[0.6875rem]">
          {produto.brandName || produto.categoryName || "Equipamento odontológico"}
        </p>
        <h2 className="mt-1.5 line-clamp-2 min-h-10 text-[0.8125rem] font-bold leading-5 text-graf-950 sm:text-[0.9375rem]">
          <Link
            href={`/loja/${produto.slug}`}
            className="foco-jb rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h2>

        {produto.destaques.length ? (
          <dl className="mt-3 grid gap-1.5 border-t border-graf-100 pt-3">
            {produto.destaques.map((item) => (
              <div
                key={`${item.rotulo}-${item.valor}`}
                className="flex min-w-0 justify-between gap-2 text-[0.6875rem] sm:text-xs"
              >
                <dt className="truncate text-graf-500">{item.rotulo}</dt>
                <dd className="truncate font-semibold text-graf-800">{item.valor}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 border-t border-graf-100 pt-3 text-[0.6875rem] text-graf-500 sm:text-xs">
            Ficha técnica no produto
          </p>
        )}

        <div className="mt-auto pt-4">
          {anterior ? (
            <p className="truncate text-[0.6875rem] text-graf-500 line-through sm:text-xs">
              {formatarPreco(anterior)}
            </p>
          ) : null}
          <p className="tabular truncate text-lg font-extrabold leading-7 text-graf-950 sm:text-2xl">
            {sobOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents)}
          </p>
          <p className="min-h-5 truncate text-[0.625rem] text-graf-500 sm:text-xs">
            {parcelas
              ? `${parcelas.parcelas}× de ${formatarPreco(parcelas.valorCents)} sem juros`
              : sobOrcamento
                ? "Preço e prazo com a equipe JB"
                : "Pagamento à vista"}
          </p>

          <div className="mt-2.5 flex min-h-5 items-center gap-1.5 text-[0.6875rem] font-semibold text-graf-700 sm:text-xs">
            <span
              className={`size-1.5 shrink-0 rounded-full ${indisponivel ? "bg-graf-400" : "bg-ok-500"}`}
              aria-hidden
            />
            <span className="truncate">{disponibilidade(produto)}</span>
          </div>

          <span
            aria-hidden
            className={`mt-3 flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-xs font-extrabold transition-colors sm:px-3 sm:text-sm ${
              indisponivel
                ? "bg-graf-200 text-graf-700"
                : "bg-jb-500 text-white group-hover:bg-jb-600"
            }`}
          >
            {sobOrcamento ? "Pedir orçamento" : "Ver equipamento"}
          </span>
        </div>
      </div>
    </article>
  );
}
