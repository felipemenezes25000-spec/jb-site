import Link from "next/link";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Filtros das listagens da Minha JB.
 *
 * Tudo mora na URL: as opções são links de verdade e a busca é um `form` com
 * `method="get"`. Nenhum estado no cliente, nenhum `useSearchParams` — a
 * listagem continua sendo Server Component, o resultado é compartilhável e
 * funciona com JavaScript desligado.
 *
 * Trocar qualquer filtro apaga `pagina`: ficar na página 4 de um recorte que
 * agora tem uma página só é o jeito clássico de cair num "nada por aqui".
 */

/** `searchParams` pode trazer o mesmo nome repetido; vale o primeiro. */
export function primeiroValor(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return (valor[0] ?? "").trim();
  return (valor ?? "").trim();
}

/** Número de página vindo da URL, sempre 1 ou mais. */
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
  /** Nome do parâmetro na URL. */
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
  /** Caminho da listagem, ex.: "/minha-jb/pedidos". */
  base: string;
  /** Parâmetros atuais da URL, já normalizados pela página. */
  parametros: Record<string, string>;
  grupos?: GrupoFiltro[];
  busca?: { nome: string; rotulo: string; placeholder?: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-6 space-y-4", className)}>
      {busca ? (
        <form
          method="get"
          action={base}
          role="search"
          className="flex flex-wrap items-end gap-2"
        >
          {Object.entries(parametros).map(([chave, valor]) =>
            chave === busca.nome || chave === "pagina" || !valor ? null : (
              <input key={chave} type="hidden" name={chave} value={valor} />
            ),
          )}

          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label
              htmlFor={`filtro-${busca.nome}`}
              className="mb-1.5 block text-sm font-semibold text-graf-800"
            >
              {busca.rotulo}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                aria-hidden
              />
              <input
                id={`filtro-${busca.nome}`}
                type="search"
                name={busca.nome}
                defaultValue={parametros[busca.nome] ?? ""}
                placeholder={busca.placeholder}
                className="h-11 w-full rounded-lg border border-graf-300 bg-white pl-10 pr-3.5 text-graf-900 shadow-xs transition-colors placeholder:text-graf-500 hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 select-none items-center justify-center rounded-lg border border-graf-300 bg-white px-5 text-[0.9375rem] font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Buscar
          </button>

          {parametros[busca.nome] ? (
            <Link
              href={montarHref(base, parametros, busca.nome, "")}
              className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Limpar busca
            </Link>
          ) : null}
        </form>
      ) : null}

      {grupos.map((grupo) => (
        <nav key={grupo.nome} aria-label={grupo.rotulo}>
          <ul className="flex flex-wrap gap-2">
            {grupo.opcoes.map((opcao) => {
              const ativo = (parametros[grupo.nome] ?? "") === opcao.valor;
              return (
                <li key={`${grupo.nome}-${opcao.valor || "todos"}`}>
                  <Link
                    href={montarHref(base, parametros, grupo.nome, opcao.valor)}
                    aria-current={ativo ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                      ativo
                        ? "border-jb-500 bg-jb-50 text-jb-800"
                        : "border-graf-200 bg-white text-graf-700 hover:border-graf-300 hover:text-graf-900",
                    )}
                  >
                    {opcao.rotulo}
                    {typeof opcao.quantidade === "number" ? (
                      <span
                        className={cn(
                          "tabular rounded-full px-1.5 py-0.5 text-xs",
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
  );
}
