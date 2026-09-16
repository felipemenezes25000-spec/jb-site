import Link from "next/link";

import { Trilha, type Migalha } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/** Chassi visual compartilhado de todas as telas do painel. */
export function CabecalhoBase({
  trilha,
  titulo,
  descricao,
  etiquetas,
  acoes,
  className,
}: {
  trilha?: Migalha[];
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  etiquetas?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      {trilha && trilha.length > 0 ? <Trilha itens={trilha} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <h1 className="text-[1.75rem] font-bold leading-[1.1] tracking-[-0.035em] text-graf-950 sm:text-[2rem]">
              {titulo}
            </h1>
            {etiquetas}
          </div>
          {descricao ? (
            <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-graf-500">
              {descricao}
            </p>
          ) : null}
        </div>

        {acoes ? <div className="flex flex-wrap items-center gap-2.5">{acoes}</div> : null}
      </div>
    </header>
  );
}

export function ParDados({
  rotulo,
  children,
  vazio = "Não informado",
  className,
}: {
  rotulo: string;
  children?: React.ReactNode;
  vazio?: string;
  className?: string;
}) {
  const temValor =
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== "" &&
    !(Array.isArray(children) && children.length === 0);

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.75rem] font-bold uppercase tracking-[0.075em] text-graf-500">
        {rotulo}
      </dt>
      <dd
        className={cn(
          "mt-1.5 text-[0.9375rem] leading-relaxed",
          temValor ? "font-medium text-graf-900" : "italic text-graf-500",
        )}
      >
        {temValor ? children : vazio}
      </dd>
    </div>
  );
}

export function GradeDados({
  children,
  colunas = 2,
  className,
}: {
  children: React.ReactNode;
  colunas?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-9 gap-y-6",
        colunas === 2 && "sm:grid-cols-2",
        colunas === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function BlocoForm({
  titulo,
  descricao,
  acao,
  espacado = true,
  children,
  className,
}: {
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  espacado?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-graf-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(20,24,32,0.03)] sm:p-6",
        className,
      )}
    >
      {titulo ? (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-b border-graf-100 pb-5">
          <div className="min-w-0">
            <h2 className="text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] text-graf-950">
              {titulo}
            </h2>
            {descricao ? (
              <p className="mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-graf-500">
                {descricao}
              </p>
            ) : null}
          </div>
          {acao}
        </div>
      ) : null}

      {espacado ? <div className="space-y-6">{children}</div> : children}
    </section>
  );
}

export function BarraForm({
  ajuda,
  children,
  className,
}: {
  ajuda?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-graf-200/90 bg-white/90 py-4 shadow-[0_-8px_24px_-22px_rgba(20,24,32,0.35)] backdrop-blur-xl",
        className,
      )}
    >
      {ajuda ? (
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-graf-500">{ajuda}</p>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-3", !ajuda && "ml-auto")}>{children}</div>
    </div>
  );
}

export function GrupoCampos({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-graf-500">
          {titulo}
        </h3>
        {descricao ? (
          <p className="mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-graf-500">
            {descricao}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export type ItemSubNav = { rotulo: string; href: string; contador?: number };

export function SubNav({
  itens,
  atual,
  rotuloDaNavegacao = "Seções da área",
  className,
}: {
  itens: ItemSubNav[];
  atual: string;
  rotuloDaNavegacao?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={rotuloDaNavegacao}
      className={cn("scrollbar-none -mx-1 overflow-x-auto px-1", className)}
    >
      <ul className="flex min-w-max items-center gap-1.5 rounded-xl border border-graf-200/80 bg-graf-100/60 p-1.5">
        {itens.map((item) => {
          const ativo = item.href === atual;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[0.875rem] font-semibold transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  ativo
                    ? "bg-white text-jb-700 shadow-[0_1px_3px_rgba(20,24,32,0.08)] ring-1 ring-inset ring-graf-200/80"
                    : "text-graf-600 hover:bg-white/70 hover:text-graf-900",
                )}
              >
                {item.rotulo}
                {typeof item.contador === "number" ? (
                  <span
                    className={cn(
                      "tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                      ativo ? "bg-jb-50 text-jb-700" : "bg-white text-graf-600",
                    )}
                  >
                    {item.contador}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
