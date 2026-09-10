"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Receipt } from "lucide-react";

import { Botao } from "@/components/ui/button";
import { Cartao } from "@/components/ui/data";
import { PainelLateral } from "@/components/ui/painel";
import { formatarPreco, plural } from "@/lib/format";
import type { LinhaCarrinho } from "@/lib/carrinho";
import type { FreteExibido } from "@/lib/frete";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

type Props = {
  linhas: LinhaCarrinho[];
  subtotalCents: number;
  descontoCents: number;
  cupomCodigo: string;
  totalCents: number;
};

export type EstadoFrete = {
  frete: FreteExibido | null;
  carregando: boolean;
};

export const FRETE_VAZIO: EstadoFrete = { frete: null, carregando: false };

let estadoFrete: EstadoFrete = FRETE_VAZIO;
const ouvintes = new Set<() => void>();

export function publicarFrete(proximo: EstadoFrete) {
  estadoFrete = proximo;
  for (const avisar of ouvintes) avisar();
}

function assinarFrete(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

function lerFrete() {
  return estadoFrete;
}

function lerFreteNoServidor() {
  return FRETE_VAZIO;
}

function useFrete() {
  return useSyncExternalStore(assinarFrete, lerFrete, lerFreteNoServidor);
}

export function textoDoPrazo(dias: number | null): string {
  if (dias === null || dias <= 0) return "";
  return `até ${plural(dias, "dia útil", "dias úteis")}`;
}

export function freteQueSoma(frete: FreteExibido | null): number {
  return frete && !frete.orcadoDepois ? frete.valorCents : 0;
}

function Itens({ linhas }: { linhas: LinhaCarrinho[] }) {
  return (
    <ul className="divide-y divide-graf-150">
      {linhas.map((linha) => (
        <li key={linha.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="relative size-14 shrink-0">
            <div data-palco-imagem-produto className="relative size-full overflow-hidden rounded-lg bg-graf-50">
              {linha.imagem ? (
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(linha.imagem)}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1.5"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-graf-500">
                  <ImageOff className="size-4" aria-hidden />
                </span>
              )}
            </div>
            {linha.quantidade > 1 ? (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-graf-900 text-[0.6875rem] font-bold tabular text-white ring-2 ring-white" aria-hidden>
                {linha.quantidade}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-5 text-graf-900">{linha.nome}</p>
            <p className="sr-only">Quantidade: {linha.quantidade}</p>
            {linha.addons.length > 0 ? (
              <p className="mt-0.5 line-clamp-1 text-[0.6875rem] text-graf-500">
                + {linha.addons.map((addon) => addon.nome).join(" · ")}
              </p>
            ) : null}
          </div>

          <p className="shrink-0 text-[0.8125rem] font-bold tabular text-graf-950">
            {formatarPreco(linha.totalCents)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ValorDoFrete({ frete, carregando }: EstadoFrete) {
  if (carregando) {
    return <dd className="text-right text-[0.8125rem] text-graf-500">calculando…</dd>;
  }

  if (!frete) {
    return <dd className="max-w-36 text-right text-[0.8125rem] leading-5 text-graf-500">informe o CEP na entrega</dd>;
  }

  if (frete.orcadoDepois) {
    return <dd className="max-w-36 text-right text-[0.8125rem] leading-5 text-warn-700">a combinar</dd>;
  }

  const prazo = textoDoPrazo(frete.prazoDias);

  return (
    <dd className="text-right">
      <span className={frete.valorCents === 0 ? "text-sm font-semibold text-ok-700" : "text-sm font-semibold tabular text-graf-900"}>
        {frete.valorCents === 0 ? "Sem custo" : formatarPreco(frete.valorCents)}
      </span>
      {prazo ? <span className="block text-[0.75rem] leading-5 text-graf-500">{prazo}</span> : null}
    </dd>
  );
}

function Totais({
  subtotalCents,
  descontoCents,
  cupomCodigo,
  totalCents,
}: Omit<Props, "linhas">) {
  const { frete, carregando } = useFrete();
  const total = totalCents + freteQueSoma(frete);

  return (
    <>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-graf-600">Subtotal</dt>
          <dd className="font-semibold tabular text-graf-900">{formatarPreco(subtotalCents)}</dd>
        </div>

        {descontoCents > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-graf-600">
              Desconto {cupomCodigo ? <span className="label-mono text-graf-500">{cupomCodigo}</span> : null}
            </dt>
            <dd className="font-semibold tabular text-ok-700">− {formatarPreco(descontoCents)}</dd>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <dt className="text-graf-600">
            Entrega
            {frete && !frete.orcadoDepois ? <span className="block max-w-36 text-[0.75rem] leading-5 text-graf-500">{frete.rotulo}</span> : null}
          </dt>
          <ValorDoFrete frete={frete} carregando={carregando} />
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-graf-200 pt-4">
        <span className="text-base font-bold text-graf-900">Total</span>
        <span className="text-2xl font-extrabold tracking-tight tabular text-graf-950">{formatarPreco(total)}</span>
      </div>

      {frete?.orcadoDepois ? (
        <p className="mt-2 text-[0.75rem] leading-5 text-graf-500">
          O frete será confirmado pela JB antes do despacho e não está incluído neste total.
        </p>
      ) : null}
    </>
  );
}

export function ResumoCheckout({
  linhas,
  subtotalCents,
  descontoCents,
  cupomCodigo,
  totalCents,
}: Props) {
  const [gaveta, setGaveta] = useState(false);
  const quantidade = linhas.reduce((soma, l) => soma + l.quantidade, 0);
  const { frete } = useFrete();
  const total = totalCents + freteQueSoma(frete);

  return (
    <>
      <Cartao className="hidden overflow-hidden p-0 lg:sticky lg:top-28 lg:block">
        <div className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-extrabold text-graf-950">Resumo</h2>
            <p className="text-[0.8125rem] text-graf-500">{plural(quantidade, "unidade", "unidades")}</p>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <Itens linhas={linhas} />
          </div>
        </div>

        <div className="border-t border-graf-150 bg-graf-50/45 p-5">
          <Totais
            subtotalCents={subtotalCents}
            descontoCents={descontoCents}
            cupomCodigo={cupomCodigo}
            totalCents={totalCents}
          />

          <Link
            href="/carrinho"
            className="foco-jb mt-4 flex min-h-10 items-center justify-center text-sm font-semibold text-graf-600 hover:text-jb-700"
          >
            Editar carrinho
          </Link>
        </div>
      </Cartao>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 shadow-raised backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-graf-500">Total do pedido</p>
            <p className="text-xl font-extrabold tabular leading-tight text-graf-950">{formatarPreco(total)}</p>
          </div>
          <Botao type="button" variante="secundario" onClick={() => setGaveta(true)}>
            <Receipt className="size-4" aria-hidden />
            Resumo
          </Botao>
        </div>
      </div>

      <PainelLateral
        aberto={gaveta}
        aoFechar={() => setGaveta(false)}
        titulo="Resumo do pedido"
        descricao={`${plural(quantidade, "unidade", "unidades")} no carrinho`}
        tamanho="sm"
        rodape={
          <div className="flex w-full items-center justify-between gap-4">
            <Link href="/carrinho" className="text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700">
              Editar carrinho
            </Link>
            <Botao type="button" variante="secundario" onClick={() => setGaveta(false)}>
              Voltar
            </Botao>
          </div>
        }
      >
        <Itens linhas={linhas} />
        <div className="mt-5 border-t border-graf-200 pt-5">
          <Totais
            subtotalCents={subtotalCents}
            descontoCents={descontoCents}
            cupomCodigo={cupomCodigo}
            totalCents={totalCents}
          />
        </div>
      </PainelLateral>
    </>
  );
}
