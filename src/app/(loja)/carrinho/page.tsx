import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, ShoppingCart, Wrench } from "lucide-react";

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

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

/**
 * Carrinho.
 *
 * Duas colunas no desktop: a lista à esquerda, o resumo grudado à direita. No
 * celular o resumo desce para depois da lista — quem está em 360px precisa
 * primeiro conferir o que escolheu.
 *
 * Item que saiu do catálogo trava o fechamento (o servidor recusa o pedido),
 * então a trava aparece aqui, com o nome do equipamento e o caminho para
 * resolver, em vez de virar um erro na última etapa do checkout.
 */
export default async function CarrinhoPage() {
  const [carrinho, s] = await Promise.all([lerCarrinho(), getSettings()]);
  const totais = calcularTotais(carrinho);

  // o mesmo teto que o checkout aplica, para o número não mudar entre as telas
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
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Carrinho" }]} className="mb-5" />

      <header className="max-w-2xl">
        <h1 className="text-display texto-forte">Seu carrinho</h1>
        {totais.linhas.length > 0 ? (
          <p className="texto-guia mt-3 text-graf-600">
            Confira os equipamentos, ajuste as quantidades e siga para o fechamento. O frete é
            calculado na próxima etapa, pelo CEP de entrega.
          </p>
        ) : null}
      </header>

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
              {/* a saída pelo WhatsApp só existe quando há número cadastrado */}
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
          className="mt-10"
        />
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-10">
          <section aria-labelledby="titulo-itens" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 id="titulo-itens" className="text-title texto-forte">
                Itens
              </h2>
              <p className="text-sm text-graf-500">
                {plural(totais.quantidadeItens, "unidade", "unidades")} no carrinho
              </p>
            </div>

            {indisponiveis.length > 0 ? (
              <Aviso
                tom="atencao"
                titulo={
                  indisponiveis.length === 1
                    ? "Um item do carrinho saiu do catálogo"
                    : `${indisponiveis.length} itens do carrinho saíram do catálogo`
                }
                className="mb-4"
              >
                {indisponiveis.map((linha) => linha.nome).join(", ")} não está mais à venda e não
                entra no total. Remova para liberar o fechamento — se quiser um equivalente, a JB
                encontra para você.
              </Aviso>
            ) : null}

            <LinhasCarrinho linhas={totais.linhas} />

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/loja"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                Continuar comprando
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/orcamento"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <Wrench className="size-4 text-graf-400" aria-hidden />
                Precisa de algo que não está no catálogo?
              </Link>
            </div>
          </section>

          <aside aria-labelledby="titulo-resumo" className="min-w-0 lg:sticky lg:top-28">
            <Cartao className="p-5 sm:p-6">
              <h2 id="titulo-resumo" className="text-lg font-bold text-graf-950">
                Resumo do pedido
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">
                    Subtotal
                    <span className="ml-1.5 text-graf-500">
                      ({plural(totais.quantidadeItens, "unidade", "unidades")})
                    </span>
                  </dt>
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

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-graf-600">Frete</dt>
                  <dd className="max-w-44 text-right text-[0.8125rem] leading-snug text-graf-500">
                    calculado na próxima etapa, pelo CEP
                  </dd>
                </div>
              </dl>

              {totais.cupomErro ? (
                <p className="mt-4 rounded-lg bg-warn-50 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-warn-700 ring-1 ring-inset ring-warn-500/25">
                  {totais.cupomErro}
                </p>
              ) : null}

              <CampoCupom aplicado={totais.cupomCodigo} />

              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-graf-200 pt-5">
                <span className="text-base font-bold text-graf-900">Total</span>
                <span className="text-3xl font-extrabold tabular tracking-tight text-graf-950">
                  {formatarPreco(totais.totalCents)}
                </span>
              </div>
              {parcelas ? (
                <p className="mt-1.5 text-right text-sm text-graf-500">
                  ou em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
                  no cartão
                </p>
              ) : null}

              {podeFechar ? (
                <LinkBotao href="/checkout" tamanho="lg" larguraTotal className="mt-6">
                  Finalizar compra
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
              ) : (
                <p className="mt-6 rounded-lg border border-graf-200 bg-graf-50 px-4 py-3.5 text-center text-sm leading-relaxed text-graf-700">
                  Remova o item que saiu do catálogo para finalizar a compra.
                </p>
              )}

              <p className="mt-4 flex items-start justify-center gap-2 text-[0.8125rem] leading-relaxed text-graf-500">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                <span>
                  Pagamento seguro. Você confere o valor final antes de confirmar, e nada é
                  cobrado até lá.
                </span>
              </p>
            </Cartao>

            <div className="mt-5 rounded-xl border border-graf-200 bg-graf-50 p-5">
              <p className="text-sm font-bold text-graf-900">Ficou com dúvida no equipamento?</p>
              {/* o ano só entra na frase quando existe no cadastro: sem ele a
                  frase continua correta, em vez de terminar em "desde ." */}
              <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
                {s.empresa_desde
                  ? `A equipe técnica da JB atende São Paulo desde ${s.empresa_desde} e ajuda a escolher o equipamento antes de você fechar.`
                  : "A equipe técnica da JB ajuda a escolher o equipamento antes de você fechar."}
              </p>
              <div className="mt-4 space-y-2.5">
                {whatsapp ? (
                  <LinkBotao
                    href={whatsapp}
                    variante="secundario"
                    larguraTotal
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Falar no WhatsApp
                  </LinkBotao>
                ) : null}
                {s.horario ? (
                  <p className="text-center text-[0.8125rem] text-graf-500">{s.horario}</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
