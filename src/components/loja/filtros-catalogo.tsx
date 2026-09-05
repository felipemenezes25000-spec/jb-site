"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Botao, classesBotao } from "@/components/ui/button";
import { usarDialogo } from "@/components/ui/usar-dialogo";
import { formatarPreco, paraCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OpcaoFiltro = { valor: string; rotulo: string; quantidade?: number };

export type GruposFiltro = {
  categorias: OpcaoFiltro[];
  marcas: OpcaoFiltro[];
  condicoes: OpcaoFiltro[];
  voltagens: OpcaoFiltro[];
  faixaPreco: { minCents: number; maxCents: number };
};

const ORDENS = [
  { valor: "relevancia", rotulo: "Mais relevantes" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "novidades", rotulo: "Novidades" },
  { valor: "destaque", rotulo: "Em destaque" },
];

/**
 * Filtros do catálogo. O estado mora na URL — assim o resultado é
 * compartilhável, volta certo no botão "voltar" e é renderizado no servidor.
 */
export function FiltrosCatalogo({
  grupos,
  total,
  travarCategoria,
  travarCondicao,
  travarMarca,
}: {
  grupos: GruposFiltro;
  total: number;
  /** quando a própria rota já define o recorte (ex.: /seminovos, /marcas/alt) */
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  // foco preso, Esc e devolução do foco à âncora que abriu a gaveta
  const fechar = useCallback(() => setAberto(false), []);
  const gaveta = usarDialogo(aberto, fechar);

  function aplicar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "") novos.delete(chave);
      else novos.set(chave, valor);
    }
    novos.delete("pagina");
    iniciar(() => router.push(`${pathname}?${novos.toString()}`, { scroll: false }));
  }

  function alternar(chave: string, valor: string) {
    const atuais = new Set((params.get(chave) ?? "").split(",").filter(Boolean));
    if (atuais.has(valor)) atuais.delete(valor);
    else atuais.add(valor);
    aplicar({ [chave]: [...atuais].join(",") });
  }

  const marcado = (chave: string, valor: string) =>
    (params.get(chave) ?? "").split(",").filter(Boolean).includes(valor);

  const ativos = ["categoria", "marca", "condicao", "voltagem", "preco_min", "preco_max", "estoque"]
    .map((chave) => ({ chave, valor: params.get(chave) }))
    .filter((f) => f.valor);

  function limparTudo() {
    const novos = new URLSearchParams();
    const busca = params.get("q");
    if (busca) novos.set("q", busca);
    iniciar(() => router.push(`${pathname}?${novos.toString()}`, { scroll: false }));
  }

  const painel = (
    <div className="space-y-7">
      {!travarCategoria && grupos.categorias.length > 0 ? (
        <Grupo titulo="Categoria">
          {grupos.categorias.map((opcao) => (
            <Caixa
              key={opcao.valor}
              rotulo={opcao.rotulo}
              quantidade={opcao.quantidade}
              marcado={marcado("categoria", opcao.valor)}
              aoMudar={() => alternar("categoria", opcao.valor)}
            />
          ))}
        </Grupo>
      ) : null}

      {!travarCondicao ? (
        <Grupo titulo="Condição">
          {grupos.condicoes.map((opcao) => (
            <Caixa
              key={opcao.valor}
              rotulo={opcao.rotulo}
              quantidade={opcao.quantidade}
              marcado={marcado("condicao", opcao.valor)}
              aoMudar={() => alternar("condicao", opcao.valor)}
            />
          ))}
        </Grupo>
      ) : null}

      {/* em /marcas/[slug] a marca já é o recorte da rota: mostrar o grupo
          deixava a pessoa marcar outra marca sem efeito nenhum */}
      {!travarMarca && grupos.marcas.length > 0 ? (
        <Grupo titulo="Marca">
          {grupos.marcas.map((opcao) => (
            <Caixa
              key={opcao.valor}
              rotulo={opcao.rotulo}
              quantidade={opcao.quantidade}
              marcado={marcado("marca", opcao.valor)}
              aoMudar={() => alternar("marca", opcao.valor)}
            />
          ))}
        </Grupo>
      ) : null}

      {grupos.voltagens.length > 0 ? (
        <Grupo titulo="Voltagem">
          {grupos.voltagens.map((opcao) => (
            <Caixa
              key={opcao.valor}
              rotulo={opcao.rotulo}
              marcado={marcado("voltagem", opcao.valor)}
              aoMudar={() => alternar("voltagem", opcao.valor)}
            />
          ))}
        </Grupo>
      ) : null}

      <Grupo titulo="Preço">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const dados = new FormData(e.currentTarget);
            const min = String(dados.get("min") ?? "");
            const max = String(dados.get("max") ?? "");
            aplicar({
              preco_min: min ? String(paraCentavos(min)) : null,
              preco_max: max ? String(paraCentavos(max)) : null,
            });
          }}
        >
          <input
            name="min"
            inputMode="decimal"
            placeholder="mín."
            aria-label="Preço mínimo"
            defaultValue={
              params.get("preco_min") ? formatarPreco(Number(params.get("preco_min"))).replace("R$ ", "") : ""
            }
            className="h-10 w-full min-w-0 rounded-lg border border-graf-300 px-3 text-sm focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
          />
          <span className="text-graf-500" aria-hidden>
            —
          </span>
          <input
            name="max"
            inputMode="decimal"
            placeholder="máx."
            aria-label="Preço máximo"
            defaultValue={
              params.get("preco_max") ? formatarPreco(Number(params.get("preco_max"))).replace("R$ ", "") : ""
            }
            className="h-10 w-full min-w-0 rounded-lg border border-graf-300 px-3 text-sm focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
          />
          <Botao type="submit" variante="secundario" tamanho="sm" className="shrink-0">
            OK
          </Botao>
        </form>
        <p className="mt-2 text-xs text-graf-500">
          No catálogo: de {formatarPreco(grupos.faixaPreco.minCents)} a{" "}
          {formatarPreco(grupos.faixaPreco.maxCents)}
        </p>
      </Grupo>

      <Grupo titulo="Disponibilidade">
        <Caixa
          rotulo="Somente em estoque"
          marcado={params.get("estoque") === "1"}
          aoMudar={() => aplicar({ estoque: params.get("estoque") === "1" ? null : "1" })}
        />
      </Grupo>
    </div>
  );

  return (
    <>
      {/* Barra de resultado e ordenação */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graf-600" aria-live="polite">
          {pendente ? (
            "Atualizando…"
          ) : (
            <>
              <span className="font-semibold text-graf-900">{total}</span>{" "}
              {total === 1 ? "item encontrado" : "itens encontrados"}
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className={classesBotao("secundario", "sm", "lg:hidden")}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            {ativos.length > 0 ? (
              <span className="ml-1 rounded-full bg-jb-500 px-1.5 text-[11px] font-bold text-white">
                {ativos.length}
              </span>
            ) : null}
          </button>

          <label className="flex items-center gap-2 text-sm text-graf-600">
            <span className="hidden sm:inline">Ordenar por</span>
            <select
              value={params.get("ordem") ?? "relevancia"}
              onChange={(e) => aplicar({ ordem: e.target.value })}
              className="h-10 rounded-lg border border-graf-300 bg-white px-3 pr-8 text-sm focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
            >
              {ORDENS.map((ordem) => (
                <option key={ordem.valor} value={ordem.valor}>
                  {ordem.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {ativos.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {ativos.map((filtro) => (
            <button
              key={filtro.chave}
              type="button"
              onClick={() => aplicar({ [filtro.chave]: null })}
              className="inline-flex items-center gap-1.5 rounded-full border border-graf-300 bg-white px-3 py-1.5 text-xs font-medium text-graf-700 hover:border-graf-400"
            >
              {rotuloFiltro(filtro.chave, filtro.valor!, grupos)}
              <X className="size-3" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={limparTudo}
            className="text-xs font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
          >
            limpar tudo
          </button>
        </div>
      ) : null}

      {/* Painel lateral — desktop */}
      <div className="hidden lg:block">{painel}</div>

      {/* Painel em gaveta — mobile */}
      {aberto ? (
        <div className="fixed inset-0 z-70 lg:hidden">
          <div
            className="absolute inset-0 bg-graf-950/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-[min(22rem,92vw)] flex-col bg-white"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-graf-200 px-4">
              <p className="font-bold text-graf-950">Filtros</p>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar filtros"
                className="flex size-10 items-center justify-center rounded-lg hover:bg-graf-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{painel}</div>
            <div className="shrink-0 border-t border-graf-200 p-4">
              <Botao onClick={() => setAberto(false)} larguraTotal>
                Ver {total} {total === 1 ? "item" : "itens"}
              </Botao>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function rotuloFiltro(chave: string, valor: string, grupos: GruposFiltro) {
  if (chave === "preco_min") return `a partir de ${formatarPreco(Number(valor))}`;
  if (chave === "preco_max") return `até ${formatarPreco(Number(valor))}`;
  if (chave === "estoque") return "em estoque";

  const fonte =
    chave === "categoria"
      ? grupos.categorias
      : chave === "marca"
        ? grupos.marcas
        : chave === "condicao"
          ? grupos.condicoes
          : grupos.voltagens;

  return valor
    .split(",")
    .map((v) => fonte.find((o) => o.valor === v)?.rotulo ?? v)
    .join(", ");
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-graf-900">{titulo}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Caixa({
  rotulo,
  quantidade,
  marcado,
  aoMudar,
}: {
  rotulo: string;
  quantidade?: number;
  marcado: boolean;
  aoMudar: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-graf-50",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
      )}
    >
      <input
        type="checkbox"
        checked={marcado}
        onChange={aoMudar}
        className="size-4 shrink-0 rounded border-graf-300 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
      />
      <span className={cn("flex-1", marcado ? "font-semibold text-graf-900" : "text-graf-700")}>
        {rotulo}
      </span>
      {quantidade !== undefined ? (
        <span className="text-xs tabular text-graf-500">{quantidade}</span>
      ) : null}
    </label>
  );
}
