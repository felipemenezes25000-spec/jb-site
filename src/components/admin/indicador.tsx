import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomIndicador = "neutro" | "marca" | "ok" | "aviso" | "info";

const TONS: Record<
  TomIndicador,
  { valor: string; icone: string; fundoIcone: string; brilho: string }
> = {
  neutro: {
    valor: "text-graf-950",
    icone: "text-graf-600",
    fundoIcone: "bg-graf-100",
    brilho: "from-graf-100/50",
  },
  marca: {
    valor: "text-jb-700",
    icone: "text-jb-600",
    fundoIcone: "bg-jb-50 ring-1 ring-inset ring-jb-500/10",
    brilho: "from-jb-50/70",
  },
  ok: {
    valor: "text-ok-700",
    icone: "text-ok-700",
    fundoIcone: "bg-ok-50 ring-1 ring-inset ring-ok-500/10",
    brilho: "from-ok-50/70",
  },
  aviso: {
    valor: "text-warn-700",
    icone: "text-warn-700",
    fundoIcone: "bg-warn-50 ring-1 ring-inset ring-warn-500/10",
    brilho: "from-warn-50/70",
  },
  info: {
    valor: "text-info-700",
    icone: "text-info-700",
    fundoIcone: "bg-info-50 ring-1 ring-inset ring-info-500/10",
    brilho: "from-info-50/70",
  },
};

export type Variacao = {
  percentual: number;
  rotulo: string;
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
  hrefRotulo?: string;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomIndicador;
  variacao?: Variacao;
  className?: string;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-2xl bg-gradient-to-b to-transparent opacity-65",
          cores.brilho,
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold leading-snug text-graf-600">{rotulo}</p>
          <p className={cn("tabular mt-3 text-[2rem] font-bold leading-none tracking-[-0.035em]", cores.valor)}>
            {valor}
          </p>
        </div>

        {Icone ? (
          <span
            aria-hidden
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-[0_1px_2px_rgba(20,24,32,0.04)]",
              cores.fundoIcone,
            )}
          >
            <Icone className={cn("size-[19px]", cores.icone)} />
          </span>
        ) : null}
      </div>

      <div className="relative">
        {variacao ? <SeloVariacao {...variacao} /> : null}

        {detalhe ? (
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-graf-500">{detalhe}</p>
        ) : null}
      </div>

      {href ? (
        <p className="relative mt-auto flex items-center gap-1.5 pt-4 text-[0.8125rem] font-semibold text-graf-700 transition-colors group-hover:text-jb-700">
          {hrefRotulo ?? "Ver lista"}
          <ArrowRight
            className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      ) : null}
    </>
  );

  const base = cn(
    "relative flex h-full min-h-[10.75rem] flex-col overflow-hidden rounded-2xl border border-graf-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(20,24,32,0.03)]",
    className,
  );

  if (!href) return <div className={base}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_10px_30px_-18px_rgba(20,24,32,0.35)]",
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
    <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[0.8125rem]">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
          bom ? "bg-ok-50 text-ok-700" : "bg-jb-50 text-jb-700",
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

export function Indicadores({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
