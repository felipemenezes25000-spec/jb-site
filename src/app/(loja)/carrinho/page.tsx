import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

import { LinhasCarrinho } from "@/components/loja/linhas-carrinho";
import { LinkBotao } from "@/components/ui/button";
import { Trilha, Vazio } from "@/components/ui/data";
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
    <>
      <section className="border-b border-graf-200 bg-graf-50/70">
        <div className="container-jb py-8 lg:py-10">
          <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Carrinho" }]} className="mb-5" />
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Sua compra</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-display leading-[1.04]">Carrinho</h1>
              <p className="mt-2 text-sm text-graf-600">Revise equipamentos, serviços adicionais e quantidades antes de continuar.</p>
            </div>
            {totais.quantidadeItens > 0 ? <p className="text-sm font-bold text-graf-500">{totais.quantidadeItens} {totais.quantidadeItens === 1 ? "item" : "itens"}</p> : null}
          </div>
        </div>
      </section>

      <div className="container-jb py-8 lg:py-12">
        {totais.linhas.length === 0 ? (
          <Vazio
            icone={ShoppingBag}
            titulo="Seu carrinho está vazio"
            descricao="Explore equipamentos novos, seminovos e recondicionados. Se não encontrar exatamente o que precisa, peça um orçamento à equipe."
            acao={<div className="flex flex-wrap justify-center gap-3"><LinkBotao href="/loja">Ver equipamentos</LinkBotao><LinkBotao href="/orcamento" variante="secundario">Pedir orçamento</LinkBotao></div>}
            className="mx-auto max-w-4xl py-20"
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-10 xl:gap-12">
            <div>
              <LinhasCarrinho linhas={totais.linhas} />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Link href="/loja" className="inline-flex items-center gap-2 text-sm font-extrabold text-graf-600 transition hover:text-jb-700">← Continuar comprando</Link>
                <Link href="/orcamento" className="text-sm font-extrabold text-jb-700 hover:text-jb-500">Precisa de ajuda com esta compra?</Link>
              </div>
            </div>

            <aside className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-raised lg:sticky lg:top-32">
              <div className="border-b border-graf-200 p-5 lg:p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-jb-600">Resumo do pedido</p>
                <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-graf-950">Sua seleção</h2>
              </div>

              <div className="p-5 lg:p-6">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-graf-600">Subtotal</dt><dd className="font-bold tabular text-graf-900">{formatarPreco(totais.subtotalCents)}</dd></div>
                  {totais.descontoCents > 0 ? <div className="flex justify-between gap-4"><dt className="text-graf-600">Desconto <span className="label-mono text-graf-400">{totais.cupomCodigo}</span></dt><dd className="font-bold tabular text-ok-700">− {formatarPreco(totais.descontoCents)}</dd></div> : null}
                  <div className="flex justify-between gap-4"><dt className="text-graf-600">Entrega / retirada</dt><dd className="text-right text-xs leading-5 text-graf-500">Definida na próxima etapa</dd></div>
                </dl>

                {totais.cupomErro ? <p className="mt-4 rounded-xl bg-warn-50 px-3.5 py-3 text-xs font-semibold leading-5 text-warn-700">{totais.cupomErro}</p> : null}

                <div className="mt-5 border-t border-graf-200 pt-5">
                  <div className="flex items-baseline justify-between gap-4"><span className="text-sm font-extrabold text-graf-900">Total parcial</span><span className="text-3xl font-extrabold tracking-[-0.05em] text-graf-950">{formatarPreco(totais.totalCents)}</span></div>
                  {parcelas ? <p className="mt-2 text-right text-xs text-graf-500">em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}</p> : null}
                </div>

                <Link href="/checkout" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-5 text-base font-extrabold text-white transition hover:bg-jb-500">
                  Continuar para checkout <ArrowRight className="size-4" aria-hidden />
                </Link>

                <div className="mt-5 space-y-3 border-t border-graf-100 pt-5">
                  {[[LockKeyhole,"Valores recalculados no servidor"],[ShieldCheck,"Dados da compra protegidos"],[Truck,"Entrega e retirada confirmadas antes do pedido"]].map(([Icon,texto])=>{const I=Icon as typeof LockKeyhole;return <p key={String(texto)} className="flex items-center gap-2.5 text-xs leading-5 text-graf-500"><I className="size-4 shrink-0 text-graf-400" aria-hidden />{String(texto)}</p>})}
                </div>
              </div>

              <div className="border-t border-graf-200 bg-graf-50 p-4 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-bold text-graf-600"><PackageCheck className="size-4 text-jb-600" aria-hidden />Compra conectada ao pós-venda JB</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
