import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botões da JB. Primário vermelho, secundário com borda grafite, terciário
 * como texto — evitando o excesso de botões preenchidos que a marca pede.
 */

export type Variante = "primario" | "secundario" | "sutil" | "texto" | "perigo";
export type Tamanho = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-jb-500 text-white shadow-xs hover:bg-jb-700 active:bg-jb-800 disabled:bg-jb-300",
  secundario:
    "bg-white text-graf-800 border border-graf-300 hover:border-graf-400 hover:bg-graf-50 active:bg-graf-100",
  sutil:
    "bg-graf-100 text-graf-800 hover:bg-graf-200 active:bg-graf-300",
  texto:
    "text-graf-700 hover:text-jb-700 hover:bg-graf-50 active:bg-graf-100",
  perigo:
    "bg-white text-jb-700 border border-jb-200 hover:bg-jb-50 hover:border-jb-300",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-md",
  md: "h-11 px-5 text-[0.9375rem] gap-2 rounded-lg",
  lg: "h-13 px-7 text-base gap-2.5 rounded-lg",
};

export function classesBotao(
  variante: Variante = "primario",
  tamanho: Tamanho = "md",
  extra?: string,
) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  );
}

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  larguraTotal?: boolean;
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  carregando,
  larguraTotal,
  className,
  children,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={classesBotao(variante, tamanho, cn(larguraTotal && "w-full", className))}
    >
      {carregando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

type LinkBotaoProps = React.ComponentProps<typeof Link> & {
  variante?: Variante;
  tamanho?: Tamanho;
  larguraTotal?: boolean;
};

export function LinkBotao({
  variante = "primario",
  tamanho = "md",
  larguraTotal,
  className,
  children,
  ...props
}: LinkBotaoProps) {
  return (
    <Link
      {...props}
      className={classesBotao(variante, tamanho, cn(larguraTotal && "w-full", className))}
    >
      {children}
    </Link>
  );
}

/** Botão só de ícone. Exige rótulo acessível. */
export function BotaoIcone({
  rotulo,
  variante = "texto",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string; variante?: Variante }) {
  return (
    <button
      {...props}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variante],
        className,
      )}
    >
      {children}
    </button>
  );
}
