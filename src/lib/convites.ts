import "server-only";

import { randomBytes } from "node:crypto";

import { enfileirar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";
import { urlAbsoluta } from "@/lib/seo";
import { motivoDeInelegibilidade, type MotivoDeInelegibilidade } from "@/lib/avaliacoes";

/* ============================================================================
   Convites de avaliação — a fila e o portão

   Duas coisas separadas de propósito:

   **Montar a fila** olha o que está elegível e cria convites em `rascunho`.
   Não manda nada. Pode rodar quantas vezes quiser, e roda sem autorização
   nenhuma — porque não sai da JB.

   **Enviar** é o portão. Ele consulta a configuração `avaliacoes_envio` e
   recusa enquanto ela estiver desligada. É assim que a integração fica pronta
   sem que ninguém receba e-mail antes de a JB autorizar — o escopo pede
   exatamente isto: "integração pode ficar pronta com modo de teste e fila de
   rascunho; ative e envie a pessoas somente quando autorizado".

   E é só no envio que `sentAt` é carimbado. O escopo exige que
   `review_requested` represente uma solicitação efetivamente enviada, não um
   rascunho criado — e a única fonte desse fato, neste sistema, é esta coluna.
   ============================================================================ */

/** Identificador opaco da página de resposta. Nunca derivado do pedido. */
function novoToken() {
  return randomBytes(18).toString("base64url");
}

export type ConviteCandidato = {
  tipo: "compra" | "servico";
  referenciaId: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  email: string;
  concluidaEm: Date | null;
  concluida: boolean;
  jaTemConvite: boolean;
  ultimoConviteAoCliente: Date | null;
};

export type ResultadoDaFila = {
  criados: number;
  ignorados: { numero: string; motivo: MotivoDeInelegibilidade }[];
};

/**
 * Cria convites em rascunho para tudo que estiver elegível.
 *
 * Não envia. Não decide por nota, valor ou histórico — a elegibilidade é a de
 * `motivoDeInelegibilidade`, que não recebe nada disso.
 */
export async function montarFilaDeConvites(agora = new Date()): Promise<ResultadoDaFila> {
  const candidatos = await candidatosAConvite();
  const resultado: ResultadoDaFila = { criados: 0, ignorados: [] };

  for (const candidato of candidatos) {
    const motivo = motivoDeInelegibilidade(
      {
        concluida: candidato.concluida,
        concluidaEm: candidato.concluidaEm,
        jaTemConvite: candidato.jaTemConvite,
        ultimoConviteAoCliente: candidato.ultimoConviteAoCliente,
        temEmail: Boolean(candidato.email),
      },
      agora,
    );

    if (motivo) {
      resultado.ignorados.push({ numero: candidato.numero, motivo });
      continue;
    }

    await prisma.reviewRequest.create({
      data: {
        customerId: candidato.clienteId,
        kind: candidato.tipo,
        orderId: candidato.tipo === "compra" ? candidato.referenciaId : null,
        workOrderId: candidato.tipo === "servico" ? candidato.referenciaId : null,
        status: "rascunho",
        token: novoToken(),
        channel: "email",
      },
    });
    resultado.criados += 1;
  }

  return resultado;
}

/** Pedidos entregues e OS concluídas, com o que a regra de elegibilidade pede. */
async function candidatosAConvite(): Promise<ConviteCandidato[]> {
  const [pedidos, ordens, ultimosConvites] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["entregue", "concluido"] }, customerId: { not: null } },
      orderBy: { deliveredAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        deliveredAt: true,
        closedAt: true,
        buyerEmail: true,
        customer: { select: { id: true, name: true, email: true } },
        reviewRequest: { select: { id: true } },
      },
    }),
    prisma.workOrder.findMany({
      where: { status: "concluida", closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        closedAt: true,
        reviewRequest: { select: { id: true } },
        request: { select: { customer: { select: { id: true, name: true, email: true } } } },
      },
    }),
    prisma.reviewRequest.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { customerId: true, sentAt: true },
    }),
  ]);

  /* Último convite ENVIADO por cliente. Rascunho não conta: ele não chegou a
     ninguém, e usá-lo aqui bloquearia o primeiro envio de todo mundo. */
  const ultimoPorCliente = new Map<string, Date>();
  for (const convite of ultimosConvites) {
    if (!convite.sentAt) continue;
    const atual = ultimoPorCliente.get(convite.customerId);
    if (!atual || convite.sentAt > atual) ultimoPorCliente.set(convite.customerId, convite.sentAt);
  }

  const candidatos: ConviteCandidato[] = [];

  for (const pedido of pedidos) {
    if (!pedido.customer) continue;
    candidatos.push({
      tipo: "compra",
      referenciaId: pedido.id,
      numero: pedido.number,
      clienteId: pedido.customer.id,
      clienteNome: pedido.customer.name,
      email: pedido.customer.email || pedido.buyerEmail || "",
      concluida: true,
      concluidaEm: pedido.deliveredAt ?? pedido.closedAt,
      jaTemConvite: Boolean(pedido.reviewRequest),
      ultimoConviteAoCliente: ultimoPorCliente.get(pedido.customer.id) ?? null,
    });
  }

  for (const ordem of ordens) {
    const cliente = ordem.request?.customer;
    if (!cliente) continue;
    candidatos.push({
      tipo: "servico",
      referenciaId: ordem.id,
      numero: ordem.number,
      clienteId: cliente.id,
      clienteNome: cliente.name,
      email: cliente.email,
      concluida: true,
      concluidaEm: ordem.closedAt,
      jaTemConvite: Boolean(ordem.reviewRequest),
      ultimoConviteAoCliente: ultimoPorCliente.get(cliente.id) ?? null,
    });
  }

  return candidatos;
}

/* ------------------------------------------------------------- o portão */

export type ResultadoDoEnvio =
  | { ok: true; jaEstavaEnviado: boolean }
  | { ok: false; motivo: string };

/**
 * Envia um convite — se, e somente se, a JB tiver autorizado o envio.
 *
 * O portão é uma configuração, não uma variável de ambiente, porque quem
 * autoriza é a JB no painel e não quem faz deploy. Desligado, a fila continua
 * sendo montada e nada sai.
 */
export async function enviarConvite(id: string): Promise<ResultadoDoEnvio> {
  const s = await getSettings();

  if (!ligado(s.avaliacoes_envio)) {
    return {
      ok: false,
      motivo:
        "O envio de convites está desligado. Ligue em Configurações › Avaliações quando a JB " +
        "quiser começar a pedir avaliação — até lá, os convites ficam em rascunho e ninguém " +
        "recebe e-mail.",
    };
  }

  const convite = await prisma.reviewRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      token: true,
      kind: true,
      customer: { select: { name: true, email: true } },
      order: { select: { number: true } },
      workOrder: { select: { number: true } },
    },
  });
  if (!convite) return { ok: false, motivo: "Convite não encontrado." };
  if (convite.status === "enviado" || convite.status === "respondido") {
    return { ok: true, jaEstavaEnviado: true };
  }
  if (!convite.customer.email) {
    return { ok: false, motivo: "Este cliente não tem e-mail cadastrado." };
  }

  const numero = convite.order?.number ?? convite.workOrder?.number ?? "";
  const link = urlAbsoluta(`/avaliar/${convite.token}`);

  const resultado = await enfileirar({
    canal: "email",
    para: convite.customer.email,
    assunto:
      convite.kind === "compra"
        ? "Como foi a sua compra na JB?"
        : "Como foi o atendimento técnico da JB?",
    corpo:
      `Olá, ${convite.customer.name}.\n\n` +
      `Queremos saber como foi ${convite.kind === "compra" ? `o pedido ${numero}` : `o atendimento ${numero}`}. ` +
      "São duas perguntas, leva menos de um minuto:\n\n" +
      `${link}\n\n` +
      "A sua resposta chega direto para a equipe. Ela só vira depoimento público se você " +
      "autorizar, e a autorização é uma caixa que você marca — ou não.\n",
    refTipo: "avaliacao",
    refId: convite.id,
    template: "avaliacao_convite",
  });

  if (!resultado.ok) {
    await prisma.reviewRequest.update({
      where: { id },
      data: { status: "falhou", failureReason: resultado.motivo },
    });
    return { ok: false, motivo: resultado.motivo };
  }

  /* `sentAt` é carimbado AQUI e em nenhum outro lugar. É o único fato que
     sustenta a afirmação "a JB pediu avaliação a esta pessoa". */
  await prisma.reviewRequest.update({
    where: { id },
    data: { status: "enviado", sentAt: new Date(), failureReason: "" },
  });

  return { ok: true, jaEstavaEnviado: resultado.jaExistia };
}
