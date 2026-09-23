import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormularioAvaliacao } from "@/components/site/formulario-avaliacao";
import { Aviso } from "@/components/ui/aviso";
import { Secao } from "@/components/ui/secao";
import { prisma } from "@/lib/prisma";
import { connection } from "next/server";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
/*
 * Renderizada a cada visita (`connection()` logo no começo). Até 22/09/2026
 * esta página vivia na casca da loja, que lia o cookie da conta e tornava tudo
 * dinâmico por tabela. A casca do site de assistência é estática, e sem esta
 * chamada o Next tentaria pré-renderizar a consulta ao banco e recusaria o
 * relógio que o Prisma lê durante a consulta.
 */
export const instant = false;

/**
 * Página de resposta de uma avaliação.
 *
 * `noindex` sempre: o endereço carrega um token que identifica uma transação
 * de uma pessoa. Ele não pertence ao índice de ninguém.
 */
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

  /* Convite inexistente e convite cancelado dão a mesma resposta. Distinguir
     entregaria, a quem varre tokens, a informação de que aquele existiu. */
  if (!convite || convite.status === "cancelado") notFound();

  const numero = convite.order?.number ?? convite.workOrder?.number ?? "";

  return (
    <Secao espaco="sm" largura="estreita">
      <p className="label-mono text-xs text-jb-700">
        {convite.kind === "compra" ? "Pedido" : "Atendimento"} {numero}
      </p>
      <h1 className="mt-2 text-display texto-forte">
        {convite.review ? "Você já respondeu" : "Conte como foi"}
      </h1>

      {convite.review ? (
        <Aviso tom="info" className="mt-6" titulo="Resposta registrada">
          Esta avaliação já foi respondida. Se quiser corrigir ou retirar o que escreveu, fale
          com a equipe — a JB atende pedidos de retirada sem discussão.
        </Aviso>
      ) : (
        <>
          <p className="mt-4 text-lg leading-relaxed text-graf-600">
            São duas perguntas, {convite.customer.name.split(" ")[0]}. A sua resposta chega
            direto para a equipe da JB.
          </p>

          <div className="mt-8">
            <FormularioAvaliacao token={token} tipo={convite.kind as "compra" | "servico"} />
          </div>

          <p className="mt-8 text-apoio leading-relaxed text-graf-500">
            A JB não oferece desconto, brinde ou vantagem em troca de avaliação, e não pede que
            ninguém mude o que escreveu. Uma resposta ruim é tão útil quanto uma boa — mais,
            normalmente.
          </p>
        </>
      )}
    </Secao>
  );
}
