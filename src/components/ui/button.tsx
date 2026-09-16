import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botões da JB. Primário vermelho, secundário com borda grafite, terciário
 * como texto — evitando o excesso de botões preenchidos que a marca pede.
 *
 * `claro` e `contorno-claro` existem para faixa grafite: mesmo desenho, cores
 * invertidas, foco branco. Não use nenhum dos dois sobre fundo claro.
 *
 * Altura mínima: sm 40px, md 44px, lg 52px.
 *
 * Por que `min-h` e não `h`, e por que o rótulo pode quebrar: com altura fixa
 * e `whitespace-nowrap`, um rótulo longo ("Prefiro descrever tudo em um
 * orçamento" mede 355px) vira largura mínima intransponível e empurra a
 * página inteira para fora da tela em 360px — foi exatamente o que acontecia
 * em /planos-de-manutencao. Deixando o texto quebrar e a altura crescer, o
 * rótulo curto continua ocupando uma linha e a mesma altura de antes, e o
 * longo passa a caber. Onde a quebra for indesejada (par de botões curtos numa
 * barra), o chamador pede `whitespace-nowrap` pelo className.
 */

export type Variante =
  | "primario"
  | "secundario"
  | "sutil"
  | "texto"
  | "perigo"
  | "claro"
  | "contorno-claro";
export type Tamanho = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario:
    "bg-jb-500 text-white shadow-xs hover:bg-jb-600 active:bg-jb-700 disabled:bg-jb-300 disabled:shadow-none",
  secundario:
    "bg-white text-graf-800 border border-graf-300 shadow-xs hover:border-graf-400 hover:bg-graf-50 active:bg-graf-100 disabled:shadow-none",
  sutil:
    "bg-graf-100 text-graf-800 hover:bg-graf-200 active:bg-graf-300",
  texto:
    "text-graf-700 hover:text-jb-700 hover:bg-graf-50 active:bg-graf-100",
  perigo:
    "bg-white text-jb-700 border border-jb-200 shadow-xs hover:bg-jb-50 hover:border-jb-300 active:bg-jb-100",
  claro:
    "bg-white text-graf-900 shadow-xs hover:bg-graf-100 active:bg-graf-200",
  "contorno-claro":
    "border border-white/35 text-white hover:border-white/70 hover:bg-white/10 active:bg-white/20",
};

/** Variantes que vivem sobre grafite e precisam do anel de foco branco. */
const SOBRE_ESCURO: Variante[] = ["claro", "contorno-claro"];

const TAMANHOS: Record<Tamanho, string> = {
  /* 40px basta para o mouse e mantém a densidade das listas do painel; no
     toque o mesmo botão cresce para os 44px do alvo mínimo. */
  sm: "min-h-10 pointer-coarse:min-h-11 px-4 py-2 text-sm gap-1.5 rounded-md",
  md: "min-h-11 px-5 py-2.5 text-corpo gap-2 rounded-lg",
  lg: "min-h-13 px-7 py-3 text-base gap-2.5 rounded-lg",
};

export function classesBotao(
  variante: Variante = "primario",
  tamanho: Tamanho = "md",
  extra?: string,
) {
  return cn(
    "inline-flex max-w-full select-none items-center justify-center text-center font-semibold",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    // com o rótulo podendo quebrar, o ícone não pode ser espremido junto
    "[&>svg]:shrink-0",
    "active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    SOBRE_ESCURO.includes(variante)
      ? "focus-visible:outline-white"
      : "focus-visible:outline-jb-500",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0",
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
      aria-busy={carregando || undefined}
      className={classesBotao(variante, tamanho, cn(larguraTotal && "w-full", className))}
    >
      {carregando ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : null}
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
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        SOBRE_ESCURO.includes(variante)
          ? "focus-visible:outline-white"
          : "focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variante],
        className,
      )}
    >
      {children}
    </button>
  );
}
