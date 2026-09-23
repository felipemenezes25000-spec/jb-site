import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageSquareHeart, ShieldCheck } from "lucide-react";

import { FormularioAvaliacao } from "@/components/site/formulario-avaliacao";
import { Aviso } from "@/components/ui/aviso";
import { Secao } from "@/components/ui/secao";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";

export const instant = false;

export const metadata: Metadata = {
  title: "Avaliar o atendimento da JB",
  robots: { index: false, follow: false },
};

export default async function AvaliarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;

  const convite = await prisma.reviewRequest.findUnique({
    where: { token },
    select: {
      kind: true,
      status: true,
      customer: { select: { name: true } },
      order: { select: { number: true } },
      workOrder: { select: { number: true } },
      review: { select: { id: true } },
    },
  });

  /* Convite inexistente e convite cancelado dão a mesma resposta para não
     confirmar a terceiros que determinado token já existiu. */
  if (!convite || convite.status === "cancelado") notFound();

  const numero = convite.order?.number ?? convite.workOrder?.number ?? "";
  const primeiroNome = convite.customer.name.split(" ")[0];

  return (
    <Secao
      espaco="md"
      largura="estreita"
      className="jb-avaliacao-page overflow-clip"
    >
      <div className="jb-avaliacao-shell relative overflow-hidden rounded-[1.75rem] border border-graf-200 bg-white p-5 sm:p-8 lg:p-10">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-36 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.12),transparent)]"
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="label-mono text-xs font-bold text-jb-700">
                {convite.kind === "compra" ? "Pedido" : "Atendimento"} {numero}
              </p>
              <h1 className="mt-3 text-display texto-forte">
                {convite.review ? "Você já respondeu" : "Conte como foi"}
              </h1>
            </div>
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-jb-50 text-jb-600 ring-1 ring-jb-100 sm:flex">
              <MessageSquareHeart className="size-6" aria-hidden />
            </span>
          </div>

          {convite.review ? (
            <div className="mt-7">
              <Aviso tom="info" titulo="Resposta registrada">
                Esta avaliação já foi respondida. Se quiser corrigir ou retirar o que escreveu,
                fale com a equipe — a JB atende pedidos de retirada sem discussão.
              </Aviso>
            </div>
          ) : (
            <>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-graf-600">
                São duas perguntas, {primeiroNome}. A resposta chega direto para a equipe da JB
                e você decide separadamente se autoriza ou não qualquer publicação.
              </p>

              <div className="jb-avaliacao-transparencia mt-5 flex gap-3 rounded-xl border border-graf-200 bg-graf-50 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-jb-600 shadow-xs ring-1 ring-graf-200">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-graf-900">Sua resposta não vira depoimento automaticamente</p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-graf-600">
                    A autorização para publicar é opcional, aparece no formulário e começa desmarcada.
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <FormularioAvaliacao token={token} tipo={convite.kind as "compra" | "servico"} />
              </div>

              <p className="mt-8 border-t border-graf-200 pt-6 text-apoio leading-relaxed text-graf-500">
                A JB não oferece desconto, brinde ou vantagem em troca de avaliação, e não pede que
                ninguém mude o que escreveu. Uma resposta crítica também ajuda a equipe a corrigir o processo.
              </p>
            </>
          )}
        </div>
      </div>
    </Secao>
  );
}
