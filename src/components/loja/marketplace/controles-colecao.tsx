"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";

import {
  alternado,
  ConteudoFiltros,
  enderecoCom,
  filtrosAplicados,
  type GruposFiltro,
  ORDENS,
  type ParametrosCatalogo,
  textoDe,
  type Travas,
  valoresDe,
} from "@/components/loja/filtros-catalogo";
import { Botao, classesBotao } from "@/components/ui/button";
import { Chip, FiltrosAtivos } from "@/components/ui/chip";
import { useDialogo } from "@/components/ui/use-dialogo";
import { cn } from "@/lib/utils";

type PropsControlesColecao = {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
} & Travas;

type Promovido = {
  chave: "estoque" | "condicao" | "marca" | "voltagem";
  valor: string;
  rotulo: string;
};

export function ControlesColecao({
  grupos,
  parametros,
  ...travas
}: PropsControlesColecao) {
  const caminho = usePathname();
  const router = useRouter();
  const idBusca = useId();
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  const dialogo = useDialogo(aberto, fechar);

  const busca = textoDe(parametros, "q");
  const ordem = textoDe(parametros, "ordem") || "relevancia";
  const aplicados = filtrosAplicados(parametros, grupos);
  const ativos = aplicados.length + (busca ? 1 : 0);

  const promovidos: Promovido[] = [
    { chave: "estoque" as const, valor: "1", rotulo: "Em estoque" },
    ...(!travas.travarCondicao && grupos.condicoes[0]
      ? [{ chave: "condicao" as const, ...grupos.condicoes[0] }]
      : []),
    ...(!travas.travarMarca && grupos.marcas[0]
      ? [{ chave: "marca" as const, ...grupos.marcas[0] }]
      : []),
    ...(grupos.voltagens[0]
      ? [{ chave: "voltagem" as const, ...grupos.voltagens[0] }]
      : []),
  ].slice(0, 4);

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const termo = String(new FormData(evento.currentTarget).get("q") ?? "").trim();
    router.push(enderecoCom(caminho, parametros, { q: termo || null }), { scroll: false });
  }

  return (
    <section aria-label="Controles do catálogo" className="border-y border-graf-200 bg-white">
      <div className="flex flex-col gap-2.5 py-3 lg:flex-row lg:items-center">
        <form role="search" onSubmit={buscar} className="relative min-w-0 flex-1 lg:max-w-lg">
          <label htmlFor={idBusca} className="sr-only">
            Buscar nesta coleção
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
            aria-hidden
          />
          <input
            id={idBusca}
            name="q"
            type="search"
            defaultValue={busca}
            key={busca}
            placeholder="Buscar produto, marca ou modelo"
            className="h-11 w-full rounded-lg border border-graf-300 bg-white pl-10 pr-3 text-base text-graf-950 transition-colors placeholder:text-graf-500 hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15 sm:text-sm"
          />
        </form>

        <div className="flex min-w-0 items-center gap-2 lg:ml-auto">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-label="Abrir filtros"
            aria-haspopup="dialog"
            aria-expanded={aberto}
            className={classesBotao(
              "secundario",
              "md",
              "shrink-0 whitespace-nowrap max-[359px]:px-4",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span>Filtros</span>
            {ativos ? (
              <span className="tabular ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-jb-500 text-xs font-extrabold text-white">
                {ativos}
              </span>
            ) : null}
          </button>

          <label className="min-w-0 flex-1 lg:flex-none">
            <span className="sr-only">Ordenar resultados</span>
            <select
              value={ordem}
              onChange={(evento) =>
                router.push(
                  enderecoCom(caminho, parametros, {
                    ordem:
                      evento.currentTarget.value === "relevancia"
                        ? null
                        : evento.currentTarget.value,
                  }),
                  { scroll: false },
                )
              }
              aria-label="Ordenar resultados"
              className="h-11 w-full min-w-0 rounded-lg border border-graf-300 bg-white pl-3 pr-8 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15 lg:w-auto"
            >
              {ORDENS.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {promovidos.length ? (
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto border-t border-graf-100 px-4 py-2 sm:mx-0 sm:px-0">
          {promovidos.map((item) => {
            const selecionado = valoresDe(parametros, item.chave).includes(item.valor);
            const href = enderecoCom(caminho, parametros, {
              [item.chave]: alternado(parametros, item.chave, item.valor),
              ...(item.chave === "estoque" ? { vendidos: null } : {}),
            });

            return (
              <Link
                key={`${item.chave}-${item.valor}`}
                href={href}
                scroll={false}
                prefetch={false}
                /* `aria-pressed` só existe em role="button"; num link o axe
                   acusa como crítico (`aria-allowed-attr`), e o leitor de tela
                   ignora o estado. O equivalente válido para "este é o filtro
                   aplicado" é `aria-current`. */
                aria-current={selecionado ? "true" : undefined}
                className={cn(
                  "foco-jb inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                  selecionado
                    ? "border-jb-300 bg-jb-50 text-jb-800"
                    : "border-graf-200 bg-white text-graf-700 hover:border-graf-400 hover:bg-graf-50",
                )}
              >
                {selecionado ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      ) : null}

      {aplicados.length || busca ? (
        <FiltrosAtivos hrefLimpar={caminho} className="border-t border-graf-100 py-3">
          {busca ? (
            <Chip
              campo="Busca"
              rotulo={busca}
              tom="marca"
              href={enderecoCom(caminho, parametros, { q: null })}
            />
          ) : null}
          {aplicados.map((ficha) => (
            <Chip
              key={`${ficha.chave}-${ficha.valor ?? ficha.rotulo}`}
              campo={ficha.campo}
              rotulo={ficha.rotulo}
              href={enderecoCom(caminho, parametros, {
                [ficha.chave]: ficha.valor
                  ? alternado(parametros, ficha.chave, ficha.valor)
                  : null,
              })}
            />
          ))}
        </FiltrosAtivos>
      ) : null}

      {aberto ? (
        <div className="fixed inset-0 z-70">
          <button
            type="button"
            aria-label="Fechar filtros"
            onClick={fechar}
            className="absolute inset-0 size-full bg-graf-950/55 backdrop-blur-[1px]"
          />
          <div
            ref={dialogo}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros do catálogo"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-[min(28rem,94vw)] flex-col bg-white shadow-pop"
          >
            <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-graf-200 px-5">
              <div>
                <h2 className="text-lg font-bold text-graf-950">Filtrar produtos</h2>
                <p className="text-xs text-graf-500">Refine a lista sem perder sua busca</p>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar filtros"
                className="foco-jb flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              <ConteudoFiltros
                grupos={grupos}
                parametros={parametros}
                onNavigate={fechar}
                {...travas}
              />
            </div>

            <footer className="shrink-0 border-t border-graf-200 bg-white p-4">
              <div className="flex gap-2">
                {ativos ? (
                  <Link
                    href={caminho}
                    scroll={false}
                    onClick={fechar}
                    className={classesBotao("secundario", "md", "flex-1")}
                  >
                    Limpar tudo
                  </Link>
                ) : null}
                <Botao onClick={fechar} larguraTotal>
                  Ver resultados
                </Botao>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
