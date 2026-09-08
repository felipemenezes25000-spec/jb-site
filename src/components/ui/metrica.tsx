import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomMetrica = "neutro" | "marca" | "ok" | "atencao" | "info";

const TONS: Record<TomMetrica, { valor: string; selo: string; barra: string; fundo: string }> = {
  neutro: {
    valor: "text-graf-950",
    selo: "bg-graf-100 text-graf-700 ring-graf-500/10",
    barra: "bg-graf-300",
    fundo: "bg-white",
  },
  marca: {
    valor: "text-graf-950",
    selo: "bg-jb-50 text-jb-700 ring-jb-500/10",
    barra: "bg-jb-500",
    fundo: "bg-gradient-to-br from-white via-white to-jb-50/70",
  },
  ok: {
    valor: "text-ok-700",
    selo: "bg-ok-50 text-ok-700 ring-ok-500/10",
    barra: "bg-ok-500",
    fundo: "bg-white",
  },
  atencao: {
    valor: "text-warn-700",
    selo: "bg-warn-50 text-warn-700 ring-warn-500/10",
    barra: "bg-warn-500",
    fundo: "bg-white",
  },
  info: {
    valor: "text-graf-950",
    selo: "bg-graf-100 text-graf-800 ring-graf-500/10",
    barra: "bg-info-500",
    fundo: "bg-white",
  },
};

export function CartaoMetrica({
  rotulo,
  valor,
  unidade,
  detalhe,
  icone: Icone,
  tom = "neutro",
  href,
  hrefRotulo,
  destaque,
  className,
}: {
  rotulo: string;
  valor: React.ReactNode;
  unidade?: string;
  detalhe?: React.ReactNode;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomMetrica;
  href?: string;
  hrefRotulo?: string;
  destaque?: boolean;
  className?: string;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <>
      {destaque ? (
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-2xl", cores.barra)} />
      ) : null}

      <div className="flex items-start gap-4">
        {Icone ? (
          <span
            aria-hidden
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              cores.selo,
            )}
          >
            <Icone className="size-[22px]" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-[0.82rem] font-semibold leading-snug text-graf-600">{rotulo}</p>
          <p className={cn("tabular mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1", cores.valor)}>
            <span className="text-[1.8rem] font-extrabold leading-none tracking-[-0.04em]">{valor}</span>
            {unidade ? <span className="text-[0.8rem] font-semibold text-graf-500">{unidade}</span> : null}
          </p>
          {detalhe ? <p className="mt-2 text-[0.8rem] leading-relaxed text-graf-500">{detalhe}</p> : null}
        </div>
      </div>

      {href ? (
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-[0.8rem] font-bold text-jb-700 transition-colors group-hover:text-jb-600">
          {hrefRotulo ?? "Ver detalhes"}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </p>
      ) : null}
    </>
  );

  const base = cn(
    "relative flex h-full min-h-[10.25rem] flex-col overflow-hidden rounded-2xl border border-graf-200/90 p-4.5 shadow-[0_1px_2px_rgba(18,24,35,0.025),0_16px_40px_-34px_rgba(18,24,35,0.35)]",
    cores.fundo,
    destaque && "pl-5",
    className,
  );

  if (!href) return <div className={base}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_7px_18px_rgba(18,24,35,0.045),0_24px_52px_-32px_rgba(18,24,35,0.28)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
      )}
    >
      {conteudo}
    </Link>
  );
}

export function GradeMetricas({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3.5", className)}>
      {children}
    </div>
  );
}
