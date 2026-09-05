import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import { sessaoCliente } from "@/lib/auth-cliente";
import { whatsappHref } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Pedido registrado",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ pedido?: string }> };

export default async function PedidoConfirmadoPage({ searchParams }: Props) {
  const [{ pedido }, cliente, s] = await Promise.all([searchParams, sessaoCliente(), getSettings()]);

  return (
    <div className="relative overflow-hidden bg-graf-50/70">
      <div className="field-orbit pointer-events-none absolute inset-0 opacity-20" aria-hidden />
      <div className="container-jb relative flex min-h-[720px] items-center justify-center py-14 lg:py-20">
        <section className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-graf-200 bg-white shadow-pop">
          <div className="p-7 text-center sm:p-10 lg:p-12">
            <span className="mx-auto flex size-18 items-center justify-center rounded-full bg-ok-50 text-ok-700 ring-8 ring-ok-50/50">
              <CheckCircle2 className="size-9" aria-hidden />
            </span>

            <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">
              Pedido registrado
            </p>
            <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-[-0.045em] text-graf-950 sm:text-4xl">
              A JB já recebeu sua solicitação de compra.
            </h1>

            {pedido ? (
              <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-xl border border-graf-200 bg-graf-50 px-5 py-3">
                <PackageCheck className="size-4.5 text-jb-600" aria-hidden />
                <span className="text-xs font-semibold text-graf-500">Pedido</span>
                <strong className="label-mono text-sm text-graf-950">{pedido}</strong>
              </div>
            ) : null}

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-graf-600 sm:text-base">
              Se você escolheu entrega, a equipe confirma a logística e eventuais custos antes do pagamento.
              Se escolheu retirada, a JB confirma disponibilidade, preparação do equipamento e as instruções de pagamento.
            </p>

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
              {[
                ["01", "Pedido recebido", "Os itens e seus dados ficam registrados."],
                ["02", "Conferência da JB", "A equipe valida disponibilidade e logística."],
                ["03", "Próximo passo", "Você recebe as orientações para seguir com a compra."],
              ].map(([numero, titulo, texto]) => (
                <div key={numero} className="rounded-2xl border border-graf-200 p-4">
                  <span className="label-mono text-jb-600">{numero}</span>
                  <p className="mt-3 text-sm font-extrabold text-graf-950">{titulo}</p>
                  <p className="mt-1 text-xs leading-5 text-graf-500">{texto}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {cliente ? (
                <Link
                  href="/minha-jb/pedidos"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white transition hover:bg-jb-500"
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Acompanhar pedido
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <Link
                  href="/cadastro"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white transition hover:bg-jb-500"
                >
                  Criar Área da Clínica
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}

              {s.whatsapp ? (
                <a
                  href={whatsappHref(
                    s.whatsapp,
                    pedido
                      ? `Olá! Acabei de registrar o pedido ${pedido} no site da JB e gostaria de falar sobre os próximos passos.`
                      : "Olá! Acabei de registrar um pedido no site da JB e gostaria de falar sobre os próximos passos.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-graf-300 bg-white px-6 text-sm font-extrabold text-graf-800 transition hover:bg-graf-50"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-px border-t border-graf-200 bg-graf-200 sm:grid-cols-2">
            <div className="bg-graf-50 p-5 text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-xs font-bold text-graf-700 sm:justify-start">
                <ShieldCheck className="size-4 text-jb-600" aria-hidden />
                O pedido não significa pagamento aprovado
              </p>
            </div>
            <div className="bg-graf-50 p-5 text-center sm:text-right">
              <Link href="/loja" className="text-xs font-extrabold text-jb-700 hover:text-jb-500">
                Continuar vendo equipamentos →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
