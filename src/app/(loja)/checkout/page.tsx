import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck } from "lucide-react";

import { FormCheckout } from "@/components/checkout/form-checkout";
import { sessaoCliente } from "@/lib/auth-cliente";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [carrinho, sessao] = await Promise.all([lerCarrinho(), sessaoCliente()]);
  const totais = calcularTotais(carrinho);

  if (!carrinho || totais.linhas.length === 0) redirect("/carrinho");

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
        },
      })
    : null;

  return (
    <>
      <section className="border-b border-graf-200 bg-white">
        <div className="container-jb py-8 lg:py-10">
          <Link
            href="/carrinho"
            className="inline-flex items-center gap-2 text-sm font-bold text-graf-500 transition hover:text-jb-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar ao carrinho
          </Link>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Finalizar compra</p>
              <h1 className="mt-3 text-display leading-[1.04]">Confirme os detalhes do pedido.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-graf-600 lg:text-base">
                Escolha retirada ou entrega a combinar, informe seus dados e registre sua preferência de pagamento.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-graf-500">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-jb-600" aria-hidden />
                Dados protegidos
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-jb-600" aria-hidden />
                Revisão antes da confirmação
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-graf-50/60">
        <div className="container-jb grid gap-8 py-8 lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-10 lg:py-12 xl:gap-12">
          <FormCheckout
            dados={{
              nome: cliente?.name ?? "",
              email: cliente?.email ?? "",
              telefone: cliente?.phone ?? "",
              tipo: cliente?.personType ?? "fisica",
              documento: cliente?.document ?? "",
              empresa: cliente?.companyName ?? "",
            }}
          />

          <aside className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-raised lg:sticky lg:top-32">
            <div className="border-b border-graf-200 p-5 lg:p-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-jb-600">Resumo</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 className="text-xl font-extrabold tracking-[-0.03em] text-graf-950">Seu pedido</h2>
                <span className="text-xs font-bold text-graf-500">
                  {totais.quantidadeItens} {totais.quantidadeItens === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>

            <div className="max-h-[24rem] overflow-y-auto border-b border-graf-200">
              <ul className="divide-y divide-graf-100">
                {totais.linhas.map((linha) => (
                  <li key={linha.id} className="flex gap-3 p-4 lg:px-5">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-graf-200 bg-graf-50">
                      {linha.imagem ? (
                        <Image
                          src={linha.imagem}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-graf-300">
                          <PackageCheck className="size-5" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {linha.marca ? (
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-graf-400">
                          {linha.marca}
                        </p>
                      ) : null}
                      <p className="mt-0.5 line-2 text-xs font-extrabold leading-5 text-graf-950">
                        {linha.nome}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-graf-500">Qtd. {linha.quantidade}</span>
                        <span className="text-xs font-extrabold tabular text-graf-900">
                          {formatarPreco(linha.totalCents)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 lg:p-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">Subtotal</dt>
                  <dd className="font-bold tabular text-graf-900">{formatarPreco(totais.subtotalCents)}</dd>
                </div>
                {totais.descontoCents > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-graf-600">Desconto</dt>
                    <dd className="font-bold tabular text-ok-700">− {formatarPreco(totais.descontoCents)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">Logística</dt>
                  <dd className="max-w-36 text-right text-xs leading-5 text-graf-500">
                    definida conforme retirada ou entrega escolhida
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-graf-200 pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-extrabold text-graf-950">Total dos itens</span>
                  <span className="text-2xl font-extrabold tracking-[-0.045em] text-graf-950">
                    {formatarPreco(totais.totalCents)}
                  </span>
                </div>
                <p className="mt-2 text-right text-[11px] leading-5 text-graf-500">
                  Custos de entrega, quando aplicáveis, são confirmados pela JB antes do pagamento.
                </p>
              </div>

              <div className="mt-6 rounded-xl bg-graf-50 p-4">
                <p className="flex items-start gap-2 text-xs font-bold leading-5 text-graf-700">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  Esta etapa registra o pedido. Nenhum cartão é cobrado e nenhum Pix é debitado automaticamente aqui.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
