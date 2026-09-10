import Link from "next/link";
import { ArrowRight, GitCompareArrows } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";
import { cn } from "@/lib/utils";

export function FaixaVitrine({
  sobretitulo,
  titulo,
  href,
  rotuloDoLink,
  produtos,
  parcelamento,
  colunas,
  fundo = "clara",
  className,
}: {
  sobretitulo: string;
  titulo: string;
  href: string;
  rotuloDoLink: string;
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
  colunas?: Parameters<typeof GradeVitrine>[0]["colunas"];
  fundo?: "clara" | "nevoa";
  className?: string;
  variante?: "padrao" | "ofertas" | "seminovos" | "procurados";
}) {
  if (produtos.length === 0) return null;

  return (
    <section
      className={cn(
        "border-b border-graf-200 py-12 lg:py-16",
        fundo === "nevoa" ? "bg-graf-50/60" : "bg-white",
        className,
      )}
    >
      <div className="container-jb max-w-[100rem]">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graf-200 pb-5">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              {sobretitulo}
            </p>
            <h2 className="mt-2 text-[clamp(1.7rem,1.35rem+1.4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-graf-950">
              {titulo}
            </h2>
          </div>

          <Link
            href={href}
            className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
          >
            {rotuloDoLink}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <GradeVitrine
          produtos={produtos}
          parcelamento={parcelamento}
          colunas={colunas ?? { base: 1, sm: 2, lg: 4 }}
          className="mt-6"
        />
      </div>
    </section>
  );
}

export function ChamadaDestacada({
  sobretitulo,
  titulo,
  texto,
  href,
  rotulo,
  produtos = [],
}: {
  sobretitulo: string;
  titulo: string;
  texto: string;
  href: string;
  rotulo: string;
  produtos?: ProdutoCard[];
}) {
  return (
    <section className="border-b border-graf-200 bg-graf-50/60 py-10 lg:py-12">
      <div className="container-jb max-w-[100rem]">
        <div className="grid gap-5 rounded-xl border border-graf-200 bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
              <GitCompareArrows className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
                {sobretitulo}
              </p>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-[-0.025em] text-graf-950">
                {titulo}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-graf-600">{texto}</p>
              {produtos.length > 0 ? (
                <p className="mt-2 text-[0.8125rem] text-graf-500">
                  {Math.min(produtos.length, 3)} opções disponíveis para começar a comparação.
                </p>
              ) : null}
            </div>
          </div>

          <Link
            href={href}
            className="foco-jb inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-jb-600 px-4 text-sm font-bold text-white transition-colors hover:bg-jb-700"
          >
            {rotulo}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
