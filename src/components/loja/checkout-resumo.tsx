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

/* ============================================================================
   Resumo do pedido no checkout
   Os números dos itens chegam prontos do servidor (calcularTotais sobre o
   carrinho do banco). O frete chega do mesmo lugar, pela ação consultarFrete.
   Este componente só soma uma coisa: itens + frete — e só quando o frete já
   tem valor fechado.

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

/* ---------------------------------------------------- frete compartilhado */

/**
 * O frete é escolhido no formulário e exibido aqui — e os dois são irmãos na
 * página, montados lado a lado pelo Server Component do checkout. Sem um pai
 * comum em que pendurar estado, o caminho é uma loja externa mínima: o
 * formulário publica, o resumo assina.
 *
 * `useSyncExternalStore` em vez de um evento no `window` porque é ele que
 * garante a leitura consistente durante a renderização concorrente — e porque
 * o React reclama, com razão, de estado externo lido sem assinatura.
 */
export type EstadoFrete = {
  frete: FreteExibido | null;
  carregando: boolean;
};

export const FRETE_VAZIO: EstadoFrete = { frete: null, carregando: false };

let estadoFrete: EstadoFrete = FRETE_VAZIO;
const ouvintes = new Set<() => void>();

/** Chamado pelo formulário de checkout a cada resposta do servidor. */
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

// no servidor não há CEP digitado ainda; devolver sempre o mesmo objeto evita
// laço de renderização e diferença na hidratação
function lerFreteNoServidor() {
  return FRETE_VAZIO;
}

function useFrete() {
  return useSyncExternalStore(assinarFrete, lerFrete, lerFreteNoServidor);
}

/** "até 5 dias úteis" — o prazo cadastrado na faixa, quando existe. */
export function textoDoPrazo(dias: number | null): string {
  if (dias === null || dias <= 0) return "";
  return `até ${plural(dias, "dia útil", "dias úteis")}`;
}

/**
 * Quanto do frete entra no total.
 *
 * Frete ainda por orçar vale zero na conta — e a tela precisa dizer isso com
 * todas as letras, senão "R$ 0,00" na linha do frete lê-se como "de graça".
 */
export function freteQueSoma(frete: FreteExibido | null): number {
  return frete && !frete.orcadoDepois ? frete.valorCents : 0;
}

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

/** A linha do frete, com os quatro estados que ela realmente tem. */
function ValorDoFrete({ frete, carregando }: EstadoFrete) {
  if (carregando) {
    return <dd className="text-right text-xs leading-snug text-graf-500">calculando…</dd>;
  }

  if (!frete) {
    return (
      <dd className="text-right text-xs leading-snug text-graf-500">
        informe o CEP na etapa de entrega
      </dd>
    );
  }

  if (frete.orcadoDepois) {
    return (
      <dd className="max-w-44 text-right text-xs leading-snug text-warn-700">
        a combinar — a JB envia o valor antes de despachar
      </dd>
    );
  }

  const prazo = textoDoPrazo(frete.prazoDias);

  return (
    <dd className="text-right">
      <span
        className={
          frete.valorCents === 0
            ? "text-sm font-semibold text-ok-700"
            : "text-sm font-semibold tabular text-graf-900"
        }
      >
        {frete.valorCents === 0 ? "Grátis" : formatarPreco(frete.valorCents)}
      </span>
      {prazo ? <span className="block text-xs leading-snug text-graf-500">{prazo}</span> : null}
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
            <dd className="font-semibold tabular text-ok-700">
              − {formatarPreco(descontoCents)}
            </dd>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <dt className="text-graf-600">
            Frete
            {frete && !frete.orcadoDepois ? (
              <span className="block text-xs leading-snug text-graf-500">{frete.rotulo}</span>
            ) : null}
          </dt>
          <ValorDoFrete frete={frete} carregando={carregando} />
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-graf-200 pt-4">
        <span className="text-sm font-bold text-graf-900">Total</span>
        <span className="text-2xl font-extrabold tracking-tight tabular text-graf-950">
          {formatarPreco(total)}
        </span>
      </div>

      {frete?.orcadoDepois ? (
        <p className="mt-2 text-xs leading-relaxed text-graf-600">
          O frete não está neste total. A JB confere as dimensões do equipamento e o endereço, e
          combina o valor com você antes de despachar.
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
              {frete?.orcadoDepois ? " · frete à parte" : null}
            </p>
            <p className="text-lg font-extrabold tabular leading-tight text-graf-950">
              {formatarPreco(total)}
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
