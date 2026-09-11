import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
        <div className="flex flex-col gap-4 border-b border-graf-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              {sobretitulo}
            </p>
            <h2 className="mt-2 text-section font-extrabold tracking-[-0.035em] text-graf-950">
              {titulo}
            </h2>
          </div>

          <Link
            href={href}
            className="foco-jb inline-flex min-h-11 w-fit shrink-0 items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
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
