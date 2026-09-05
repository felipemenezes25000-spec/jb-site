"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Barra de filtros das listagens do painel.
 *
 * Todo o estado mora na query string: a listagem continua sendo renderizada no
 * servidor, o "voltar" do navegador funciona e o gestor consegue mandar o link
 * já filtrado para outra pessoa. Qualquer mudança apaga `pagina`, senão a
 * pessoa filtra e cai numa página 7 que não existe mais.
 *
 * Uso:
 *   <FiltrosLista
 *     campos={[
 *       { tipo: "busca", nome: "q", rotulo: "Buscar", placeholder: "Número, cliente ou e-mail" },
 *       { tipo: "selecao", nome: "status", rotulo: "Status", opcoes: [...] },
 *       { tipo: "periodo", nome: "data", rotulo: "Período" },
 *     ]}
 *   />
 *
 * O campo `periodo` escreve dois parâmetros: `<nome>_de` e `<nome>_ate`, no
 * mesmo formato do `<input type="date">` (AAAA-MM-DD).
 */

export type OpcaoFiltro = { valor: string; rotulo: string };

export type CampoFiltro =
  | {
      tipo: "busca";
      nome: string;
      rotulo: string;
      placeholder?: string;
      /** Ocupa mais espaço na linha. Ligado por padrão. */
      largo?: boolean;
    }
  | {
      tipo: "selecao";
      nome: string;
      rotulo: string;
      opcoes: OpcaoFiltro[];
      /** Texto da opção que representa "sem filtro". */
      todos?: string;
    }
  | { tipo: "periodo"; nome: string; rotulo: string }
  | { tipo: "data"; nome: string; rotulo: string };

const ATRASO_BUSCA = 450;

/** Todos os parâmetros que esta barra controla — usado ao limpar. */
function parametrosDe(campos: CampoFiltro[]) {
  return campos.flatMap((campo) =>
    campo.tipo === "periodo" ? [`${campo.nome}_de`, `${campo.nome}_ate`] : [campo.nome],
  );
}

export function FiltrosLista(props: { campos: CampoFiltro[]; className?: string }) {
  // useSearchParams precisa de fronteira de suspensão para não travar a
  // pré-renderização de rotas estáticas; a barra já traz a sua.
  return (
    <Suspense fallback={<EsqueletoFiltros className={props.className} />}>
      <Barra {...props} />
    </Suspense>
  );
}

function EsqueletoFiltros({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-[4.75rem] animate-pulse rounded-xl border border-graf-200 bg-white sm:h-[4.25rem]",
        className,
      )}
    />
  );
}

function Barra({ campos, className }: { campos: CampoFiltro[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [pendente, setPendente] = useState(false);
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      campos
        .filter((campo) => campo.tipo === "busca")
        .map((campo) => [campo.nome, params.get(campo.nome) ?? ""]),
    ),
  );

  const consulta = params.toString();
  const ultimaAplicada = useRef(consulta);

  const aplicar = useCallback(
    (mudancas: Record<string, string>) => {
      const novos = new URLSearchParams(consulta);
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor) novos.set(chave, valor);
        else novos.delete(chave);
      }
      novos.delete("pagina");

      const destino = novos.toString();
      if (destino === consulta) return;

      ultimaAplicada.current = destino;
      setPendente(true);
      router.replace(destino ? `${pathname}?${destino}` : pathname, { scroll: false });
    },
    [consulta, pathname, router],
  );

  // a URL chegou onde queríamos: o indicador de carregando pode sair
  useEffect(() => {
    if (consulta === ultimaAplicada.current) setPendente(false);
  }, [consulta]);

  // busca é digitada, então espera a pessoa parar antes de recarregar a lista
  useEffect(() => {
    const relogio = setTimeout(() => {
      const mudancas: Record<string, string> = {};
      for (const [nome, valor] of Object.entries(textos)) {
        if ((params.get(nome) ?? "") !== valor.trim()) mudancas[nome] = valor.trim();
      }
      if (Object.keys(mudancas).length > 0) aplicar(mudancas);
    }, ATRASO_BUSCA);

    return () => clearTimeout(relogio);
  }, [textos, params, aplicar]);

  const controlados = parametrosDe(campos);
  const ativos = controlados.filter((chave) => params.get(chave));

  function limpar() {
    setTextos((atual) => Object.fromEntries(Object.keys(atual).map((nome) => [nome, ""])));
    aplicar(Object.fromEntries(controlados.map((chave) => [chave, ""])));
  }

  return (
    <section
      aria-label="Filtros da listagem"
      aria-busy={pendente || undefined}
      className={cn("rounded-xl border border-graf-200 bg-white p-3 shadow-card", className)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {campos.map((campo) => {
          if (campo.tipo === "busca") {
            return (
              <div
                key={campo.nome}
                className={cn("min-w-0", campo.largo === false ? "md:w-56" : "md:min-w-64 md:flex-1")}
              >
                <label
                  htmlFor={`filtro-${campo.nome}`}
                  className="mb-1 block text-xs font-semibold text-graf-600"
                >
                  {campo.rotulo}
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                    aria-hidden
                  />
                  <input
                    id={`filtro-${campo.nome}`}
                    type="search"
                    autoComplete="off"
                    value={textos[campo.nome] ?? ""}
                    placeholder={campo.placeholder}
                    onChange={(evento) =>
                      setTextos((atual) => ({ ...atual, [campo.nome]: evento.target.value }))
                    }
                    className={cn(
                      "h-11 w-full rounded-lg border border-graf-450 bg-white pl-9 pr-3 text-sm text-graf-900",
                      "placeholder:text-graf-500 hover:border-graf-500",
                      "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
                    )}
                  />
                </div>
              </div>
            );
          }

          if (campo.tipo === "selecao") {
            return (
              <div key={campo.nome} className="min-w-0 md:w-52">
                <label
                  htmlFor={`filtro-${campo.nome}`}
                  className="mb-1 block text-xs font-semibold text-graf-600"
                >
                  {campo.rotulo}
                </label>
                <select
                  id={`filtro-${campo.nome}`}
                  value={params.get(campo.nome) ?? ""}
                  onChange={(evento) => aplicar({ [campo.nome]: evento.target.value })}
                  className={cn(
                    "h-11 w-full rounded-lg border border-graf-450 bg-white px-3 pr-8 text-sm text-graf-900",
                    "hover:border-graf-500",
                    "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
                  )}
                >
                  <option value="">{campo.todos ?? "Todos"}</option>
                  {campo.opcoes.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (campo.tipo === "data") {
            return (
              <div key={campo.nome} className="min-w-0 md:w-44">
                <label
                  htmlFor={`filtro-${campo.nome}`}
                  className="mb-1 block text-xs font-semibold text-graf-600"
                >
                  {campo.rotulo}
                </label>
                <EntradaData
                  id={`filtro-${campo.nome}`}
                  valor={params.get(campo.nome) ?? ""}
                  aoMudar={(valor) => aplicar({ [campo.nome]: valor })}
                />
              </div>
            );
          }

          return (
            // No celular os dois campos de data empilham: lado a lado, dois
            // `input[type=date]` não encolhem abaixo da própria largura mínima
            // e empurravam a barra para fora da tela em 360px.
            <fieldset key={campo.nome} className="min-w-0">
              <legend className="mb-1 text-xs font-semibold text-graf-600">{campo.rotulo}</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <EntradaData
                  id={`filtro-${campo.nome}-de`}
                  rotuloOculto={`${campo.rotulo} — de`}
                  valor={params.get(`${campo.nome}_de`) ?? ""}
                  aoMudar={(valor) => aplicar({ [`${campo.nome}_de`]: valor })}
                  className="w-full min-w-0 sm:w-40"
                />
                <span className="shrink-0 text-sm text-graf-500" aria-hidden>
                  até
                </span>
                <EntradaData
                  id={`filtro-${campo.nome}-ate`}
                  rotuloOculto={`${campo.rotulo} — até`}
                  valor={params.get(`${campo.nome}_ate`) ?? ""}
                  aoMudar={(valor) => aplicar({ [`${campo.nome}_ate`]: valor })}
                  className="w-full min-w-0 sm:w-40"
                />
              </div>
            </fieldset>
          );
        })}

        <div className="flex items-center gap-3 md:ml-auto md:pb-0.5">
          <p
            aria-live="polite"
            className="flex min-h-5 items-center gap-1.5 text-xs font-medium text-graf-500"
          >
            {pendente ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Atualizando…
              </>
            ) : ativos.length > 0 ? (
              <>
                <ListFilter className="size-3.5" aria-hidden />
                {ativos.length === 1 ? "1 filtro ativo" : `${ativos.length} filtros ativos`}
              </>
            ) : null}
          </p>

          {ativos.length > 0 ? (
            <button
              type="button"
              onClick={limpar}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-700",
                "transition-colors hover:border-graf-400 hover:bg-graf-50",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              )}
            >
              <X className="size-4" aria-hidden />
              Limpar
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EntradaData({
  id,
  valor,
  aoMudar,
  rotuloOculto,
  className,
}: {
  id: string;
  valor: string;
  aoMudar: (valor: string) => void;
  rotuloOculto?: string;
  className?: string;
}) {
  return (
    <>
      {rotuloOculto ? (
        <label htmlFor={id} className="sr-only">
          {rotuloOculto}
        </label>
      ) : null}
      <input
        id={id}
        type="date"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className={cn(
          "h-11 rounded-lg border border-graf-450 bg-white px-3 text-sm text-graf-900",
          "hover:border-graf-500",
          "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
          className ?? "w-full",
        )}
      />
    </>
  );
}
