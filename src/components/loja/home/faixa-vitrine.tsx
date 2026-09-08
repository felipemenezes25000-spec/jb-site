import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";
import { cn } from "@/lib/utils";

/* ============================================================================
   Faixa de produtos da home

   Cabeçalho curto — rótulo técnico, manchete e o link para a lista inteira —
   seguido da mesma grade da vitrine. É de propósito que o cartão aqui seja o
   MESMO da coleção: a home não tem um desenho de cartão próprio para manter
   afinado, e quem vem da home reconhece o que já viu quando chega em /loja.

   A faixa some sozinha quando não há produto. Uma seção com título e nada
   embaixo diz que o catálogo está quebrado, não que ele está pequeno.
   ============================================================================ */

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
  /** `clara` é o branco do catálogo; `névoa` separa duas faixas seguidas. */
  fundo?: "clara" | "nevoa";
  className?: string;
}) {
  if (produtos.length === 0) return null;

  return (
    <section
      className={cn(fundo === "nevoa" ? "bg-surface-muted" : "bg-surface", "py-12 lg:py-16", className)}
    >
      <div className="container-jb">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-hairline pb-4">
          <div className="min-w-0">
            <p className="micro text-jb-600">{sobretitulo}</p>
            <h2 className="manchete mt-3 text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] text-graf-950">
              {titulo}
            </h2>
          </div>

          <Link
            href={href}
            className="micro flex h-11 shrink-0 items-center gap-1.5 px-2 text-jb-600 transition-colors hover:text-jb-700"
          >
            {rotuloDoLink}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>

        <GradeVitrine
          produtos={produtos}
          parcelamento={parcelamento}
          colunas={colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 }}
          className="mt-6"
        />
      </div>
    </section>
  );
}

/** Faixa de uma frase só — o convite que separa duas listas. */
export function ChamadaDestacada({
  sobretitulo,
  titulo,
  texto,
  href,
  rotulo,
}: {
  sobretitulo: string;
  titulo: string;
  texto: string;
  href: string;
  rotulo: string;
}) {
  return (
    <section className="border-y border-jb-100 bg-jb-50/50">
      <div className="container-jb flex flex-wrap items-center justify-between gap-x-10 gap-y-6 py-10 lg:py-12">
        <div className="max-w-2xl">
          <p className="micro text-jb-700">{sobretitulo}</p>
          <h2 className="manchete mt-3 text-[clamp(1.375rem,1.1rem+1.1vw,1.875rem)] text-graf-950">
            {titulo}
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-600">{texto}</p>
        </div>

        <Link
          href={href}
          className="foco-jb flex h-12 shrink-0 items-center gap-2 rounded-lg bg-jb-500 px-6 text-[0.9375rem] font-bold text-white transition-colors hover:bg-jb-600"
        >
          {rotulo}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
