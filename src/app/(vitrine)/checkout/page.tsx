import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { FlaskConical, ShieldCheck } from "lucide-react";

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
  title: "Finalizar compra",
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
    <div className="container-jb py-7 lg:py-10">
      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Carrinho", href: "/carrinho" },
          ...(escolha || melhorEnvioAtivo
            ? [{ rotulo: "Entrega", href: "/escolher-entrega" }]
            : []),
          { rotulo: "Finalizar compra" },
        ]}
        className="mb-4"
      />

      <header className="flex max-w-5xl flex-col gap-3 border-b border-graf-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="manchete text-[clamp(2rem,1.5rem+2vw,3rem)] text-graf-950">Finalizar compra</h1>
          <p className="mt-2.5 max-w-xl text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
            Preencha os dados, confira entrega e pagamento e revise tudo antes de confirmar.
          </p>
        </div>

        {escolha || melhorEnvioAtivo ? (
          <Link
            href="/escolher-entrega"
            className="foco-jb inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-jb-700 hover:underline"
          >
            Alterar entrega
          </Link>
        ) : null}
      </header>

      <p className="mt-3 flex max-w-2xl items-start gap-2 text-[0.8125rem] leading-5 text-graf-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
        O pedido só é confirmado depois da revisão final. Valores de frete e pagamento são conferidos no servidor.
      </p>

      {simulado ? (
        <div className="mt-5 flex max-w-3xl items-start gap-3 rounded-xl border border-dashed border-warn-500/50 bg-warn-50 px-4 py-3.5">
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-warn-700" aria-hidden />
          <div className="min-w-0 text-sm leading-5 text-graf-700">
            <p className="font-bold text-warn-700">Ambiente de demonstração</p>
            <p className="mt-1">Nenhuma cobrança real é feita e nenhum dado de cartão é solicitado.</p>
          </div>
        </div>
      ) : null}

      <div className="mt-7 grid gap-7 pb-32 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-9 lg:pb-0">
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
