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
    <ul className="space-y-4">
      {linhas.map((linha) => {
        const condicao = linha.condicao ? CONDICAO[linha.condicao as keyof typeof CONDICAO] : null;
        const maximo = linha.unico ? 1 : Math.max(1, linha.estoqueDisponivel);

        return (
          <li key={linha.id} className="rounded-2xl border border-graf-200 bg-white p-4 shadow-card sm:p-5 lg:p-6">
            <div className="flex gap-4 sm:gap-5">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-graf-200 bg-gradient-to-b from-white to-graf-50 sm:size-32">
                {linha.imagem ? (
                  <Image src={linha.imagem} alt="" fill sizes="128px" className="object-contain p-3" />
                ) : (
                  <span className="flex size-full items-center justify-center text-graf-300"><ImageOff className="size-6" aria-hidden /></span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {condicao ? <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta> : null}
                      {linha.marca ? <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-graf-400">{linha.marca}</span> : null}
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold leading-5 text-graf-950 sm:text-base">
                      {linha.slug ? <Link href={`/loja/${linha.slug}`} className="hover:text-jb-700">{linha.nome}</Link> : linha.nome}
                    </h3>
                    {linha.sku ? <p className="mt-1 label-mono text-[10px] text-graf-400">SKU {linha.sku}</p> : null}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-lg font-extrabold tracking-[-0.035em] text-graf-950">{formatarPreco(linha.totalCents)}</p>
                    {linha.quantidade > 1 ? <p className="mt-1 text-xs text-graf-500">{formatarPreco(linha.precoUnitarioCents)} por unidade</p> : null}
                  </div>
                </div>

                {linha.addons.length > 0 ? (
                  <div className="mt-4 rounded-xl bg-graf-50 p-3.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-graf-400">Serviços adicionados</p>
                    <ul className="mt-2 space-y-1.5">
                      {linha.addons.map((addon) => (
                        <li key={addon.id} className="flex justify-between gap-4 text-xs text-graf-600">
                          <span>+ {addon.nome}</span>
                          <span className="font-bold tabular text-graf-800">{addon.precoUnitarioCents > 0 ? formatarPreco(addon.totalCents) : "sob orçamento"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-graf-100 pt-4">
                  {linha.unico ? (
                    <span className="rounded-full bg-jb-50 px-3 py-1 text-xs font-bold text-jb-700">Unidade única</span>
                  ) : (
                    <div className="flex items-center rounded-xl border border-graf-300 bg-white">
                      <button type="button" disabled={pendente || linha.quantidade <= 1} aria-label={`Diminuir a quantidade de ${linha.nome}`} onClick={() => iniciar(async () => { await alterarQuantidade(linha.id, linha.quantidade - 1); })} className="flex size-10 items-center justify-center text-graf-600 disabled:opacity-35"><Minus className="size-3.5" /></button>
                      <span className="w-9 text-center text-sm font-extrabold tabular text-graf-950">{linha.quantidade}</span>
                      <button type="button" disabled={pendente || linha.quantidade >= maximo} aria-label={`Aumentar a quantidade de ${linha.nome}`} onClick={() => iniciar(async () => { await alterarQuantidade(linha.id, linha.quantidade + 1); })} className="flex size-10 items-center justify-center text-graf-600 disabled:opacity-35"><Plus className="size-3.5" /></button>
                    </div>
                  )}

                  <button type="button" disabled={pendente} onClick={() => iniciar(async () => { await removerDoCarrinho(linha.id); toast.success("Item removido do carrinho."); })} className="inline-flex items-center gap-1.5 text-xs font-bold text-graf-500 transition hover:text-jb-700 disabled:opacity-50"><Trash2 className="size-3.5" aria-hidden />Remover</button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
