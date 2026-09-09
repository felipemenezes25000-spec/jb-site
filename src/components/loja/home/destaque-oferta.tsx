import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, PackageCheck } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

export function DestaqueOfertaHome({
  produto,
  parcelamento,
}: {
  produto: ProdutoCard;
  parcelamento?: Parcelamento;
}) {
  const compravel = produto.allowDirectPurchase && produto.priceCents > 0;
  const precoAnterior =
    compravel && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto = precoAnterior
    ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
    : 0;
  const parcelas = compravel
    ? calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents)
    : null;

  return (
    <article className="group relative mb-5 grid min-h-[25rem] overflow-hidden rounded-2xl border border-graf-950 bg-white shadow-[0_2.2rem_5rem_-3.6rem_rgba(20,20,22,0.45)] lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
      <div className="relative z-10 flex flex-col justify-center p-7 sm:p-9 lg:p-11">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-jb-500 px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.14em] text-white">
            <BadgePercent className="size-3.5" aria-hidden />
            Oferta em evidência
          </span>
          {desconto >= 5 ? (
            <span className="rounded-full border border-jb-500 bg-white px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.14em] text-jb-700">
              −{desconto}%
            </span>
          ) : null}
        </div>

        {produto.brandName ? (
          <p className="mt-7 text-[0.69rem] font-black uppercase tracking-[0.18em] text-jb-700">
            {produto.brandName}
          </p>
        ) : null}
        <h3 className="mt-2 max-w-[15ch] font-display text-[clamp(2rem,3.6vw,4rem)] font-black leading-[0.92] tracking-[-0.055em] text-graf-950">
          {produto.name}
        </h3>

        <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2">
          {precoAnterior ? (
            <span className="text-[0.82rem] font-black text-graf-950 line-through">
              {formatarPreco(precoAnterior)}
            </span>
          ) : null}
          <strong className="font-display text-[clamp(2rem,4vw,3.35rem)] font-black leading-none tracking-[-0.045em] text-jb-700">
            {compravel ? formatarPreco(produto.priceCents) : "Sob consulta"}
          </strong>
        </div>
        {parcelas ? (
          <p className="mt-2 text-[0.82rem] font-black text-graf-950">
            até {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-4 text-[0.72rem] font-black uppercase tracking-[0.1em] text-graf-950">
          {produto.trackInventory && produto.stock > 0 ? (
            <span className="flex items-center gap-2">
              <PackageCheck className="size-4 text-jb-600" aria-hidden />
              {produto.unique ? "Unidade única" : `${produto.stock} em estoque`}
            </span>
          ) : null}
          <span className="text-jb-700">Condição declarada · compra transparente</span>
        </div>

        <Link
          href={`/loja/${produto.slug}`}
          className="group/botao foco-jb mt-8 inline-flex min-h-13 w-fit items-center gap-6 rounded-lg bg-jb-500 py-2 pl-6 pr-2.5 text-[0.86rem] font-black text-white transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-600"
        >
          Ver esta oferta
          <span className="grid size-9 place-items-center rounded-full bg-white text-jb-600 transition-transform group-hover/botao:translate-x-1">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>
      </div>

      <Link
        href={`/loja/${produto.slug}`}
        aria-label={`Ver ${produto.name}`}
        className="relative min-h-[20rem] overflow-hidden border-t border-jb-100 bg-[#fffafa] lg:min-h-full lg:border-l lg:border-t-0"
      >
        <span className="absolute -right-28 -top-28 size-[28rem] rounded-full border-[2.8rem] border-jb-50" aria-hidden />
        <span className="absolute -right-16 -top-16 size-[20rem] rounded-full border border-jb-200" aria-hidden />
        <span className="absolute bottom-5 right-5 font-display text-[5rem] font-black leading-none text-jb-500/[0.08] sm:text-[8rem]" aria-hidden>
          %
        </span>
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            unoptimized={produto.imageUrl.startsWith("/")}
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-contain p-[8%] transition-transform duration-700 ease-out-quint group-hover:scale-[1.045] group-hover:-rotate-[0.4deg]"
          />
        ) : null}
      </Link>
    </article>
  );
}
