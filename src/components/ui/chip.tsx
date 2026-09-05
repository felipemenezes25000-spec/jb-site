"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Chip de filtro ativo

   Mostra, por escrito, o que está limitando a lista — e some quando a pessoa
   pede. O chip inteiro é o alvo: clicar em qualquer parte remove o filtro.

   Duas formas de remover:
     • `href` — link de verdade para a mesma lista sem aquele filtro. Funciona
       sem JavaScript e é o que a loja deve usar.
     • `aoRemover` — para filtro que vive em estado no cliente.

   Sem nenhum dos dois vira só uma etiqueta de leitura.
   ============================================================================ */

export type TomChip = "neutro" | "marca";

const TONS: Record<TomChip, string> = {
  neutro: "border-graf-300 bg-white text-graf-800 hover:border-graf-400 hover:bg-graf-50",
  marca: "border-jb-200 bg-jb-50 text-jb-800 hover:border-jb-300 hover:bg-jb-100",
};

const BASE =
  "group relative inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 " +
  "text-sm font-medium transition-colors duration-150 " +
  // o retângulo de toque passa de 44px de altura sem engordar o chip
  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500";

function Miolo({
  campo,
  rotulo,
  removivel,
}: {
  campo?: string;
  rotulo: string;
  removivel: boolean;
}) {
  return (
    <>
      {campo ? <span className="shrink-0 text-graf-500">{campo}:</span> : null}
      <span className="truncate">{rotulo}</span>
      {removivel ? (
        <X
          className="size-3.5 shrink-0 text-graf-500 transition-colors group-hover:text-jb-600"
          aria-hidden
        />
      ) : null}
    </>
  );
}

export function Chip({
  rotulo,
  campo,
  href,
  aoRemover,
  tom = "neutro",
  className,
}: {
  /** O valor escolhido — "Cadeira odontológica", "Até R$ 10.000". */
  rotulo: string;
  /** O nome do filtro, quando o valor sozinho não explica — "Categoria". */
  campo?: string;
  /** Endereço da lista sem este filtro. */
  href?: string;
  /** Alternativa ao href, para filtro em estado local. */
  aoRemover?: () => void;
  tom?: TomChip;
  className?: string;
}) {
  const descricao = campo ? `${campo}: ${rotulo}` : rotulo;

  if (href) {
    return (
      <Link
        href={href}
        scroll={false}
        aria-label={`Remover filtro ${descricao}`}
        className={cn(BASE, TONS[tom], className)}
      >
        <Miolo campo={campo} rotulo={rotulo} removivel />
      </Link>
    );
  }

  if (aoRemover) {
    return (
      <button
        type="button"
        onClick={aoRemover}
        aria-label={`Remover filtro ${descricao}`}
        className={cn(BASE, TONS[tom], className)}
      >
        <Miolo campo={campo} rotulo={rotulo} removivel />
      </button>
    );
  }

  return (
    <span className={cn(BASE, TONS[tom], "cursor-default hover:bg-white", className)}>
      <Miolo campo={campo} rotulo={rotulo} removivel={false} />
    </span>
  );
}

/**
 * A barra de filtros ativos.
 *
 * Só aparece quando existe filtro — barra vazia com "nenhum filtro" é ruído.
 * `hrefLimpar` fecha a fileira com o atalho de tirar tudo de uma vez.
 */
export function FiltrosAtivos({
  rotulo = "Filtros aplicados",
  hrefLimpar,
  aoLimpar,
  children,
  className,
}: {
  rotulo?: string;
  hrefLimpar?: string;
  aoLimpar?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const limpar =
    hrefLimpar || aoLimpar ? (
      <span className="ml-1">
        {hrefLimpar ? (
          <Link
            href={hrefLimpar}
            scroll={false}
            className={cn(
              "inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-jb-700",
              "transition-colors hover:bg-jb-50 hover:text-jb-500",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            Limpar tudo
          </Link>
        ) : (
          <button
            type="button"
            onClick={aoLimpar}
            className={cn(
              "inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-jb-700",
              "transition-colors hover:bg-jb-50 hover:text-jb-500",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            Limpar tudo
          </button>
        )}
      </span>
    ) : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="sr-only">{rotulo}</span>
      {children}
      {limpar}
    </div>
  );
}
