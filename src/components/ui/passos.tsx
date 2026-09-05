import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Indicador de etapas — checkout, abertura de chamado, orçamento
   No desktop mostra a régua inteira; no mobile vira "Etapa 2 de 5" com o nome
   da etapa e uma barra de progresso, porque cinco bolinhas em 360px viram
   ruído ilegível.

   Estado nunca é só cor: a etapa concluída ganha um ✓, a atual vem escrita
   por extenso e o passo corrente carrega aria-current="step".
   ============================================================================ */

export type Passo = {
  rotulo: string;
  descricao?: string;
  /** Só é usado em etapa já concluída — voltar para frente não faz sentido. */
  href?: string;
};

export function Passos({
  passos,
  atual,
  rotulo = "Progresso",
  className,
}: {
  passos: Passo[];
  /** Índice da etapa corrente, começando em 0. */
  atual: number;
  rotulo?: string;
  className?: string;
}) {
  if (passos.length === 0) return null;

  const indice = Math.min(Math.max(0, Math.trunc(atual) || 0), passos.length - 1);
  const corrente = passos[indice];
  const porcento = Math.round(((indice + 1) / passos.length) * 100);

  return (
    <nav aria-label={rotulo} className={className}>
      {/* -------------------------------------------------------- desktop */}
      <ol className="hidden items-center md:flex">
        {passos.map((passo, i) => {
          const concluido = i < indice;
          const ehAtual = i === indice;
          const ultimo = i === passos.length - 1;

          const circulo = (
            <span
              className={cn(
                "tabular flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                concluido
                  ? "bg-ok-500 text-white"
                  : ehAtual
                    ? "bg-jb-500 text-white ring-4 ring-jb-500/15"
                    : "border border-graf-300 bg-white text-graf-500",
              )}
              aria-hidden
            >
              {concluido ? <Check className="size-4" /> : i + 1}
            </span>
          );

          const texto = (
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-semibold leading-tight",
                  concluido ? "text-graf-700" : ehAtual ? "text-graf-950" : "text-graf-500",
                )}
              >
                {passo.rotulo}
              </span>
              {passo.descricao ? (
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-snug",
                    ehAtual ? "text-graf-500" : "text-graf-500",
                  )}
                >
                  {passo.descricao}
                </span>
              ) : null}
              <span className="sr-only">
                {concluido ? " (concluída)" : ehAtual ? " (etapa atual)" : " (ainda não iniciada)"}
              </span>
            </span>
          );

          return (
            <li
              key={`${passo.rotulo}-${i}`}
              aria-current={ehAtual ? "step" : undefined}
              className={cn("flex items-center gap-3", ultimo ? "shrink-0" : "min-w-0 flex-1")}
            >
              {concluido && passo.href ? (
                <Link
                  href={passo.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg pr-1 transition-opacity hover:opacity-80",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  )}
                >
                  {circulo}
                  {texto}
                </Link>
              ) : (
                <span className="flex min-h-11 items-center gap-3">
                  {circulo}
                  {texto}
                </span>
              )}

              {!ultimo ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-0.5 min-w-6 flex-1 rounded-full",
                    concluido ? "bg-ok-500/40" : "bg-graf-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* --------------------------------------------------------- mobile */}
      <div className="md:hidden">
        <p className="label-mono uppercase text-graf-500">
          Etapa {indice + 1} de {passos.length}
        </p>
        <p className="mt-1 text-base font-bold leading-tight text-graf-950">{corrente.rotulo}</p>
        {corrente.descricao ? (
          <p className="mt-1 text-sm leading-relaxed text-graf-500">{corrente.descricao}</p>
        ) : null}
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={passos.length}
          aria-valuenow={indice + 1}
          aria-valuetext={`Etapa ${indice + 1} de ${passos.length}: ${corrente.rotulo}`}
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-graf-200"
        >
          <div
            className="h-full rounded-full bg-jb-500 transition-[width] duration-300"
            style={{ width: `${porcento}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
