import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { CampoCupom } from "@/components/loja/campo-cupom";
import { LinhasCarrinho } from "@/components/loja/linhas-carrinho";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Trilha, Vazio } from "@/components/ui/data";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { calcularParcelas, formatarPreco } from "@/lib/format";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

export default async function CarrinhoPage() {
  const carrinho = await lerCarrinho();
  const totais = calcularTotais(carrinho);
  const parcelas = calcularParcelas(totais.totalCents);

  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Carrinho" }]} className="mb-5" />
      <h1 className="text-display leading-tight">Carrinho</h1>

      {totais.linhas.length === 0 ? (
        <Vazio
          icone={ShoppingCart}
          titulo="Seu carrinho está vazio"
          descricao="Escolha um equipamento no catálogo ou peça um orçamento — boa parte do que a JB atende é sob consulta."
          acao={
            <div className="flex flex-wrap justify-center gap-3">
              <LinkBotao href="/loja">Ver equipamentos</LinkBotao>
              <LinkBotao href="/orcamento" variante="secundario">
                Pedir orçamento
              </LinkBotao>
            </div>
          }
          className="mt-8"
        />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10">
          <LinhasCarrinho linhas={totais.linhas} />

          <Cartao className="p-5 lg:sticky lg:top-28">
            <h2 className="text-base font-bold text-graf-950">Resumo</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Subtotal</dt>
                <dd className="font-semibold tabular text-graf-900">
                  {formatarPreco(totais.subtotalCents)}
                </dd>
              </div>

              {totais.descontoCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">
                    Desconto{" "}
                    <span className="label-mono text-graf-500">{totais.cupomCodigo}</span>
                  </dt>
                  <dd className="font-semibold tabular text-ok-700">
                    − {formatarPreco(totais.descontoCents)}
                  </dd>
                </div>
              ) : null}

              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Frete</dt>
                <dd className="text-right text-xs leading-snug text-graf-500">
                  calculado na
                  <br />
                  próxima etapa
                </dd>
              </div>
            </dl>

            {totais.cupomErro ? (
              <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn-700">
                {totais.cupomErro}
              </p>
            ) : null}

            <CampoCupom aplicado={totais.cupomCodigo} />

            <div className="mt-4 flex items-baseline justify-between border-t border-graf-200 pt-4">
              <span className="text-sm font-bold text-graf-900">Total</span>
              <span className="text-2xl font-extrabold tracking-tight text-graf-950">
                {formatarPreco(totais.totalCents)}
              </span>
            </div>
            {parcelas ? (
              <p className="mt-1 text-right text-xs text-graf-500">
                em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </p>
            ) : null}

            <LinkBotao href="/checkout" tamanho="lg" larguraTotal className="mt-5">
              Finalizar compra
            </LinkBotao>

            <Link
              href="/loja"
              className="mt-3 block text-center text-sm font-semibold text-graf-600 hover:text-jb-700"
            >
              Continuar comprando
            </Link>

            <p className="mt-4 text-center text-xs leading-relaxed text-graf-500">
              Os valores são recalculados no servidor ao fechar o pedido.
            </p>
          </Cartao>
        </div>
      )}
    </div>
  );
}
