"use client";

import { useActionState, useMemo, useState } from "react";
import { Boxes, Plus, Search } from "lucide-react";

import {
  salvarRelacionamentosTipados,
  type EstadoRelacionamentos,
} from "@/app/acoes/admin-relacionamentos";
import { ListaEditavel } from "@/components/admin/catalogo/lista-editavel";
import { BarraSalvar, Bloco, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Selecao } from "@/components/ui/form";
import {
  AJUDA_TIPO_RELACAO,
  ROTULO_TIPO_RELACAO,
  TIPOS_RELACAO_PRODUTO,
  type TipoRelacaoProduto,
} from "@/lib/marketplace/relacionamentos-produto";
import { cn } from "@/lib/utils";

export type ProdutoCrossSell = {
  id: string;
  nome: string;
  sku: string;
  condicao: string;
};

export type LinhaCrossSell = {
  targetId: string;
  tipo: TipoRelacaoProduto;
};

export function FormularioCrossSellTipado({
  produtoId,
  iniciais,
  catalogo,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: LinhaCrossSell[];
  catalogo: ProdutoCrossSell[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoRelacionamentos, FormData>(
    salvarRelacionamentosTipados,
    {},
  );
  const [linhas, setLinhas] = useState<LinhaCrossSell[]>(iniciais);
  const [busca, setBusca] = useState("");

  const porId = useMemo(() => new Map(catalogo.map((produto) => [produto.id, produto])), [catalogo]);
  const escolhidos = useMemo(() => new Set(linhas.map((linha) => linha.targetId)), [linhas]);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");

  const sugestoes = useMemo(() => {
    if (termo.length < 2) return [];
    return catalogo
      .filter(
        (produto) =>
          produto.id !== produtoId &&
          !escolhidos.has(produto.id) &&
          (produto.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
            produto.sku.toLocaleLowerCase("pt-BR").includes(termo)),
      )
      .slice(0, 10);
  }, [catalogo, escolhidos, produtoId, termo]);

  const contagem = TIPOS_RELACAO_PRODUTO.reduce(
    (acc, tipo) => ({ ...acc, [tipo]: linhas.filter((linha) => linha.tipo === tipo).length }),
    {} as Record<TipoRelacaoProduto, number>,
  );

  return (
    <Bloco
      titulo="Cross-sell e alternativas"
      descricao="Diga por que cada produto está relacionado. A loja usa isso para separar comparação, acessórios e itens que funcionam melhor juntos."
    >
      <form action={enviar} className="space-y-6">
        <input type="hidden" name="id" value={produtoId} />
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(linhas.map(({ targetId, tipo }) => ({ targetId, tipo })))}
        />
        <RegiaoEstado estado={estado} />

        <div className="grid gap-3 sm:grid-cols-3">
          {TIPOS_RELACAO_PRODUTO.map((tipo) => (
            <div key={tipo} className="rounded-xl border border-graf-200 bg-graf-50/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-graf-900">{ROTULO_TIPO_RELACAO[tipo]}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold tabular text-graf-600">
                  {contagem[tipo]}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-graf-500">{AJUDA_TIPO_RELACAO[tipo]}</p>
            </div>
          ))}
        </div>

        {!somenteLeitura ? (
          <div>
            <label htmlFor="busca-cross-sell" className="mb-1.5 block text-sm font-semibold text-graf-800">
              Adicionar produto
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                aria-hidden
              />
              <input
                id="busca-cross-sell"
                type="search"
                autoComplete="off"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Busque por nome ou SKU"
                className={cn(
                  "h-11 w-full rounded-lg border border-graf-450 bg-white pl-10 pr-3 text-base text-graf-900 shadow-xs sm:text-sm",
                  "placeholder:text-graf-500 hover:border-graf-500",
                  "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
                )}
              />
            </div>

            {termo.length >= 2 ? (
              sugestoes.length > 0 ? (
                <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                  {sugestoes.map((produto) => (
                    <li key={produto.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setLinhas((atual) => [
                            ...atual,
                            { targetId: produto.id, tipo: "alternativa" },
                          ]);
                          setBusca("");
                        }}
                        className="foco-jb flex min-h-12 w-full items-center gap-3 rounded-xl border border-graf-200 bg-white px-3 py-2 text-left transition-colors hover:border-jb-300 hover:bg-jb-50/40"
                      >
                        <Plus className="size-4 shrink-0 text-jb-600" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-graf-900">{produto.nome}</span>
                          <span className="block truncate text-xs text-graf-500">
                            {produto.sku} · {produto.condicao}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-graf-500">Nenhum produto disponível com esse termo.</p>
              )
            ) : null}
          </div>
        ) : null}

        <ListaEditavel<LinhaCrossSell>
          itens={linhas}
          aoMudar={setLinhas}
          desabilitado={somenteLeitura}
          nomeDaLinha="relação"
          rotuloAdicionar="Adicionar"
          ocultarAdicionar
          vazio="Nenhum cross-sell configurado. Busque um produto acima."
          novoItem={() => ({ targetId: "", tipo: "alternativa" })}
          renderizar={(linha, _indice, atualizar) => {
            const produto = porId.get(linha.targetId);
            return (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-end">
                <div className="flex min-h-11 items-center gap-3 rounded-lg bg-graf-50/55 px-3 py-2">
                  <Boxes className="size-4 shrink-0 text-graf-500" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-graf-900">
                      {produto?.nome ?? "Produto não encontrado"}
                    </span>
                    {produto ? (
                      <span className="block truncate text-xs text-graf-500">
                        {produto.sku} · {produto.condicao}
                      </span>
                    ) : null}
                  </span>
                </div>

                <Selecao
                  rotulo="Papel na compra"
                  value={linha.tipo}
                  onChange={(evento) =>
                    atualizar({ tipo: evento.target.value as TipoRelacaoProduto })
                  }
                >
                  {TIPOS_RELACAO_PRODUTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ROTULO_TIPO_RELACAO[tipo]}
                    </option>
                  ))}
                </Selecao>
              </div>
            );
          }}
        />

        {!somenteLeitura ? (
          <BarraSalvar ajuda="A ordem dentro de cada tipo define a prioridade exibida na loja.">
            <Botao type="submit" carregando={enviando}>
              Salvar cross-sell
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
