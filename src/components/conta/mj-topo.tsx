import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

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
  const visaoGeral = titulo === "Visão geral" && !voltar;

  const cabecalho = (
    <div className="min-w-0">
      <p className="mb-1.5 text-[0.67rem] font-bold uppercase tracking-[0.14em] text-graf-500">
        {visaoGeral ? "Bem-vindo(a) de volta" : "Área da Clínica"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(2rem,1.7rem+1vw,2.75rem)] font-extrabold leading-[1.03] tracking-[-0.045em] text-graf-950">
          {titulo}
        </h1>
        {etiqueta}
      </div>
      {descricao ? (
        <p className="mt-2.5 max-w-3xl text-[0.92rem] leading-relaxed text-graf-600">{descricao}</p>
      ) : null}
    </div>
  );

  return (
    <header className={cn("mb-6", className)}>
      {voltar ? (
        <Link
          href={voltar.href}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-graf-600 transition-colors hover:bg-white hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
      ) : null}

      {visaoGeral ? (
        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_30rem]">
          <div className="flex items-center">{cabecalho}</div>
          <div
            className="relative hidden min-h-[7.4rem] overflow-hidden rounded-2xl border border-jb-100 bg-[#fff5f5] shadow-[0_14px_36px_-30px_rgba(18,24,35,0.45)] xl:block"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,246,246,0.98) 0%, rgba(255,246,246,0.92) 45%, rgba(255,246,246,0.16) 72%), url('/images/hero/ambiente-clinica.webp')",
              backgroundPosition: "center right",
              backgroundSize: "cover",
            }}
          >
            <div className="relative z-10 max-w-[17rem] p-5">
              <p className="text-[1.02rem] font-extrabold leading-tight tracking-[-0.02em] text-graf-950">
                Equipamentos em boas mãos para uma clínica que não para.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-[0.72rem] font-bold text-graf-600">
                <span className="h-0.5 w-5 rounded-full bg-jb-500" aria-hidden />
                JB · Parceira da sua clínica
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          {cabecalho}
          {acoes ? <div className="flex flex-wrap items-center gap-2.5 pt-0.5">{acoes}</div> : null}
        </div>
      )}

      {visaoGeral && acoes ? <div className="mt-4 flex flex-wrap items-center gap-2.5">{acoes}</div> : null}
    </header>
  );
}
