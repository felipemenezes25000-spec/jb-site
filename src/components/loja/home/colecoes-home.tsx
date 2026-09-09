import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronRight, Sparkles } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

function preco(produto: ProdutoCard) {
  return produto.allowDirectPurchase && produto.priceCents > 0
    ? formatarPreco(produto.priceCents)
    : "Sob consulta";
}

export function SeminovosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  if (produtos.length === 0) return null;

  return (
    <section className="relative isolate overflow-hidden border-y border-jb-100 bg-[#fff9f9] py-16 lg:py-20">
      <div
        className="pointer-events-none absolute -left-48 top-4 size-[30rem] rounded-full bg-jb-50/80 blur-3xl"
        aria-hidden
      />
      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-7 border-b border-jb-100 pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-9 bg-jb-600" aria-hidden />
              <p className="text-[0.67rem] font-black uppercase tracking-[0.2em] text-jb-700">
                Revisados na bancada da JB
              </p>
            </div>
            <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2.05rem,3.7vw,4rem)] font-black leading-[0.94] tracking-[-0.052em] text-graf-950">
              Seminovos com história mais transparente.
            </h2>
          </div>
          <div className="lg:pb-1">
            <p className="text-[0.92rem] font-semibold leading-[1.6] text-graf-950/68">
              Equipamentos selecionados para quem quer reduzir investimento sem abrir mão de uma
              leitura técnica clara antes de decidir.
            </p>
            <Link
              href="/seminovos"
              className="group mt-4 inline-flex items-center gap-2 text-[0.76rem] font-black uppercase tracking-[0.08em] text-jb-700"
            >
              Ver todos os seminovos
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>

        <ol className="mt-4">
          {produtos.slice(0, 4).map((produto, indice) => {
            const parcelas =
              produto.allowDirectPurchase && produto.priceCents > 0
                ? calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents)
                : null;

            return (
              <li key={produto.slug} className="group border-b border-jb-100 last:border-b-0">
                <Link
                  href={`/loja/${produto.slug}`}
                  className="grid min-h-[10rem] items-center gap-5 py-5 transition-transform duration-300 hover:translate-x-1 sm:grid-cols-[4.5rem_10rem_minmax(0,1fr)_auto] lg:grid-cols-[5.5rem_12rem_minmax(0,1fr)_auto] lg:gap-7 lg:py-6"
                >
                  <span className="hidden font-display text-[3.2rem] font-black leading-none tracking-[-0.07em] text-jb-500/16 sm:block">
                    0{indice + 1}
                  </span>

                  <span className="relative aspect-[4/3] overflow-hidden rounded-[1.45rem] bg-white shadow-[0_18px_42px_-34px_rgba(105,10,16,0.55)] ring-1 ring-jb-100">
                    {produto.imageUrl ? (
                      <Image
                        src={produto.imageUrl}
                        alt={produto.imageAlt || produto.name}
                        fill
                        unoptimized={produto.imageUrl.startsWith("/")}
                        sizes="(max-width: 640px) 42vw, 12rem"
                        className="object-contain p-2.5 transition-transform duration-500 group-hover:scale-[1.045]"
                      />
                    ) : null}
                  </span>

                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.15em] text-jb-700">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        Seminovo JB
                      </span>
                      {produto.brandName ? (
                        <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-graf-950/58">
                          {produto.brandName}
                        </span>
                      ) : null}
                    </span>
                    <strong className="mt-2 block max-w-3xl font-display text-[clamp(1.3rem,2vw,2rem)] font-black leading-[1.05] tracking-[-0.04em] text-graf-950">
                      {produto.name}
                    </strong>
                    {produto.model ? (
                      <small className="mt-2 block text-[0.72rem] font-semibold text-graf-950/58">
                        {produto.model}
                      </small>
                    ) : null}
                    <span className="mt-3 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.1em] text-graf-950/62">
                      <Sparkles className="size-3.5 text-jb-600" aria-hidden />
                      Revisão técnica e condição declarada
                    </span>
                  </span>

                  <span className="flex items-center justify-between gap-4 sm:block sm:min-w-[11rem] sm:text-right">
                    <span>
                      <strong className="block font-display text-[1.5rem] font-black tracking-[-0.04em] text-jb-700 lg:text-[1.8rem]">
                        {preco(produto)}
                      </strong>
                      {parcelas ? (
                        <small className="mt-1 block text-[0.66rem] font-bold text-graf-950/58">
                          {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                        </small>
                      ) : null}
                    </span>
                    <span className="ml-auto mt-3 grid size-9 place-items-center rounded-full bg-white text-jb-700 shadow-[0_12px_28px_-22px_rgba(105,10,16,0.6)] ring-1 ring-jb-100 transition-[transform,background-color,color] group-hover:translate-x-1 group-hover:bg-jb-500 group-hover:text-white">
                      <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function ProcuradosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  if (produtos.length === 0) return null;

  return (
    <section className="relative isolate overflow-hidden bg-white py-16 lg:py-20">
      <div className="container-jb max-w-[112rem]">
        <div className="grid gap-7 border-t border-jb-100 pt-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.67rem] font-black uppercase tracking-[0.2em] text-jb-700">
              O que sai mais do estoque
            </p>
            <h2 className="mt-4 max-w-[19ch] font-display text-[clamp(2rem,3.4vw,3.7rem)] font-black leading-[0.95] tracking-[-0.05em] text-graf-950">
              Equipamentos que as clínicas procuram sempre.
            </h2>
          </div>
          <Link
            href="/loja"
            className="group inline-flex items-center gap-2 text-[0.76rem] font-black uppercase tracking-[0.08em] text-jb-700 lg:mb-1"
          >
            Catálogo completo
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible">
          {produtos.slice(0, 5).map((produto, indice) => {
            const parcelas =
              produto.allowDirectPurchase && produto.priceCents > 0
                ? calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents)
                : null;

            return (
              <Link
                key={produto.slug}
                href={`/loja/${produto.slug}`}
                className="group min-w-[72vw] snap-start border-t border-jb-100 pt-4 sm:min-w-[19rem] lg:min-w-0"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] bg-[#fff9f9]">
                  <span className="absolute left-4 top-4 z-10 text-[0.58rem] font-black uppercase tracking-[0.15em] text-jb-700">
                    0{indice + 1}
                  </span>
                  {produto.imageUrl ? (
                    <Image
                      src={produto.imageUrl}
                      alt={produto.imageAlt || produto.name}
                      fill
                      unoptimized={produto.imageUrl.startsWith("/")}
                      sizes="(max-width: 1024px) 72vw, 20vw"
                      className="object-contain p-[9%] drop-shadow-[0_22px_22px_rgba(57,17,20,0.12)] transition-transform duration-600 ease-out-quint group-hover:-translate-y-1.5 group-hover:scale-[1.045]"
                    />
                  ) : null}
                  <span className="absolute bottom-4 right-4 grid size-9 place-items-center rounded-full bg-white text-jb-700 shadow-[0_12px_28px_-22px_rgba(105,10,16,0.6)] transition-transform group-hover:translate-x-1">
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                </div>
                {produto.brandName ? (
                  <p className="mt-4 text-[0.61rem] font-black uppercase tracking-[0.15em] text-jb-700">
                    {produto.brandName}
                  </p>
                ) : null}
                <h3 className="mt-2 line-clamp-2 min-h-10 text-[0.88rem] font-black leading-[1.28] text-graf-950">
                  {produto.name}
                </h3>
                <p className="mt-3 font-display text-[1.35rem] font-black tracking-[-0.04em] text-graf-950">
                  {preco(produto)}
                </p>
                {parcelas ? (
                  <p className="mt-1 text-[0.65rem] font-bold text-graf-950/58">
                    {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
