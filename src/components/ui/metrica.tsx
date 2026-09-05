import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Cartão de métrica — painel da Área da Clínica

   O número que resume um estado e leva para a lista por trás dele. Difere do
   indicador do admin de propósito: aqui o cartão é maior, tem espaço para uma
   linha de contexto em português claro e o clique é o caminho principal.

   Componente de servidor — sem estado, sem evento.
   ============================================================================ */

export type TomMetrica = "neutro" | "marca" | "ok" | "atencao" | "info";

const TONS: Record<TomMetrica, { valor: string; selo: string; barra: string }> = {
  neutro: { valor: "text-graf-950", selo: "bg-graf-100 text-graf-700", barra: "bg-graf-300" },
  marca: { valor: "text-jb-600", selo: "bg-jb-50 text-jb-700", barra: "bg-jb-500" },
  ok: { valor: "text-ok-700", selo: "bg-ok-50 text-ok-700", barra: "bg-ok-500" },
  atencao: { valor: "text-warn-700", selo: "bg-warn-50 text-warn-700", barra: "bg-warn-500" },
  info: { valor: "text-info-700", selo: "bg-info-50 text-info-700", barra: "bg-info-500" },
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
  /** Já formatado — número, moeda, data. Nunca calcule aqui. */
  valor: React.ReactNode;
  /** Palavra pequena colada ao número: "equipamentos", "em aberto". */
  unidade?: string;
  detalhe?: React.ReactNode;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomMetrica;
  href?: string;
  /** Texto do link quando "Ver detalhes" não descreve o destino. */
  hrefRotulo?: string;
  /** Fio de cor no alto do cartão — para o número que manda na tela. */
  destaque?: boolean;
  className?: string;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <>
      {destaque ? (
        <span
          aria-hidden
          className={cn("absolute inset-x-0 top-0 h-1 rounded-t-xl", cores.barra)}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-snug text-graf-600">{rotulo}</p>
        {Icone ? (
          <span
            aria-hidden
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              cores.selo,
            )}
          >
            <Icone className="size-[18px]" />
          </span>
        ) : null}
      </div>

      <p className={cn("tabular mt-4 flex items-baseline gap-1.5", cores.valor)}>
        <span className="text-title font-extrabold leading-none">{valor}</span>
        {unidade ? (
          <span className="text-sm font-semibold text-graf-500">{unidade}</span>
        ) : null}
      </p>

      {detalhe ? (
        <p className="mt-2 text-sm leading-relaxed text-graf-500">{detalhe}</p>
      ) : null}

      {href ? (
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-jb-700 transition-colors group-hover:text-jb-500">
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
    "relative flex h-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white p-5 shadow-card",
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

/** Grade padrão das métricas: 1 coluna no celular, 2 no tablet, 4 no desktop. */
export function GradeMetricas({
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
