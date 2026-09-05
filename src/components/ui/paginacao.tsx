"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Paginação
   Navega por links de verdade, preservando todos os outros parâmetros da URL
   (filtros, busca, ordenação) — só o número da página muda. Página 1 sai da
   query em vez de virar "?pagina=1", para não duplicar endereço do mesmo
   conteúdo.

   Usa useSearchParams: quem renderiza deve envolver em <Suspense>, senão a
   rota inteira cai para render no cliente.
   ============================================================================ */

/** Lista compacta: primeira, última, a atual e as vizinhas — o resto vira reticência. */
function janela(atual: number, paginas: number): (number | "reticencia")[] {
  const alvos = new Set<number>([1, paginas, atual - 1, atual, atual + 1]);
  if (atual <= 3) for (const n of [2, 3, 4]) alvos.add(n);
  if (atual >= paginas - 2) for (const n of [paginas - 1, paginas - 2, paginas - 3]) alvos.add(n);

  const numeros = [...alvos].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b);
  const saida: (number | "reticencia")[] = [];
  let anterior = 0;
  for (const numero of numeros) {
    if (anterior > 0 && numero - anterior > 1) saida.push("reticencia");
    saida.push(numero);
    anterior = numero;
  }
  return saida;
}

const BASE_ITEM =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500";

export function Paginacao({
  pagina,
  porPagina,
  total,
  parametro = "pagina",
  rotuloSingular = "resultado",
  rotuloPlural = "resultados",
  className,
}: {
  /** Página atual, começando em 1. */
  pagina: number;
  porPagina: number;
  total: number;
  parametro?: string;
  rotuloSingular?: string;
  rotuloPlural?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const paginas = Math.max(1, Math.ceil(total / Math.max(1, porPagina)));
  const atual = Math.min(Math.max(1, Math.trunc(pagina) || 1), paginas);
  const de = total === 0 ? 0 : (atual - 1) * porPagina + 1;
  const ate = Math.min(atual * porPagina, total);

  function href(numero: number) {
    const novos = new URLSearchParams(params.toString());
    if (numero <= 1) novos.delete(parametro);
    else novos.set(parametro, String(numero));
    const consulta = novos.toString();
    return consulta ? `${pathname}?${consulta}` : pathname;
  }

  const itens = janela(atual, paginas);

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        "flex flex-col items-center justify-between gap-4 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-graf-500" aria-live="polite">
        {total === 0 ? (
          <>Nenhum {rotuloSingular}</>
        ) : (
          <>
            <span className="tabular font-semibold text-graf-800">{de}</span> a{" "}
            <span className="tabular font-semibold text-graf-800">{ate}</span> de{" "}
            <span className="tabular font-semibold text-graf-800">{total}</span>{" "}
            {total === 1 ? rotuloSingular : rotuloPlural}
          </>
        )}
      </p>

      {paginas > 1 ? (
        <ul className="flex items-center gap-1">
          <li>
            {atual > 1 ? (
              <Link
                href={href(atual - 1)}
                scroll={false}
                rel="prev"
                className={cn(BASE_ITEM, "text-graf-700 hover:bg-graf-100")}
              >
                <ChevronLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">Anterior</span>
                <span className="sr-only sm:hidden">Página anterior</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={cn(BASE_ITEM, "cursor-not-allowed text-graf-300")}
              >
                <ChevronLeft className="size-4" aria-hidden />
                <span className="hidden sm:inline">Anterior</span>
              </span>
            )}
          </li>

          {itens.map((item, indice) =>
            item === "reticencia" ? (
              <li
                key={`reticencia-${indice}`}
                aria-hidden
                className="hidden px-1 text-sm text-graf-500 sm:block"
              >
                …
              </li>
            ) : (
              <li key={item} className="hidden sm:block">
                {item === atual ? (
                  <span
                    aria-current="page"
                    className={cn(BASE_ITEM, "tabular bg-jb-500 text-white")}
                  >
                    {item}
                  </span>
                ) : (
                  <Link
                    href={href(item)}
                    scroll={false}
                    aria-label={`Página ${item}`}
                    className={cn(BASE_ITEM, "tabular text-graf-700 hover:bg-graf-100")}
                  >
                    {item}
                  </Link>
                )}
              </li>
            ),
          )}

          <li className="sm:hidden">
            <span className="tabular px-2 text-sm text-graf-600">
              {atual} / {paginas}
            </span>
          </li>

          <li>
            {atual < paginas ? (
              <Link
                href={href(atual + 1)}
                scroll={false}
                rel="next"
                className={cn(BASE_ITEM, "text-graf-700 hover:bg-graf-100")}
              >
                <span className="hidden sm:inline">Próxima</span>
                <span className="sr-only sm:hidden">Próxima página</span>
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className={cn(BASE_ITEM, "cursor-not-allowed text-graf-300")}
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="size-4" aria-hidden />
              </span>
            )}
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
