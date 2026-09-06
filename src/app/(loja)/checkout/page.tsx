import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { FlaskConical, Headset, ShieldCheck, Truck } from "lucide-react";

import { Checkout, type MetodoCheckout } from "@/components/loja/checkout";
import { ResumoCheckout } from "@/components/loja/checkout-resumo";
import { Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { calcularParcelas, paraCentavos } from "@/lib/format";
import { pagamentoEhSimulado, provedorPagamento } from "@/lib/pagamento";
import { prisma } from "@/lib/prisma";
import { enderecoCompleto, getSettings, ligado } from "@/lib/settings";

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
  title: "Fechar pedido",
  robots: { index: false, follow: false },
};

/**
 * Fechamento do pedido.
 *
 * Tudo que decide dinheiro é resolvido aqui, no servidor: os totais saem de
 * calcularTotais sobre o carrinho do banco, e o teto de parcelamento sai das
 * configurações da loja. O formulário só devolve escolhas — nunca valores.
 *
 * A lista de formas de pagamento também é do servidor: ela vem do provedor
 * ativo, e não de uma constante na interface. Trocar de adquirente muda a
 * tela sozinho.
 */

/** Só oferecemos o que a plataforma consegue levar até o fim. */
function metodosUsaveis(
  doProvedor: readonly PaymentMethod[],
  podeCartao: boolean,
): MetodoCheckout[] {
  const lista: MetodoCheckout[] = [];
  if (doProvedor.includes("pix")) lista.push("pix");
  if (podeCartao && doProvedor.includes("cartao")) lista.push("cartao");
  // boleto fica de fora: o modelo Payment não tem coluna para linha digitável
  // nem para o PDF, então a tela não teria o que mostrar depois de emitir.
  return lista;
}

export default async function CheckoutPage() {
  const carrinho = await lerCarrinho();
  const totais = calcularTotais(carrinho);

  // carrinho vazio não tem checkout: volta para onde dá para resolver
  if (totais.linhas.length === 0) redirect("/carrinho");

  const [sessao, s] = await Promise.all([sessaoCliente(), getSettings()]);

  const cliente = sessao
    ? await prisma.customer.findUnique({
        where: { id: sessao.id },
        select: {
          name: true,
          email: true,
          phone: true,
          personType: true,
          document: true,
          companyName: true,
          addresses: {
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
            take: 1,
          },
        },
      })
    : null;

  const endereco = cliente?.addresses[0] ?? null;

  const provedor = provedorPagamento();
  const simulado = pagamentoEhSimulado();
  const chavePublicaCartao = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "";
  // com provedor real, cartão só aparece se o SDK do navegador puder tokenizar
  const metodos = metodosUsaveis(provedor.metodos, simulado || chavePublicaCartao !== "");

  const maximoConfigurado = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const teto =
    calcularParcelas(totais.totalCents, maximoConfigurado, paraCentavos(s.parcela_minima))
      ?.parcelas ?? 1;
  const parcelas = Array.from({ length: teto }, (_, i) => ({
    numero: i + 1,
    valorCents: Math.floor(totais.totalCents / (i + 1)),
  }));

  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Carrinho", href: "/carrinho" },
          { rotulo: "Fechar pedido" },
        ]}
        className="mb-5"
      />

      <header className="max-w-2xl">
        <h1 className="text-display texto-forte">Fechar pedido</h1>
        <p className="texto-guia mt-3 text-graf-600">
          Cinco etapas curtas. Você confere tudo antes de confirmar, e nada é cobrado até lá.
        </p>
      </header>

      <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2.5 text-sm text-graf-600">
        <li className="flex items-center gap-2">
          <Truck className="size-4 shrink-0 text-graf-400" aria-hidden />
          {ligado(s.retirada_disponivel) ? "Entrega ou retirada na JB" : "Entrega pelo seu CEP"}
        </li>
        <li className="flex items-center gap-2">
          <Headset className="size-4 shrink-0 text-graf-400" aria-hidden />
          Equipe técnica própria em São Paulo
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-graf-400" aria-hidden />
          Acompanhamento do pedido do pagamento à entrega
        </li>
      </ul>

      {/*
        O provedor de teste não pode se disfarçar de cobrança real. O aviso
        aparece antes da primeira etapa e não some — quem está vendo a
        demonstração precisa saber disso desde o começo.
      */}
      {simulado ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-warn-500/50 bg-warn-50 px-4 py-3.5">
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-warn-700" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed text-graf-700">
            <p className="font-bold text-warn-700">Ambiente de demonstração</p>
            <p className="mt-1">
              Você pode percorrer o pedido inteiro, mas o pagamento não é processado de verdade:
              nenhuma cobrança acontece e nenhum dado de cartão é pedido.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 pb-32 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-10 lg:pb-0">
        <Checkout
          logado={Boolean(sessao)}
          nomeCliente={sessao?.name ?? ""}
          inicial={{
            nome: cliente?.name ?? "",
            email: sessao?.email ?? "",
            telefone: cliente?.phone ?? "",
            tipoPessoa: cliente?.personType ?? "fisica",
            documento: cliente?.document ?? "",
            razaoSocial: cliente?.companyName ?? "",
            cep: endereco?.zip ?? "",
            logradouro: endereco?.street ?? "",
            numero: endereco?.number ?? "",
            complemento: endereco?.complement ?? "",
            bairro: endereco?.district ?? "",
            cidade: endereco?.city ?? "",
            uf: endereco?.state ?? "",
            referencia: endereco?.reference ?? "",
          }}
          retiradaDisponivel={ligado(s.retirada_disponivel)}
          enderecoJb={enderecoCompleto(s)}
          instrucoesRetirada={s.retirada_instrucoes}
          horarioJb={s.horario}
          metodos={metodos}
          simulado={simulado}
          provedorNome={provedor.nome}
          chavePublicaCartao={chavePublicaCartao}
          parcelas={parcelas}
          totalCents={totais.totalCents}
        />

        <ResumoCheckout
          linhas={totais.linhas}
          subtotalCents={totais.subtotalCents}
          descontoCents={totais.descontoCents}
          cupomCodigo={totais.cupomCodigo}
          totalCents={totais.totalCents}
        />
      </div>
    </div>
  );
}
