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
          {/* a moldura recorta a foto; o selo de quantidade fica FORA dela,
              senão o `overflow-hidden` corta metade do círculo */}
          <div className="relative size-16 shrink-0">
            <div className="relative size-full overflow-hidden rounded-lg border border-graf-200 bg-white">
              {linha.imagem ? (
                <Image src={linha.imagem} alt="" fill sizes="64px" className="object-contain p-1" />
              ) : (
                <span className="flex size-full items-center justify-center text-graf-500">
                  <ImageOff className="size-4" aria-hidden />
                </span>
              )}
            </div>
            <span
              className="absolute -right-1.5 -top-1.5 flex size-[1.375rem] items-center justify-center rounded-full bg-graf-900 text-xs font-bold tabular text-white ring-2 ring-white"
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
                  <li key={addon.id} className="text-[0.8125rem] text-graf-500">
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
    return <dd className="text-right text-[0.8125rem] leading-snug text-graf-500">calculando…</dd>;
  }

  if (!frete) {
    return (
      <dd className="max-w-44 text-right text-[0.8125rem] leading-snug text-graf-500">
        informe o CEP na etapa de entrega
      </dd>
    );
  }

  if (frete.orcadoDepois) {
    return (
      <dd className="max-w-44 text-right text-[0.8125rem] leading-snug text-warn-700">
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
        {frete.valorCents === 0 ? "Sem custo" : formatarPreco(frete.valorCents)}
      </span>
      {prazo ? (
        <span className="block text-[0.8125rem] leading-snug text-graf-500">{prazo}</span>
      ) : null}
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
              <span className="block text-[0.8125rem] leading-snug text-graf-500">{frete.rotulo}</span>
            ) : null}
          </dt>
          <ValorDoFrete frete={frete} carregando={carregando} />
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-graf-200 pt-4">
        <span className="text-base font-bold text-graf-900">Total</span>
        <span className="text-2xl font-extrabold tracking-tight tabular text-graf-950">
          {formatarPreco(total)}
        </span>
      </div>

      {frete?.orcadoDepois ? (
        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-graf-600">
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
      <Cartao className="hidden p-5 sm:p-6 lg:sticky lg:top-28 lg:block">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold text-graf-950">Resumo do pedido</h2>
          <p className="text-sm text-graf-500">{plural(quantidade, "unidade", "unidades")}</p>
        </div>

        <div className="mt-5 max-h-80 overflow-y-auto pr-1">
          <Itens linhas={linhas} />
        </div>

        <div className="mt-5 border-t border-graf-200 pt-5">
          <Totais
            subtotalCents={subtotalCents}
            descontoCents={descontoCents}
            cupomCodigo={cupomCodigo}
            totalCents={totalCents}
          />
        </div>

        <Link
          href="/carrinho"
          className="mt-5 flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          Voltar e editar o carrinho
        </Link>
      </Cartao>

      {/* --------------------------------------------------------- mobile
          Barra fixa com o total sempre à vista e uma gaveta com o detalhe.
          Em 360px, empurrar a lista de itens para cima do formulário só
          afastaria a pessoa do que ela precisa preencher. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 shadow-raised backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-[0.8125rem] text-graf-500">
              Total · {plural(quantidade, "unidade", "unidades")}
              {frete?.orcadoDepois ? " · frete à parte" : null}
            </p>
            <p className="text-xl font-extrabold tabular leading-tight text-graf-950">
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
        descricao={`${plural(quantidade, "unidade", "unidades")} no carrinho`}
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
