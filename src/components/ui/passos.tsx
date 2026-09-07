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
      {/* -------------------------------------------------------- desktop

          A régua só entra a partir de 1024px. Em 768 as cinco etapas com
          círculo, rótulo, descrição e conector pediam 742px numa faixa de 712
          e punham a página inteira para rolar de lado — o tablet fica com o
          bloco compacto abaixo, que diz a mesma coisa e cabe. */}
      <ol className="hidden items-center lg:flex">
        {passos.map((passo, i) => {
          const concluido = i < indice;
          const ehAtual = i === indice;
          const ultimo = i === passos.length - 1;

          const circulo = (
            <span
              className={cn(
                "tabular flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                /* ok-700 e não ok-500: o número e o "✓" são brancos, e branco
                   sobre ok-500 dá 2,54:1 — abaixo do 3:1 exigido pela WCAG
                   1.4.11 para o grafismo que comunica a etapa concluída.
                   Sobre ok-700 dá 5,48:1. */
                concluido
                  ? "bg-ok-700 text-white"
                  : ehAtual
                    ? "bg-jb-500 text-white ring-4 ring-jb-500/15"
                    : "border border-graf-450 bg-white text-graf-500",
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
                <span className="mt-0.5 block text-xs leading-snug text-graf-500">
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
              /* Nenhum item pode ser rígido: com `shrink-0` no último, um
                 rótulo comprido virava largura mínima da página inteira. */
              className={cn("flex items-center gap-3 min-w-0", !ultimo && "flex-1")}
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
                    concluido ? "bg-ok-700/40" : "bg-graf-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* ------------------------------------------- celular e tablet */}
      <div className="lg:hidden">
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

/* ============================================================================
   Passo numerado — como o processo funciona

   Outra coisa que o indicador de etapas acima: aquele mostra onde a pessoa
   está agora; este explica, na página pública, o que vai acontecer — abrir o
   chamado, a triagem, a visita, o orçamento, a manutenção.

   Numeração de verdade em <ol>: quem usa leitor de tela ouve "item 2 de 5" e
   a ordem sobrevive à leitura sem estilo.
   ============================================================================ */

export type PassoNumerado = {
  titulo: string;
  descricao?: React.ReactNode;
  icone?: React.ComponentType<{ className?: string }>;
};

export function PassosNumerados({
  passos,
  disposicao = "coluna",
  rotulo,
  className,
}: {
  passos: PassoNumerado[];
  /** `coluna` empilha com o fio ligando os números; `fileira` vira grade no desktop. */
  disposicao?: "coluna" | "fileira";
  /** Nome acessível da lista, quando o título da seção não fica ao lado. */
  rotulo?: string;
  className?: string;
}) {
  if (passos.length === 0) return null;

  if (disposicao === "fileira") {
    return (
      <ol
        aria-label={rotulo}
        className={cn(
          "grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-8",
          passos.length === 3 && "lg:grid-cols-3",
          passos.length === 5 && "lg:grid-cols-5",
          className,
        )}
      >
        {passos.map((passo, i) => {
          const Icone = passo.icone;
          return (
            <li key={`${passo.titulo}-${i}`} className="relative">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="tabular flex size-11 shrink-0 items-center justify-center rounded-full border border-jb-200 bg-jb-50 text-base font-extrabold text-jb-600 [.on-dark_&]:border-white/15 [.on-dark_&]:bg-white/10 [.on-dark_&]:text-white"
                >
                  {i + 1}
                </span>
                {Icone ? (
                  <Icone className="size-5 shrink-0 text-graf-500" aria-hidden />
                ) : null}
              </div>
              <h3 className="texto-forte mt-5 text-lg font-bold leading-snug">{passo.titulo}</h3>
              {passo.descricao ? (
                <p className="texto-suave mt-2 text-[0.9375rem] leading-relaxed">
                  {passo.descricao}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol aria-label={rotulo} className={cn("relative", className)}>
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        const Icone = passo.icone;
        return (
          <li key={`${passo.titulo}-${i}`} className="relative flex gap-5 pb-8 last:pb-0">
            {!ultimo ? (
              <span
                aria-hidden
                className="absolute left-[21px] top-12 h-[calc(100%-3.5rem)] w-px bg-graf-200 [.on-dark_&]:bg-white/15"
              />
            ) : null}
            <span
              aria-hidden
              className="tabular relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-jb-200 bg-jb-50 text-base font-extrabold text-jb-600 [.on-dark_&]:border-white/15 [.on-dark_&]:bg-white/10 [.on-dark_&]:text-white"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <h3 className="texto-forte flex items-center gap-2 text-lg font-bold leading-snug">
                {Icone ? <Icone className="size-5 shrink-0 text-graf-500" aria-hidden /> : null}
                {passo.titulo}
              </h3>
              {passo.descricao ? (
                <p className="texto-suave mt-2 text-[0.9375rem] leading-relaxed">
                  {passo.descricao}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
