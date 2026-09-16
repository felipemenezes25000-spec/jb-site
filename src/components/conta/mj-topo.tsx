import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/** Cabeçalho compartilhado das páginas da Área da Clínica. */
export function Topo({
  titulo,
  descricao,
  voltar,
  acoes,
  etiqueta,
  className,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  acoes?: React.ReactNode;
  etiqueta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7", className)}>
      {voltar ? (
        <Link
          href={voltar.href}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-graf-600 transition-colors hover:bg-white hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-graf-500">
            Área da Clínica
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[clamp(1.8rem,1.55rem+0.9vw,2.45rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-graf-950">
              {titulo}
            </h1>
            {etiqueta}
          </div>
          {descricao ? (
            <p className="mt-2.5 max-w-3xl text-[0.9375rem] leading-relaxed text-graf-600">
              {descricao}
            </p>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2.5 pt-0.5">{acoes}</div> : null}
      </div>
    </header>
  );
}
