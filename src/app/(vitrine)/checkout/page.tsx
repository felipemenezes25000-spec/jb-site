import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { FlaskConical, Headset, ShieldCheck, Truck } from "lucide-react";

import { Checkout, type MetodoCheckout } from "@/components/loja/checkout";
import { ResumoCheckout } from "@/components/loja/checkout-resumo";
import { Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { calcularParcelas, paraCentavos } from "@/lib/format";
import { statusMelhorEnvio } from "@/lib/melhor-envio";
import { pagamentoEhSimulado, provedorPagamento } from "@/lib/pagamento";
import { prisma } from "@/lib/prisma";
import { COOKIE_ESCOLHA_FRETE, lerEscolhaFrete } from "@/lib/selecao-frete";
import { enderecoCompleto, getSettings, ligado } from "@/lib/settings";

export const instant = false;

export const metadata: Metadata = {
  title: "Fechar pedido",
  robots: { index: false, follow: false },
};

function metodosUsaveis(
  doProvedor: readonly PaymentMethod[],
  podeCartao: boolean,
): MetodoCheckout[] {
  const lista: MetodoCheckout[] = [];
  if (doProvedor.includes("pix")) lista.push("pix");
  if (podeCartao && doProvedor.includes("cartao")) lista.push("cartao");
  return lista;
}

export default async function CheckoutPage() {
  const carrinho = await lerCarrinho();
  const totais = calcularTotais(carrinho);
  if (totais.linhas.length === 0) redirect("/carrinho");

  const jar = await cookies();
  const escolha = lerEscolhaFrete(jar.get(COOKIE_ESCOLHA_FRETE)?.value);
  const melhorEnvioAtivo = statusMelhorEnvio().quoteReady;

  // Quando o agregador está operacional, a transportadora precisa ser escolhida
  // antes do checkout para o servidor conseguir recotar exatamente o mesmo
  // serviço. Sem credenciais do Melhor Envio, preservamos o fluxo legado da JB:
  // tabela própria + retirada continuam funcionando e a loja não fica bloqueada.
  if (!escolha && melhorEnvioAtivo) redirect("/escolher-entrega");

  const [sessao, s] = await Promise.all([sessaoCliente(), getSettings()]);
  if (escolha?.kind === "retirada" && !ligado(s.retirada_disponivel)) {
    redirect("/escolher-entrega");
  }

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
  const metodos = metodosUsaveis(provedor.metodos, simulado || chavePublicaCartao !== "");

  const maximoConfigurado = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const teto =
    calcularParcelas(totais.totalCents, maximoConfigurado, paraCentavos(s.parcela_minima))
      ?.parcelas ?? 1;
  const parcelas = Array.from({ length: teto }, (_, i) => ({
    numero: i + 1,
    valorCents: Math.floor(totais.totalCents / (i + 1)),
  }));

  const retiradaEscolhida = escolha?.kind === "retirada";
  const retiradaNoCheckout = escolha ? retiradaEscolhida : ligado(s.retirada_disponivel);

  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Carrinho", href: "/carrinho" },
          ...(escolha || melhorEnvioAtivo
            ? [{ rotulo: "Entrega", href: "/escolher-entrega" }]
            : []),
          { rotulo: "Fechar pedido" },
        ]}
        className="mb-5"
      />

      <header className="max-w-2xl">
        <h1 className="manchete text-[clamp(2rem,1.5rem+2vw,3rem)] text-graf-950">Fechar pedido</h1>
        <p className="texto-guia mt-3 text-graf-600">
          Cinco etapas curtas. Você confere tudo antes de confirmar, e nada é cobrado até lá.
        </p>
        {escolha || melhorEnvioAtivo ? (
          <Link
            href="/escolher-entrega"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Alterar transportadora ou forma de entrega
          </Link>
        ) : null}
      </header>

      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2.5 text-sm text-graf-600">
        <li className="flex items-center gap-2">
          <Truck className="size-4 shrink-0 text-graf-500" aria-hidden />
          {retiradaEscolhida
            ? "Retirada na JB selecionada"
            : escolha?.kind === "melhor_envio"
              ? "Transportadora selecionada e recotada pelo CEP"
              : "Frete calculado pelo CEP no checkout"}
        </li>
        <li className="flex items-center gap-2">
          <Headset className="size-4 shrink-0 text-graf-500" aria-hidden />
          Equipe técnica própria em São Paulo
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-graf-500" aria-hidden />
          Acompanhamento do pedido do pagamento à entrega
        </li>
      </ul>

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
          // Com Melhor Envio escolhido, trocar entrega/retirada aqui quebraria a
          // recotação. No modo legado, o checkout mantém a escolha que já existia.
          retiradaDisponivel={retiradaNoCheckout}
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
