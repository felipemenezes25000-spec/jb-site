import Link from "next/link";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function primeiroValor(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return (valor[0] ?? "").trim();
  return (valor ?? "").trim();
}

export function paginaDaUrl(valor: string | string[] | undefined): number {
  const bruto = Number.parseInt(primeiroValor(valor), 10);
  return Number.isFinite(bruto) && bruto > 1 ? bruto : 1;
}

export type OpcaoFiltro = {
  valor: string;
  rotulo: string;
  quantidade?: number;
};

export type GrupoFiltro = {
  nome: string;
  rotulo: string;
  opcoes: OpcaoFiltro[];
};

function montarHref(
  base: string,
  parametros: Record<string, string>,
  nome: string,
  valor: string,
) {
  const busca = new URLSearchParams();
  for (const [chave, atual] of Object.entries(parametros)) {
    if (chave === nome || chave === "pagina" || !atual) continue;
    busca.set(chave, atual);
  }
  if (valor) busca.set(nome, valor);
  const consulta = busca.toString();
  return consulta ? `${base}?${consulta}` : base;
}

export function Filtros({
  base,
  parametros,
  grupos = [],
  busca,
  className,
}: {
  base: string;
  parametros: Record<string, string>;
  grupos?: GrupoFiltro[];
  busca?: { nome: string; rotulo: string; placeholder?: string };
  className?: string;
}) {
  const temConteudo = Boolean(busca || grupos.length > 0);
  if (!temConteudo) return null;

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border border-graf-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(18,24,35,0.025),0_16px_42px_-36px_rgba(18,24,35,0.34)] sm:p-5",
        className,
      )}
    >
      {busca ? (
        <form
          method="get"
          action={base}
          role="search"
          className="flex flex-wrap items-end gap-2.5"
        >
          {Object.entries(parametros).map(([chave, valor]) =>
            chave === busca.nome || chave === "pagina" || !valor ? null : (
              <input key={chave} type="hidden" name={chave} value={valor} />
            ),
          )}

          <div className="min-w-[14rem] flex-1 sm:max-w-md">
            <label
              htmlFor={`filtro-${busca.nome}`}
              className="mb-1.5 block text-[0.78rem] font-bold uppercase tracking-[0.06em] text-graf-600"
            >
              {busca.rotulo}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-graf-400"
                aria-hidden
              />
              <input
                id={`filtro-${busca.nome}`}
                type="search"
                name={busca.nome}
                defaultValue={parametros[busca.nome] ?? ""}
                placeholder={busca.placeholder}
                className="h-11 w-full rounded-xl border border-graf-300 bg-graf-50/60 pl-10 pr-3.5 text-sm text-graf-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all placeholder:text-graf-400 hover:border-graf-400 hover:bg-white focus:border-jb-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/10"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 select-none items-center justify-center rounded-xl bg-graf-950 px-5 text-[0.9rem] font-bold text-white shadow-[0_8px_20px_-14px_rgba(18,24,35,0.55)] transition-all hover:-translate-y-px hover:bg-graf-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Buscar
          </button>

          {parametros[busca.nome] ? (
            <Link
              href={montarHref(base, parametros, busca.nome, "")}
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-graf-600 transition-colors hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Limpar busca
            </Link>
          ) : null}
        </form>
      ) : null}

      {grupos.length > 0 ? (
        <div className={cn(busca && "mt-4 border-t border-graf-100 pt-4", "space-y-3")}>
          {grupos.map((grupo) => (
            <nav key={grupo.nome} aria-label={grupo.rotulo}>
              <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-graf-500">
                {grupo.rotulo}
              </p>
              <ul className="flex flex-wrap gap-2">
                {grupo.opcoes.map((opcao) => {
                  const ativo = (parametros[grupo.nome] ?? "") === opcao.valor;
                  return (
                    <li key={`${grupo.nome}-${opcao.valor || "todos"}`}>
                      <Link
                        href={montarHref(base, parametros, grupo.nome, opcao.valor)}
                        aria-current={ativo ? "true" : undefined}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                          ativo
                            ? "border-jb-200 bg-jb-50 text-jb-800 shadow-[inset_0_0_0_1px_rgba(229,27,35,0.04)]"
                            : "border-graf-200 bg-white text-graf-700 hover:-translate-y-px hover:border-graf-300 hover:bg-graf-50/70 hover:text-graf-950",
                        )}
                      >
                        {opcao.rotulo}
                        {typeof opcao.quantidade === "number" ? (
                          <span
                            className={cn(
                              "tabular rounded-full px-1.5 py-0.5 text-[0.7rem] font-bold",
                              ativo ? "bg-jb-500 text-white" : "bg-graf-100 text-graf-600",
                            )}
                          >
                            {opcao.quantidade}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      ) : null}
    </div>
  );
}
