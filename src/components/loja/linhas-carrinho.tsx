"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { alterarQuantidade, removerDoCarrinho } from "@/app/acoes/carrinho";
import { CONDICAO } from "@/components/loja/card-produto";
import { Botao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";
import type { LinhaCarrinho } from "@/lib/carrinho";

export function LinhasCarrinho({ linhas }: { linhas: LinhaCarrinho[] }) {
  const [pendente, iniciar] = useTransition();

  return (
    <ul className="overflow-hidden rounded-xl border border-graf-200 bg-white">
      {linhas.map((linha, indice) => {
        const condicao = linha.condicao
          ? CONDICAO[linha.condicao as keyof typeof CONDICAO]
          : null;
        const maximo = linha.unico ? 1 : Math.max(1, linha.estoqueDisponivel);
        const noLimite = !linha.unico && linha.quantidade >= maximo;
        const estoqueConhecido = linha.estoqueDisponivel > 0 && linha.estoqueDisponivel < 9999;

        return (
          <li
            key={linha.id}
            className={cn(
              "p-4 sm:p-5",
              indice > 0 && "border-t border-graf-200",
              !linha.disponivel && "bg-graf-50/80",
            )}
          >
            <div className="flex gap-3.5 sm:gap-5">
              <div
                data-palco-imagem-produto
                className={cn(
                  "relative size-24 shrink-0 overflow-hidden rounded-lg bg-graf-50 sm:size-28",
                  !linha.disponivel && "opacity-60",
                )}
              >
                {linha.imagem ? (
                  <Image
                    data-imagem-produto
                    src={imagemProdutoSemFundo(linha.imagem)}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 112px, 96px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-graf-500">
                    <ImageOff className="size-6" aria-hidden />
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3.5">
                <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
                  <div className="min-w-0 flex-1 basis-44">
                    {linha.marca ? (
                      <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-graf-500">
                        {linha.marca}
                      </p>
                    ) : null}

                    <h3 className="mt-0.5 text-[0.9375rem] font-bold leading-5 text-graf-950 sm:text-base">
                      {linha.slug ? (
                        <Link
                          href={`/loja/${linha.slug}`}
                          className="foco-jb rounded-sm transition-colors hover:text-jb-700"
                        >
                          {linha.nome}
                        </Link>
                      ) : (
                        linha.nome
                      )}
                    </h3>

                    {condicao || !linha.disponivel ? (
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {condicao ? <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta> : null}
                        {!linha.disponivel ? <Etiqueta tom="alerta">Indisponível</Etiqueta> : null}
                      </span>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    {linha.disponivel ? (
                      <>
                        <p className="text-lg font-extrabold tabular leading-none text-graf-950">
                          {formatarPreco(linha.totalCents)}
                        </p>
                        {linha.quantidade > 1 ? (
                          <p className="mt-1 text-[0.75rem] text-graf-500">
                            {formatarPreco(linha.precoUnitarioCents)} cada
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-graf-500">Sem preço</p>
                    )}
                  </div>
                </div>

                {linha.addons.length > 0 ? (
                  <ul className="space-y-1 border-l-2 border-graf-200 pl-3">
                    {linha.addons.map((addon) => (
                      <li key={addon.id} className="flex justify-between gap-4 text-[0.8125rem] text-graf-600">
                        <span className="min-w-0">{addon.nome}</span>
                        <span className="shrink-0 tabular">
                          {addon.precoUnitarioCents > 0 ? formatarPreco(addon.totalCents) : "sob orçamento"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {linha.disponivel ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                    {linha.unico ? (
                      <p className="text-[0.8125rem] leading-5 text-graf-600">
                        <span className="font-semibold text-graf-900">Unidade única.</span> Esta é a única unidade disponível deste produto.
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-lg border border-graf-300 bg-white">
                          <button
                            type="button"
                            disabled={pendente || linha.quantidade <= 1}
                            aria-label={`Diminuir a quantidade de ${linha.nome}`}
                            onClick={() =>
                              iniciar(async () => {
                                await alterarQuantidade(linha.id, linha.quantidade - 1);
                              })
                            }
                            className="foco-jb flex size-11 items-center justify-center rounded-l-lg text-graf-700 hover:bg-graf-50 disabled:text-graf-400 disabled:hover:bg-transparent"
                          >
                            <Minus className="size-4" aria-hidden />
                          </button>
                          <span
                            aria-live="polite"
                            className="w-10 border-x border-graf-200 text-center text-sm font-bold tabular leading-[2.75rem] text-graf-950"
                          >
                            <span className="sr-only">Quantidade de {linha.nome}: </span>
                            {linha.quantidade}
                          </span>
                          <button
                            type="button"
                            disabled={pendente || noLimite}
                            aria-label={`Aumentar a quantidade de ${linha.nome}`}
                            onClick={() =>
                              iniciar(async () => {
                                await alterarQuantidade(linha.id, linha.quantidade + 1);
                              })
                            }
                            className="foco-jb flex size-11 items-center justify-center rounded-r-lg text-graf-700 hover:bg-graf-50 disabled:text-graf-400 disabled:hover:bg-transparent"
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </div>

                        {noLimite && estoqueConhecido ? (
                          <p className="text-[0.75rem] leading-5 text-graf-500">
                            {linha.estoqueDisponivel === 1
                              ? "Última unidade"
                              : `${plural(linha.estoqueDisponivel, "unidade", "unidades")} disponíveis`}
                          </p>
                        ) : null}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() =>
                        iniciar(async () => {
                          await removerDoCarrinho(linha.id);
                          toast.success("Item removido do carrinho.");
                        })
                      }
                      className="foco-jb inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-graf-500 transition-colors hover:bg-graf-50 hover:text-jb-700 disabled:opacity-50 sm:ml-auto"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remover
                      <span className="sr-only"> {linha.nome} do carrinho</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-graf-200 pt-3">
                    <p className="min-w-0 flex-1 text-[0.8125rem] leading-5 text-graf-600">
                      Este produto saiu do catálogo depois de entrar no carrinho. Remova para continuar ou fale com a JB sobre uma alternativa.
                    </p>
                    <Botao
                      type="button"
                      variante="perigo"
                      tamanho="sm"
                      disabled={pendente}
                      onClick={() =>
                        iniciar(async () => {
                          await removerDoCarrinho(linha.id);
                          toast.success("Item removido do carrinho.");
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remover
                      <span className="sr-only"> {linha.nome} do carrinho</span>
                    </Botao>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
