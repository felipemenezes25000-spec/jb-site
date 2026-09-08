import Link from "next/link";
import { ArrowRight, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomIndicador = "neutro" | "marca" | "ok" | "aviso" | "info";

const TONS: Record<
  TomIndicador,
  { valor: string; icone: string; fundoIcone: string; brilho: string; mini: string }
> = {
  neutro: {
    valor: "text-graf-950",
    icone: "text-graf-700",
    fundoIcone: "bg-graf-100",
    brilho: "from-graf-100/55",
    mini: "bg-graf-100 text-graf-600",
  },
  marca: {
    valor: "text-jb-700",
    icone: "text-jb-600",
    fundoIcone: "bg-jb-50 ring-1 ring-inset ring-jb-500/10",
    brilho: "from-jb-50/85",
    mini: "bg-jb-50 text-jb-700",
  },
  ok: {
    valor: "text-ok-700",
    icone: "text-ok-700",
    fundoIcone: "bg-ok-50 ring-1 ring-inset ring-ok-500/10",
    brilho: "from-ok-50/85",
    mini: "bg-ok-50 text-ok-700",
  },
  aviso: {
    valor: "text-warn-700",
    icone: "text-warn-700",
    fundoIcone: "bg-warn-50 ring-1 ring-inset ring-warn-500/10",
    brilho: "from-warn-50/85",
    mini: "bg-warn-50 text-warn-700",
  },
  info: {
    valor: "text-info-700",
    icone: "text-info-700",
    fundoIcone: "bg-info-50 ring-1 ring-inset ring-info-500/10",
    brilho: "from-info-50/85",
    mini: "bg-info-50 text-info-700",
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
          "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent opacity-60",
          cores.brilho,
        )}
      />

      <div className="relative flex items-start gap-3.5">
        {Icone ? (
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-[0_1px_2px_rgba(20,24,32,0.035)]",
              cores.fundoIcone,
            )}
          >
            <Icone className={cn("size-[20px]", cores.icone)} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[0.75rem] font-semibold leading-snug text-graf-600">{rotulo}</p>
            {href ? (
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                  cores.mini,
                )}
              >
                <ChevronRight className="size-3.5" />
              </span>
            ) : null}
          </div>
          <p className={cn("tabular mt-1.5 text-[1.55rem] font-extrabold leading-none tracking-[-0.035em]", cores.valor)}>
            {valor}
          </p>
        </div>
      </div>

      <div className="relative mt-2.5">
        {variacao ? <SeloVariacao {...variacao} /> : null}
        {detalhe ? (
          <p className="mt-1.5 text-[0.72rem] leading-relaxed text-graf-500">{detalhe}</p>
        ) : null}
      </div>

      {href ? (
        <p className="relative mt-auto flex items-center gap-1.5 pt-3 text-[0.72rem] font-semibold text-graf-700 transition-colors group-hover:text-jb-700">
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
    "relative flex h-full min-h-[8.9rem] flex-col overflow-hidden rounded-xl border border-graf-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(20,24,32,0.025),0_10px_28px_-24px_rgba(20,24,32,0.28)]",
    className,
  );

  if (!href) return <div className={base}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_10px_28px_-18px_rgba(20,24,32,0.25)]",
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
    <p className="flex flex-wrap items-center gap-1.5 text-[0.7rem]">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
          bom ? "bg-ok-50 text-ok-700" : "bg-jb-50 text-jb-700",
        )}
      >
        <Icone className="size-3" aria-hidden />
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
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
