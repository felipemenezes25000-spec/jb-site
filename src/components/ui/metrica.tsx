import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type TomMetrica = "neutro" | "marca" | "ok" | "atencao" | "info";

const TONS: Record<TomMetrica, { valor: string; selo: string; barra: string }> = {
  neutro: {
    valor: "text-graf-950",
    selo: "bg-graf-100 text-graf-700 ring-graf-500/10",
    barra: "bg-graf-300",
  },
  marca: {
    valor: "text-jb-600",
    selo: "bg-jb-50 text-jb-700 ring-jb-500/10",
    barra: "bg-jb-500",
  },
  ok: {
    valor: "text-ok-700",
    selo: "bg-ok-50 text-ok-700 ring-ok-500/10",
    barra: "bg-ok-500",
  },
  atencao: {
    valor: "text-warn-700",
    selo: "bg-warn-50 text-warn-700 ring-warn-500/10",
    barra: "bg-warn-500",
  },
  info: {
    valor: "text-info-700",
    selo: "bg-info-50 text-info-700 ring-info-500/10",
    barra: "bg-info-500",
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
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-1 rounded-l-2xl", cores.barra)}
        />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <p className="max-w-[12rem] text-sm font-semibold leading-snug text-graf-600">{rotulo}</p>
        {Icone ? (
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              cores.selo,
            )}
          >
            <Icone className="size-5" />
          </span>
        ) : null}
      </div>

      <p className={cn("tabular mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1", cores.valor)}>
        <span className="text-[2rem] font-extrabold leading-none tracking-[-0.04em]">{valor}</span>
        {unidade ? <span className="text-sm font-semibold text-graf-500">{unidade}</span> : null}
      </p>

      {detalhe ? <p className="mt-2.5 text-sm leading-relaxed text-graf-500">{detalhe}</p> : null}

      {href ? (
        <p className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-jb-700 transition-colors group-hover:text-jb-600">
          {hrefRotulo ?? "Ver detalhes"}
          <ArrowRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      ) : null}
    </>
  );

  const base = cn(
    "relative flex h-full min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-graf-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(18,24,35,0.025),0_18px_46px_-36px_rgba(18,24,35,0.3)]",
    destaque && "pl-6",
    className,
  );

  if (!href) return <div className={base}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        "group transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_6px_16px_rgba(18,24,35,0.05),0_22px_48px_-30px_rgba(18,24,35,0.28)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
      )}
    >
      {conteudo}
    </Link>
  );
}

export function GradeMetricas({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5", className)}>
      {children}
    </div>
  );
}
