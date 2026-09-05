"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Receipt } from "lucide-react";

import { Botao } from "@/components/ui/button";
import { Cartao } from "@/components/ui/data";
import { PainelLateral } from "@/components/ui/painel";
import { formatarPreco, plural } from "@/lib/format";
import type { LinhaCarrinho } from "@/lib/carrinho";

/* ============================================================================
   Resumo do pedido no checkout
   Os números chegam prontos do servidor (calcularTotais sobre o carrinho do
   banco). Este componente não soma nada: se somasse, existiria um segundo
   lugar onde o preço pode divergir.

   No desktop fica fixo ao lado do formulário. No mobile vira uma barra no pé
   da tela com o total sempre visível e uma gaveta com o detalhamento — em
   360px, empurrar a lista de itens para cima do formulário só afastaria a
   pessoa do que ela precisa preencher.
   ============================================================================ */

type Props = {
  linhas: LinhaCarrinho[];
  subtotalCents: number;
  descontoCents: number;
  cupomCodigo: string;
  totalCents: number;
};

function Itens({ linhas }: { linhas: LinhaCarrinho[] }) {
  return (
    <ul className="space-y-3">
      {linhas.map((linha) => (
        <li key={linha.id} className="flex gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-graf-200 bg-graf-50">
            {linha.imagem ? (
              <Image src={linha.imagem} alt="" fill sizes="56px" className="object-contain p-1" />
            ) : (
              <span className="flex size-full items-center justify-center text-graf-300">
                <ImageOff className="size-4" aria-hidden />
              </span>
            )}
            <span
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-graf-800 text-[11px] font-bold tabular text-white"
              aria-hidden
            >
              {linha.quantidade}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-2 text-sm font-semibold leading-snug text-graf-900">
              {linha.nome}
            </p>
            <p className="sr-only">Quantidade: {linha.quantidade}</p>
            {linha.addons.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {linha.addons.map((addon) => (
                  <li key={addon.id} className="text-xs text-graf-500">
                    + {addon.nome}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="shrink-0 text-sm font-bold tabular text-graf-950">
            {formatarPreco(linha.totalCents)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Totais({
  subtotalCents,
  descontoCents,
  cupomCodigo,
  totalCents,
}: Omit<Props, "linhas">) {
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
            <dd className="font-semibold tabular text-ok-700">
              − {formatarPreco(descontoCents)}
            </dd>
          </div>
        ) : null}

        <div className="flex justify-between gap-4">
          <dt className="text-graf-600">Frete</dt>
          <dd className="text-right text-xs leading-snug text-graf-500">
            combinado após o pedido
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-graf-200 pt-4">
        <span className="text-sm font-bold text-graf-900">Total</span>
        <span className="text-2xl font-extrabold tracking-tight tabular text-graf-950">
          {formatarPreco(totalCents)}
        </span>
      </div>
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

  return (
    <>
      {/* ------------------------------------------------------- desktop */}
      <Cartao className="hidden p-5 lg:sticky lg:top-28 lg:block">
        <h2 className="text-base font-bold text-graf-950">
          Resumo do pedido
          <span className="ml-2 text-sm font-medium text-graf-500">
            {plural(quantidade, "item", "itens")}
          </span>
        </h2>

        <div className="mt-4 max-h-80 overflow-y-auto pr-1">
          <Itens linhas={linhas} />
        </div>

        <div className="mt-5 border-t border-graf-200 pt-4">
          <Totais
            subtotalCents={subtotalCents}
            descontoCents={descontoCents}
            cupomCodigo={cupomCodigo}
            totalCents={totalCents}
          />
        </div>

        <Link
          href="/carrinho"
          className="mt-4 block text-center text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700"
        >
          Editar carrinho
        </Link>
      </Cartao>

      {/* -------------------------------------------------------- mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-4 py-3 shadow-raised backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-graf-500">
              Total · {plural(quantidade, "item", "itens")}
            </p>
            <p className="text-lg font-extrabold tabular leading-tight text-graf-950">
              {formatarPreco(totalCents)}
            </p>
          </div>
          <Botao type="button" variante="secundario" onClick={() => setGaveta(true)}>
            <Receipt className="size-4" aria-hidden />
            Ver resumo
          </Botao>
        </div>
      </div>

      <PainelLateral
        aberto={gaveta}
        aoFechar={() => setGaveta(false)}
        titulo="Resumo do pedido"
        descricao={`${plural(quantidade, "item", "itens")} no carrinho`}
        tamanho="sm"
        rodape={
          <div className="flex w-full items-center justify-between gap-4">
            <Link
              href="/carrinho"
              className="text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700"
            >
              Editar carrinho
            </Link>
            <Botao type="button" variante="secundario" onClick={() => setGaveta(false)}>
              Voltar ao pedido
            </Botao>
          </div>
        }
      >
        <Itens linhas={linhas} />
        <div className="mt-5 border-t border-graf-200 pt-4">
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
