"use client";

import { cloneElement, isValidElement, useId, useState } from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Dica — a explicação curta de um rótulo

   Aparece no passar do mouse e também no foco por teclado; some no Esc. O
   texto fica ligado ao gatilho por aria-describedby de forma permanente, então
   quem usa leitor de tela ouve a explicação junto com o campo, sem depender
   de "passar o mouse".

   Serve para uma frase. Explicação de duas linhas ou mais é texto de apoio do
   campo (`ajuda`), não dica — ninguém lê um parágrafo que some.
   ============================================================================ */

export type LadoDica = "cima" | "baixo";

const POSICAO: Record<LadoDica, string> = {
  cima: "bottom-full mb-2",
  baixo: "top-full mt-2",
};

type Gatilho = React.ReactElement<{ "aria-describedby"?: string }>;

export function Dica({
  texto,
  lado = "cima",
  children,
  className,
}: {
  texto: string;
  lado?: LadoDica;
  /** O que dispara a dica. Sem isto, vira um botão de interrogação. */
  children?: Gatilho;
  className?: string;
}) {
  const id = useId();
  const [aberta, setAberta] = useState(false);

  const gatilho = isValidElement<{ "aria-describedby"?: string }>(children) ? (
    cloneElement(children as Gatilho, { "aria-describedby": id })
  ) : (
    <button
      type="button"
      aria-describedby={id}
      aria-label={`Ajuda: ${texto}`}
      onClick={() => setAberta((valor) => !valor)}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-graf-500 transition-colors",
        "hover:bg-graf-100 hover:text-graf-800",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        // alvo de toque de 44px sem inchar o desenho da linha
        "relative after:absolute after:-inset-2.5 after:content-['']",
      )}
    >
      <HelpCircle className="size-[18px]" aria-hidden />
    </button>
  );

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
      onFocusCapture={() => setAberta(true)}
      onBlurCapture={() => setAberta(false)}
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && aberta) {
          evento.stopPropagation();
          setAberta(false);
        }
      }}
    >
      {gatilho}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[min(18rem,calc(100vw-2rem))]",
          "-translate-x-1/2 rounded-lg bg-graf-950 px-3 py-2 text-xs font-medium leading-snug text-white shadow-pop",
          "transition-opacity duration-150",
          POSICAO[lado],
          aberta ? "opacity-100" : "opacity-0",
        )}
      >
        {texto}
      </span>
    </span>
  );
}
