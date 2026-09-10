import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, ShoppingCart } from "lucide-react";

import { CampoCupom } from "@/components/loja/campo-cupom";
import { LinhasCarrinho } from "@/components/loja/linhas-carrinho";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Trilha, Vazio } from "@/components/ui/data";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import {
  calcularParcelas,
  formatarPreco,
  paraCentavos,
  plural,
  whatsappHref,
} from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const instant = false;

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

export default async function CarrinhoPage() {
  const [carrinho, s] = await Promise.all([lerCarrinho(), getSettings()]);
  const totais = calcularTotais(carrinho);

  const parcelas = calcularParcelas(
    totais.totalCents,
    Math.min(12, Math.max(1, Number(s.parcelas_max) || 1)),
    paraCentavos(s.parcela_minima),
  );

  const indisponiveis = totais.linhas.filter((linha) => !linha.disponivel);
  const podeFechar = totais.linhas.length > 0 && indisponiveis.length === 0;
  const whatsapp = whatsappHref(
    s.whatsapp,
    "Olá! Estou montando um pedido no site da JB e queria tirar uma dúvida.",
  );

  return (
    <div className="container-jb py-7 lg:py-10">
      <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Carrinho" }]} className="mb-4" />

      <header className="max-w-2xl">
        <h1 className="manchete text-[clamp(2rem,1.5rem+2vw,3rem)] text-graf-950">Seu carrinho</h1>
        {totais.linhas.length > 0 ? (
          <p className="mt-2.5 max-w-xl text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
            Confira os produtos e quantidades. Frete e entrega são definidos antes do pagamento.
          </p>
        ) : null}
      </header>

      {totais.linhas.length === 0 ? (
        <Vazio
          icone={ShoppingCart}
          titulo="Seu carrinho está vazio"
          descricao="Escolha um produto no catálogo ou peça um orçamento para algo que ainda não esteja publicado na loja."
          acao={
            <div className="flex flex-wrap justify-center gap-2.5">
              <LinkBotao href="/loja">Ver catálogo</LinkBotao>
              <LinkBotao href="/orcamento" variante="secundario">
                Pedir orçamento
              </LinkBotao>
              {whatsapp ? (
                <LinkBotao
                  href={whatsapp}
                  variante="texto"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Falar com a JB
                </LinkBotao>
              ) : null}
            </div>
          }
          className="mt-8"
        />
      ) : (
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-9">
          <section aria-labelledby="titulo-itens" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-graf-200 pb-3">
              <h2 id="titulo-itens" className="text-xl font-extrabold tracking-[-0.02em] text-graf-950">
                Produtos
              </h2>
              <p className="text-sm text-graf-500">
                {plural(totais.quantidadeItens, "unidade", "unidades")}
              </p>
            </div>

            {indisponiveis.length > 0 ? (
              <Aviso
                tom="atencao"
                titulo={
                  indisponiveis.length === 1
                    ? "Um produto não está mais disponível"
                    : `${indisponiveis.length} produtos não estão mais disponíveis`
                }
                className="mb-4"
              >
                {indisponiveis.map((linha) => linha.nome).join(", ")} não entra no total. Remova para liberar o fechamento ou fale com a JB para encontrar uma alternativa.
              </Aviso>
            ) : null}

            <LinhasCarrinho linhas={totais.linhas} />

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/loja"
                className="foco-jb inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700"
              >
                Continuar comprando
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/orcamento"
                className="foco-jb inline-flex min-h-11 items-center text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700"
              >
                Pedir item fora do catálogo
              </Link>
            </div>
          </section>

          <aside aria-labelledby="titulo-resumo" className="min-w-0 lg:sticky lg:top-28">
            <Cartao className="overflow-hidden p-0">
              <div className="p-5 sm:p-6">
                <h2 id="titulo-resumo" className="text-lg font-extrabold text-graf-950">
                  Resumo do pedido
                </h2>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-graf-600">
                      Subtotal <span className="text-graf-500">({plural(totais.quantidadeItens, "unidade", "unidades")})</span>
                    </dt>
                    <dd className="font-semibold tabular text-graf-900">
                      {formatarPreco(totais.subtotalCents)}
                    </dd>
                  </div>

                  {totais.descontoCents > 0 ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-graf-600">
                        Desconto <span className="label-mono text-graf-500">{totais.cupomCodigo}</span>
                      </dt>
                      <dd className="font-semibold tabular text-ok-700">
                        − {formatarPreco(totais.descontoCents)}
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-graf-600">Entrega</dt>
                    <dd className="max-w-40 text-right text-[0.8125rem] leading-5 text-graf-500">
                      calculada pelo CEP na próxima etapa
                    </dd>
                  </div>
                </dl>

                {totais.cupomErro ? (
                  <p className="mt-4 rounded-lg bg-warn-50 px-3.5 py-2.5 text-[0.8125rem] leading-5 text-warn-700 ring-1 ring-inset ring-warn-500/25">
                    {totais.cupomErro}
                  </p>
                ) : null}

                <CampoCupom aplicado={totais.cupomCodigo} />

                <div className="mt-5 border-t border-graf-200 pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-base font-bold text-graf-900">Total</span>
                    <span className="text-3xl font-extrabold tabular tracking-tight text-graf-950">
                      {formatarPreco(totais.totalCents)}
                    </span>
                  </div>
                  {parcelas ? (
                    <p className="mt-1.5 text-right text-[0.8125rem] leading-5 text-graf-500">
                      até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
                    </p>
                  ) : null}
                </div>

                {podeFechar ? (
                  <LinkBotao href="/checkout" tamanho="lg" larguraTotal className="mt-5">
                    Finalizar compra
                    <ArrowRight className="size-4" aria-hidden />
                  </LinkBotao>
                ) : (
                  <p className="mt-5 rounded-lg border border-graf-200 bg-graf-50 px-4 py-3 text-center text-sm leading-5 text-graf-700">
                    Remova os produtos indisponíveis para continuar.
                  </p>
                )}

                <p className="mt-3 flex items-start justify-center gap-2 text-[0.75rem] leading-5 text-graf-500">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>Você confere o valor final antes de confirmar o pagamento.</span>
                </p>
              </div>

              {whatsapp ? (
                <div className="border-t border-graf-150 bg-graf-50/50 px-5 py-4 sm:px-6">
                  <p className="text-[0.8125rem] font-bold text-graf-900">Precisa de ajuda antes de fechar?</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[0.75rem] leading-5 text-graf-500">
                      A equipe JB pode orientar sobre produto, compatibilidade e entrega.
                    </p>
                    <Link
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foco-jb inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-jb-700 hover:underline"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      WhatsApp
                    </Link>
                  </div>
                  {s.horario ? <p className="mt-1.5 text-[0.6875rem] text-graf-500">{s.horario}</p> : null}
                </div>
              ) : null}
            </Cartao>
          </aside>
        </div>
      )}
    </div>
  );
}
