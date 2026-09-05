"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { alterarQuantidade, removerDoCarrinho } from "@/app/acoes/carrinho";
import { CONDICAO } from "@/components/loja/card-produto";
import { Etiqueta } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";
import type { LinhaCarrinho } from "@/lib/carrinho";

export function LinhasCarrinho({ linhas }: { linhas: LinhaCarrinho[] }) {
  const [pendente, iniciar] = useTransition();

  return (
    <ul className="divide-y divide-graf-200 rounded-xl border border-graf-200 bg-white">
      {linhas.map((linha) => {
        const condicao = linha.condicao
          ? CONDICAO[linha.condicao as keyof typeof CONDICAO]
          : null;
        const maximo = linha.unico ? 1 : Math.max(1, linha.estoqueDisponivel);

        return (
          <li key={linha.id} className="p-4 sm:p-5">
            <div className="flex gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-graf-200 bg-graf-50 sm:size-24">
                {linha.imagem ? (
                  <Image
                    src={linha.imagem}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-graf-300">
                    <ImageOff className="size-5" aria-hidden />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    {linha.marca ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-graf-400">
                        {linha.marca}
                      </p>
                    ) : null}
                    <h3 className="text-sm font-bold leading-snug text-graf-900">
                      {linha.slug ? (
                        <Link href={`/loja/${linha.slug}`} className="hover:text-jb-700">
                          {linha.nome}
                        </Link>
                      ) : (
                        linha.nome
                      )}
                    </h3>
                    {condicao ? (
                      <span className="mt-1.5 inline-block">
                        <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
                      </span>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-base font-extrabold tabular text-graf-950">
                    {formatarPreco(linha.totalCents)}
                  </p>
                </div>

                {linha.addons.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-l-2 border-jb-200 pl-3">
                    {linha.addons.map((addon) => (
                      <li
                        key={addon.id}
                        className="flex justify-between gap-3 text-xs text-graf-600"
                      >
                        <span>+ {addon.nome}</span>
                        <span className="tabular">
                          {addon.precoUnitarioCents > 0
                            ? formatarPreco(addon.totalCents)
                            : "sob orçamento"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {linha.unico ? (
                    <span className="text-xs font-semibold text-jb-700">Unidade única</span>
                  ) : (
                    <div className="flex items-center rounded-lg border border-graf-300">
                      <button
                        type="button"
                        disabled={pendente || linha.quantidade <= 1}
                        aria-label={`Diminuir a quantidade de ${linha.nome}`}
                        onClick={() =>
                          iniciar(async () => {
                            await alterarQuantidade(linha.id, linha.quantidade - 1);
                          })
                        }
                        className="flex size-9 items-center justify-center text-graf-600 disabled:opacity-40"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold tabular text-graf-900">
                        {linha.quantidade}
                      </span>
                      <button
                        type="button"
                        disabled={pendente || linha.quantidade >= maximo}
                        aria-label={`Aumentar a quantidade de ${linha.nome}`}
                        onClick={() =>
                          iniciar(async () => {
                            await alterarQuantidade(linha.id, linha.quantidade + 1);
                          })
                        }
                        className="flex size-9 items-center justify-center text-graf-600 disabled:opacity-40"
                      >
                        <Plus className="size-3.5" />
                      </button>
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-graf-500 transition-colors hover:text-jb-700 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Remover
                  </button>

                  {linha.quantidade > 1 ? (
                    <span className="ml-auto text-xs text-graf-500">
                      {formatarPreco(linha.precoUnitarioCents)} cada
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
