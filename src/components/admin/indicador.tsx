import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Número que vale por uma frase.
 *
 * Rótulo curto em cima, número grande em tabular, contexto embaixo. Quando há
 * `href`, o cartão inteiro é o alvo do clique — quem lê o número quer a lista
 * por trás dele.
 *
 * Componente de servidor: sem estado, sem evento. Pode ser usado direto em
 * qualquer página do painel.
 */

export type TomIndicador = "neutro" | "marca" | "ok" | "aviso" | "info";

const TONS: Record<TomIndicador, { valor: string; icone: string }> = {
  neutro: { valor: "text-graf-950", icone: "bg-graf-100 text-graf-600" },
  marca: { valor: "text-jb-700", icone: "bg-jb-50 text-jb-600" },
  ok: { valor: "text-ok-700", icone: "bg-ok-50 text-ok-700" },
  aviso: { valor: "text-warn-700", icone: "bg-warn-50 text-warn-700" },
  info: { valor: "text-info-700", icone: "bg-info-50 text-info-700" },
};

export type Variacao = {
  /** Diferença percentual em relação ao período anterior. */
  percentual: number;
  rotulo: string;
  /** Quando cair é bom — fila de pendências, por exemplo. */
  quedaEhBoa?: boolean;
};

export function Indicador({
  rotulo,
  valor,
  detalhe,
  href,
  hrefRotulo,
  icone: Icone,
  tom = "neutro",
  variacao,
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  href?: string;
  /** Texto do link, quando "Ver tudo" não descreve bem o destino. */
  hrefRotulo?: string;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomIndicador;
  variacao?: Variacao;
  className?: string;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-graf-600">{rotulo}</p>
        {Icone ? (
          <span
            aria-hidden
            className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", cores.icone)}
          >
            <Icone className="size-4" />
          </span>
        ) : null}
      </div>

      <p className={cn("tabular mt-3 text-3xl font-bold leading-none", cores.valor)}>{valor}</p>

      {variacao ? <SeloVariacao {...variacao} /> : null}

      {detalhe ? (
        <p className="mt-2 text-sm leading-snug text-graf-500">{detalhe}</p>
      ) : null}

      {href ? (
        <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-jb-700 group-hover:text-jb-500">
          {hrefRotulo ?? "Ver lista"}
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      ) : null}
    </>
  );

  const base = cn(
    "flex h-full flex-col rounded-xl border border-graf-200 bg-white p-4 shadow-card",
    className,
  );

  if (!href) return <div className={base}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[box-shadow,border-color] duration-200",
        "hover:border-graf-300 hover:shadow-raised",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
      )}
    >
      {conteudo}
    </Link>
  );
}

function SeloVariacao({ percentual, rotulo, quedaEhBoa }: Variacao) {
  const subiu = percentual >= 0;
  const bom = quedaEhBoa ? !subiu : subiu;
  const Icone = subiu ? TrendingUp : TrendingDown;
  const sinal = subiu ? "+" : "−";

  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold",
          bom ? "text-ok-700" : "text-jb-700",
        )}
      >
        <Icone className="size-3.5" aria-hidden />
        {sinal}
        {Math.abs(Math.round(percentual))}%
      </span>
      <span className="text-graf-500">{rotulo}</span>
    </p>
  );
}

/** Grade padrão dos indicadores: 1 coluna no celular, 4 no desktop. */
export function Indicadores({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
