import "server-only";

import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { somenteDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Avisos e fila de mensagens.
 *
 * Duas coisas diferentes moram aqui:
 *
 * 1. `notificar` — o aviso que aparece dentro do site, na área do cliente.
 *    Grava `Notification`, que é lido pela campainha e pela lista de avisos.
 *
 * 2. `enfileirar` — a mensagem que sai da JB por e-mail ou WhatsApp. Grava
 *    `OutboundMessage` com status `pendente`. NADA é enviado aqui: o envio
 *    real é do worker em `@/lib/mensageria`, chamado pelo cron de `/api/fila`
 *    ou pelo botão de `/admin/mensagens`. Ele lê as pendentes com
 *    `mensagensPendentes`, renderiza o template pelo par (`template`,
 *    `refTipo`/`refId`) e fecha cada uma com `concluirMensagem`. Não há
 *    integração de e-mail ou WhatsApp neste arquivo, e não deve haver: quem
 *    chama não pode ficar esperando rede.
 *
 * O schema de `OutboundMessage` guarda canal, destinatário, template, chave de
 * deduplicação e status — não guarda assunto nem corpo. Por isso o corpo é
 * devolvido a quem chama (útil para montar um link de WhatsApp na hora) e o
 * worker rerenderiza a partir do template quando for enviar de fato.
 */

/* ------------------------------------------------------------------- tipos */

export const TIPOS_NOTIFICACAO = {
  pedido: "Pedido",
  pagamento: "Pagamento",
  entrega: "Entrega",
  chamado: "Assistência",
  ordem: "Ordem de serviço",
  orcamento: "Orçamento",
  manutencao: "Manutenção",
  contrato: "Contrato",
  documento: "Documento",
  suporte: "Suporte",
  conta: "Conta",
  geral: "Aviso",
} as const;

export type TipoNotificacao = keyof typeof TIPOS_NOTIFICACAO;

export const CANAIS = {
  email: "E-mail",
  whatsapp: "WhatsApp",
} as const;

export type CanalMensagem = keyof typeof CANAIS;

export const STATUS_MENSAGEM = {
  pendente: "Na fila",
  enviado: "Enviado",
  falhou: "Falhou",
  simulado: "Simulado",
} as const;

export type StatusMensagem = keyof typeof STATUS_MENSAGEM;

/** Cliente final (tem caixa de avisos) ou pessoa da equipe (não tem). */
export type DestinoNotificacao = { customerId: string } | { userId: string };

export type EntradaNotificacao = DestinoNotificacao & {
  tipo: TipoNotificacao;
  titulo: string;
  corpo?: string;
  /** Para onde o aviso leva. Sempre um caminho interno. */
  href?: string;
};

export type ResultadoNotificacao =
  | { ok: true; canal: "app"; id: string }
  | { ok: true; canal: "email"; id: string; jaExistia: boolean }
  | { ok: false; motivo: string };

function ehCliente(destino: DestinoNotificacao): destino is { customerId: string } {
  return "customerId" in destino && Boolean(destino.customerId);
}

function limpar(texto: string | undefined, limite: number) {
  return (texto ?? "").replace(/\s+/g, " ").trim().slice(0, limite);
}

/**
 * Registra o aviso para quem for o destino.
 *
 * Cliente recebe na caixa de avisos do site. A equipe interna não tem caixa de
 * avisos no banco (não existe tabela para isso), então o aviso para `userId`
 * vira uma mensagem de e-mail na fila — mesmo conteúdo, outro caminho.
 */
export async function notificar(entrada: EntradaNotificacao): Promise<ResultadoNotificacao> {
  const titulo = limpar(entrada.titulo, 180);
  if (!titulo) return { ok: false, motivo: "Aviso sem título." };

  const corpo = limpar(entrada.corpo, 2000);
  const href = entrada.href?.trim() || null;

  try {
    if (ehCliente(entrada)) {
      const criado = await prisma.notification.create({
        data: {
          customerId: entrada.customerId,
          kind: entrada.tipo,
          title: titulo,
          body: corpo,
          href,
        },
        select: { id: true },
      });
      return { ok: true, canal: "app", id: criado.id };
    }

    const pessoa = await prisma.user.findUnique({
      where: { id: entrada.userId },
      select: { email: true, active: true },
    });
    if (!pessoa || !pessoa.active) {
      return { ok: false, motivo: "Pessoa da equipe não encontrada ou inativa." };
    }

    const resultado = await enfileirar({
      canal: "email",
      para: pessoa.email,
      assunto: titulo,
      corpo,
      refTipo: `aviso:${entrada.tipo}`,
      refId: entrada.userId,
      template: `aviso_${entrada.tipo}`,
      // dois avisos diferentes para a mesma pessoa não podem se anular
      dedupeKey: chaveDeDeduplicacao(
        "email",
        `aviso_${entrada.tipo}`,
        `aviso:${entrada.tipo}`,
        `${entrada.userId}:${resumoDeConteudo(titulo, corpo, href)}`,
      ),
    });

    if (!resultado.ok) return resultado;
    return { ok: true, canal: "email", id: resultado.id, jaExistia: resultado.jaExistia };
  } catch (erro) {
    console.error("Falha ao registrar notificação", erro);
    return { ok: false, motivo: "Não foi possível registrar o aviso." };
  }
}

/* -------------------------------------------------------- fila de mensagens */

export type EntradaMensagem = {
  canal: CanalMensagem;
  /** E-mail ou telefone, conforme o canal. */
  para: string;
  assunto: string;
  corpo: string;
  /** O que originou a mensagem: "pedido", "chamado", "orcamento"… */
  refTipo: string;
  refId: string;
  /** Nome do template que o worker vai renderizar. Padrão: o próprio refTipo. */
  template?: string;
  /** Padrão: canal|template|refTipo|refId. Informe para deduplicar diferente. */
  dedupeKey?: string;
};

export type ResultadoMensagem =
  | {
      ok: true;
      id: string;
      /** `true` quando a mesma mensagem já estava na fila (nada foi duplicado). */
      jaExistia: boolean;
      dedupeKey: string;
      para: string;
      assunto: string;
      corpo: string;
    }
  | { ok: false; motivo: string };

export function chaveDeDeduplicacao(
  canal: string,
  template: string,
  refTipo: string,
  refId: string,
) {
  return `${canal}|${template}|${refTipo}|${refId}`;
}

function resumoDeConteudo(...partes: (string | null | undefined)[]) {
  return crypto.createHash("sha1").update(partes.join("|")).digest("hex").slice(0, 12);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normaliza o destinatário conforme o canal. Vazio = destino inválido. */
function normalizarDestinatario(canal: CanalMensagem, para: string) {
  const valor = (para ?? "").trim();
  if (canal === "email") {
    const email = valor.toLowerCase();
    return EMAIL.test(email) ? email : "";
  }
  const digitos = somenteDigitos(valor);
  if (digitos.length < 10) return "";
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

/**
 * Coloca a mensagem na fila com status `pendente`. Idempotente pela
 * `dedupeKey`: chamar duas vezes para o mesmo fato não gera dois envios.
 */
export async function enfileirar(entrada: EntradaMensagem): Promise<ResultadoMensagem> {
  const para = normalizarDestinatario(entrada.canal, entrada.para);
  if (!para) {
    return {
      ok: false,
      motivo: entrada.canal === "email" ? "E-mail inválido." : "Telefone inválido.",
    };
  }

  const assunto = limpar(entrada.assunto, 200);
  const corpo = (entrada.corpo ?? "").trim().slice(0, 8000);
  const template = (entrada.template ?? entrada.refTipo).trim() || "geral";
  const dedupeKey =
    entrada.dedupeKey?.trim() ||
    chaveDeDeduplicacao(entrada.canal, template, entrada.refTipo, entrada.refId);

  const pronto = (id: string, jaExistia: boolean): ResultadoMensagem => ({
    ok: true,
    id,
    jaExistia,
    dedupeKey,
    para,
    assunto,
    corpo,
  });

  try {
    const criada = await prisma.outboundMessage.create({
      data: {
        channel: entrada.canal,
        to: para,
        template,
        dedupeKey,
        status: "pendente" satisfies StatusMensagem,
      },
      select: { id: true },
    });
    return pronto(criada.id, false);
  } catch (erro) {
    // P2002: já existe mensagem com esta chave — é exatamente o que se quer
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      const existente = await prisma.outboundMessage.findUnique({
        where: { dedupeKey },
        select: { id: true },
      });
      if (existente) return pronto(existente.id, true);
    }
    console.error("Falha ao enfileirar mensagem", erro);
    return { ok: false, motivo: "Não foi possível enfileirar a mensagem." };
  }
}

/** O worker chama isto para pegar o próximo lote. Mais antigas primeiro. */
export async function mensagensPendentes(limite = 50) {
  return prisma.outboundMessage.findMany({
    where: { status: "pendente" },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limite, 1), 200),
  });
}

/** Fecha uma mensagem da fila depois da tentativa de envio. */
export async function concluirMensagem(
  id: string,
  status: Exclude<StatusMensagem, "pendente">,
  erro = "",
) {
  await prisma.outboundMessage.update({
    where: { id },
    data: { status, error: erro.slice(0, 500) },
  });
}

/* ---------------------------------------------------------- caixa de avisos */

export async function listarNotificacoes(opcoes: {
  customerId: string;
  apenasNaoLidas?: boolean;
  limite?: number;
}) {
  return prisma.notification.findMany({
    where: {
      customerId: opcoes.customerId,
      ...(opcoes.apenasNaoLidas ? { readAt: null } : {}),
    },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(opcoes.limite ?? 20, 1), 100),
  });
}

/**
 * Marca como lida. O `customerId` faz parte do filtro de propósito: um id de
 * aviso adivinhado não abre o aviso de outra pessoa.
 */
export async function marcarComoLida(customerId: string, notificacaoId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificacaoId, customerId, readAt: null },
    data: { readAt: new Date() },
  });
  return count > 0;
}

export async function marcarTodasComoLidas(customerId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { customerId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}

/**
 * Quantos avisos não lidos o destino tem.
 *
 * A equipe interna sempre devolve 0: os avisos dela saem por e-mail, não há
 * caixa de avisos no banco para `User`.
 */
export async function naoLidas(destino: DestinoNotificacao): Promise<number> {
  if (!ehCliente(destino)) return 0;
  return prisma.notification.count({
    where: { customerId: destino.customerId, readAt: null },
  });
}
