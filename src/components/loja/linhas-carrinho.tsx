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
import { cn } from "@/lib/utils";
import type { LinhaCarrinho } from "@/lib/carrinho";

/* ============================================================================
   Lista de itens do carrinho

   Cada linha responde três perguntas sem que a pessoa precise clicar: o que
   é, quanto custa este item no total e o que dá para fazer com ele. O preço
   unitário só aparece quando há mais de uma unidade — repetir o mesmo número
   duas vezes numa linha só rouba atenção do que importa.

   Item que saiu do catálogo depois de entrar no carrinho continua visível,
   mas apagado: sem preço, sem controle de quantidade e com o botão de
   remover em destaque, que é o único caminho para seguir.
   ============================================================================ */

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
        // produto sem controle de estoque chega com 9999: aí não há número
        // real para mostrar, e dizer "última unidade" seria inventar
        const estoqueConhecido =
          linha.estoqueDisponivel > 0 && linha.estoqueDisponivel < 9999;

        return (
          <li
            key={linha.id}
            className={cn(
              "p-4 sm:p-6",
              indice > 0 && "border-t border-graf-200",
              !linha.disponivel && "bg-graf-50",
            )}
          >
            <div className="flex gap-4 sm:gap-6">
              {/* caixa de tamanho fixo: a imagem entra sem empurrar a linha,
                  então nada salta de lugar enquanto ela carrega. O respiro
                  interno é curto de propósito — quem compra equipamento decide
                  pela foto, e a foto precisa ocupar a moldura */}
              <div
                className={cn(
                  "relative size-24 shrink-0 overflow-hidden rounded-xl border border-graf-200 bg-white sm:size-32",
                  !linha.disponivel && "opacity-60",
                )}
              >
                {linha.imagem ? (
                  <Image
                    src={linha.imagem}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 128px, 96px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-graf-400">
                    <ImageOff className="size-6" aria-hidden />
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0 flex-1 basis-44">
                    {linha.marca ? (
                      <p className="text-[0.8125rem] font-bold uppercase tracking-wider text-graf-500">
                        {linha.marca}
                      </p>
                    ) : null}

                    <h3 className="mt-0.5 text-base font-bold leading-snug text-graf-950 sm:text-lg">
                      {linha.slug ? (
                        <Link
                          href={`/loja/${linha.slug}`}
                          className="rounded-sm transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {linha.nome}
                        </Link>
                      ) : (
                        linha.nome
                      )}
                    </h3>

                    {condicao || !linha.disponivel ? (
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        {condicao ? (
                          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
                        ) : null}
                        {!linha.disponivel ? (
                          <Etiqueta tom="alerta">Saiu do catálogo</Etiqueta>
                        ) : null}
                      </span>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    {linha.disponivel ? (
                      <>
                        <p className="text-lg font-extrabold tabular leading-none text-graf-950 sm:text-xl">
                          {formatarPreco(linha.totalCents)}
                        </p>
                        {linha.quantidade > 1 ? (
                          <p className="mt-1.5 text-[0.8125rem] text-graf-500">
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
                  <ul className="space-y-1.5 border-l-2 border-jb-200 pl-3.5">
                    {linha.addons.map((addon) => (
                      <li
                        key={addon.id}
                        className="flex justify-between gap-4 text-sm text-graf-600"
                      >
                        <span className="min-w-0">{addon.nome}</span>
                        <span className="shrink-0 tabular">
                          {addon.precoUnitarioCents > 0
                            ? formatarPreco(addon.totalCents)
                            : "sob orçamento"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {linha.disponivel ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    {linha.unico ? (
                      <p className="text-sm text-graf-600">
                        <span className="font-semibold text-graf-900">Peça única.</span> Este
                        equipamento é o único em estoque.
                      </p>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* graf-450 é o degrau de borda que cumpre 3:1 — o
                            controle de quantidade é um controle de formulário,
                            não um enfeite */}
                        <div className="flex items-center rounded-lg border border-graf-450 bg-white shadow-xs">
                          <button
                            type="button"
                            disabled={pendente || linha.quantidade <= 1}
                            aria-label={`Diminuir a quantidade de ${linha.nome}`}
                            onClick={() =>
                              iniciar(async () => {
                                await alterarQuantidade(linha.id, linha.quantidade - 1);
                              })
                            }
                            className="flex size-11 items-center justify-center rounded-l-lg text-graf-700 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500 disabled:text-graf-400 disabled:hover:bg-transparent"
                          >
                            <Minus className="size-4" aria-hidden />
                          </button>
                          <span
                            aria-live="polite"
                            className="w-11 border-x border-graf-300 text-center text-base font-bold tabular leading-[2.75rem] text-graf-950"
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
                            className="flex size-11 items-center justify-center rounded-r-lg text-graf-700 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500 disabled:text-graf-400 disabled:hover:bg-transparent"
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </div>

                        {noLimite && estoqueConhecido ? (
                          <p className="text-[0.8125rem] leading-snug text-graf-500">
                            {linha.estoqueDisponivel === 1
                              ? "Última unidade em estoque"
                              : `${plural(linha.estoqueDisponivel, "unidade", "unidades")} em estoque`}
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
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-graf-600 transition-colors hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 disabled:opacity-50 sm:ml-auto"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remover
                      <span className="sr-only"> {linha.nome} do carrinho</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-white p-3.5 ring-1 ring-inset ring-jb-500/20">
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-graf-700">
                      Este equipamento saiu do catálogo depois de entrar no seu carrinho e não
                      entra no total. Remova para seguir, ou fale com a JB para saber de um
                      equivalente.
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
