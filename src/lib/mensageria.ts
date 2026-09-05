import "server-only";

import { diagnosticoDeEmail, provedorDeEmail } from "@/lib/email";
import { montarMensagem, type LinhaDaFila } from "@/lib/email/registro";
import { concluirMensagem, mensagensPendentes } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";

/**
 * O worker da fila de saída.
 *
 * `@/lib/notificacoes` só sabe ENFILEIRAR (`OutboundMessage` com status
 * `pendente`). Este arquivo é a outra metade: pega o lote, remonta o texto pelo
 * template, entrega pelo provedor de `@/lib/email` e fecha cada linha. Quem
 * chama é a rota `/api/fila` (cron da Vercel) ou o botão "processar agora" da
 * tela `/admin/mensagens`.
 *
 * IDEMPOTÊNCIA — POR QUE EXISTE UM STATUS "enviando"
 *
 * Duas execuções podem se cruzar: o cron de dez em dez minutos e alguém
 * clicando "processar agora". Se as duas lessem as mesmas pendentes, o cliente
 * receberia o mesmo e-mail duas vezes. Por isso cada linha é RESERVADA antes do
 * envio, com a guarda dentro da condição do UPDATE:
 *
 *     updateMany({ where: { id, status: "pendente" }, data: { status: "enviando" } })
 *
 * `count === 0` significa que outra execução chegou primeiro — esta pula a
 * linha. Quem já saiu (`enviado`, `simulado`, `falhou`) nunca volta ao lote.
 *
 * COMO A RESERVA É DESTRAVADA (schema congelado)
 *
 * `OutboundMessage` não tem `updatedAt` nem coluna de tentativa — e o schema
 * não pode ser alterado. Sem marca de tempo, uma execução que morresse no meio
 * (timeout da função, deploy) deixaria a linha presa em `enviando` para sempre.
 * A solução usa a única coluna de texto livre que existe, `error`: a reserva
 * grava ali `processando desde <ISO>`. Passados dez minutos, a linha volta
 * sozinha para `pendente` no começo da execução seguinte — e a volta também é
 * guardada pelo valor exato gravado, então duas execuções não competem por ela.
 * Não é bonito; é o que dá para fazer sem migration, e está tudo aqui.
 */

/* ---------------------------------------------------------------- estados */

const PENDENTE = "pendente";
const ENVIANDO = "enviando";
const ENVIADO = "enviado";
const SIMULADO = "simulado";
const FALHOU = "falhou";

/** Status que a tela conhece, na ordem em que interessam. */
export const STATUS_DA_FILA = {
  pendente: "Na fila",
  enviando: "Em processamento",
  enviado: "Enviado",
  simulado: "Só registrado",
  falhou: "Falhou",
} as const;

export type StatusDaFila = keyof typeof STATUS_DA_FILA;

export function ehStatusDaFila(valor: string): valor is StatusDaFila {
  return valor in STATUS_DA_FILA;
}

export const LIMITE_PADRAO = 25;
const LIMITE_MAXIMO = 100;
/**
 * Prefixo gravado em `error` enquanto a linha está reservada. Exportado porque
 * a tela precisa reconhecer esse texto como estado, não como mensagem de erro.
 */
export const MARCA_RESERVA = "processando desde ";
const RESERVA_EXPIRA_MS = 10 * 60_000;

/* ------------------------------------------------------------------ tipos */

export type ResumoDaFila = {
  /** Quantas linhas o lote tentou processar. */
  processadas: number;
  enviadas: number;
  /** Montadas e registradas, mas não entregues (provedor de registro). */
  simuladas: number;
  falhas: number;
  /** Linhas que outra execução já tinha reservado. */
  puladas: number;
  /** Reservas velhas devolvidas para a fila no começo desta execução. */
  destravadas: number;
  /** Quanto ainda sobrou pendente depois do lote. */
  restantes: number;
  provedor: string;
  entrega: boolean;
  duracaoMs: number;
};

const SELECAO = {
  id: true,
  channel: true,
  to: true,
  template: true,
  dedupeKey: true,
  createdAt: true,
} as const;

/* --------------------------------------------------------------- destrava */

/**
 * Devolve para a fila as reservas antigas demais para serem de uma execução
 * viva. Nunca lança: destravar é manutenção, não pode impedir o lote.
 */
async function destravarReservasVelhas(): Promise<number> {
  try {
    const presas = await prisma.outboundMessage.findMany({
      where: { status: ENVIANDO, error: { startsWith: MARCA_RESERVA } },
      select: { id: true, error: true },
      take: LIMITE_MAXIMO,
    });

    const limite = Date.now() - RESERVA_EXPIRA_MS;
    let devolvidas = 0;

    for (const linha of presas) {
      const quando = Date.parse(linha.error.slice(MARCA_RESERVA.length));
      if (!Number.isFinite(quando) || quando > limite) continue;

      // A guarda é o valor exato lido: se outra execução reservou de novo no
      // meio do caminho, o texto mudou e este UPDATE não pega nada.
      const { count } = await prisma.outboundMessage.updateMany({
        where: { id: linha.id, status: ENVIANDO, error: linha.error },
        data: { status: PENDENTE, error: "" },
      });
      devolvidas += count;
    }

    return devolvidas;
  } catch (erro) {
    console.error("[fila] falha ao destravar reservas antigas", erro);
    return 0;
  }
}

/** Reserva a linha para esta execução. `false` = outra chegou primeiro. */
async function reservar(id: string): Promise<boolean> {
  const { count } = await prisma.outboundMessage.updateMany({
    where: { id, status: PENDENTE },
    data: { status: ENVIANDO, error: `${MARCA_RESERVA}${new Date().toISOString()}` },
  });
  return count === 1;
}

/**
 * Fecha a linha depois da tentativa.
 *
 * Usa `concluirMensagem` de `@/lib/notificacoes` — a função que existia sem um
 * único chamador. Ela fecha pelo id, sem condição de status, e aqui isso é
 * seguro: a linha só chega neste ponto depois de `reservar()` ter vencido a
 * corrida, então a reserva é a guarda.
 */
async function fechar(id: string, status: Desfecho["status"], erro = "") {
  try {
    await concluirMensagem(id, status, erro);
  } catch (falha) {
    // Linha apagada no meio do caminho, ou banco indisponível: registrar e
    // seguir. Interromper o laço deixaria o resto do lote sem tentativa.
    console.error(`[fila] não foi possível fechar a mensagem ${id} como "${status}"`, falha);
  }
}

/* ------------------------------------------------------------ processamento */

type Desfecho = { status: typeof ENVIADO | typeof SIMULADO | typeof FALHOU; erro: string };

/** Entrega uma linha já reservada. Nunca lança. */
async function entregar(linha: LinhaDaFila): Promise<Desfecho> {
  if (linha.channel !== "email") {
    return {
      status: FALHOU,
      erro: `Canal "${linha.channel}" não tem provedor configurado nesta plataforma.`,
    };
  }

  const montada = await montarMensagem(linha);
  if (!montada.ok) return { status: FALHOU, erro: montada.erro };

  const resultado = await provedorDeEmail().enviar({
    para: linha.to,
    assunto: montada.conteudo.assunto,
    texto: montada.conteudo.texto,
    html: montada.conteudo.html,
  });

  if (!resultado.ok) return { status: FALHOU, erro: resultado.erro };

  if (!resultado.entregue) {
    // "simulado" é a diferença entre "saiu" e "sabemos o que teria saído".
    return {
      status: SIMULADO,
      erro: resultado.aviso ?? "Mensagem apenas registrada: nenhum provedor de envio configurado.",
    };
  }

  return { status: ENVIADO, erro: "" };
}

/**
 * Processa um lote da fila.
 *
 * Nunca lança e nunca reprocessa o que já saiu. O limite existe porque a
 * função serverless tem teto de tempo: é melhor mandar 25 e voltar no próximo
 * gatilho do que estourar no meio do lote.
 */
export async function processarFila(opcoes: { limite?: number } = {}): Promise<ResumoDaFila> {
  const comeco = Date.now();
  const diagnostico = diagnosticoDeEmail();
  const limite = Math.min(Math.max(Math.trunc(opcoes.limite ?? LIMITE_PADRAO), 1), LIMITE_MAXIMO);

  const destravadas = await destravarReservasVelhas();

  // `mensagensPendentes` já traz as mais antigas primeiro, com o teto aplicado.
  const lote = await mensagensPendentes(limite);

  let enviadas = 0;
  let simuladas = 0;
  let falhas = 0;
  let puladas = 0;

  for (const linha of lote) {
    if (!(await reservar(linha.id))) {
      puladas += 1;
      continue;
    }

    let desfecho: Desfecho;
    try {
      desfecho = await entregar(linha);
    } catch (erro) {
      // Rede de segurança: um modelo ou provedor que lance mesmo assim não
      // pode deixar a linha presa em "enviando".
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      desfecho = { status: FALHOU, erro: `Erro inesperado no envio: ${detalhe}` };
    }

    await fechar(linha.id, desfecho.status, desfecho.erro);

    if (desfecho.status === ENVIADO) enviadas += 1;
    else if (desfecho.status === SIMULADO) simuladas += 1;
    else falhas += 1;
  }

  const restantes = await prisma.outboundMessage.count({ where: { status: PENDENTE } });

  return {
    processadas: lote.length - puladas,
    enviadas,
    simuladas,
    falhas,
    puladas,
    destravadas,
    restantes,
    provedor: diagnostico.provedor,
    entrega: diagnostico.entrega,
    duracaoMs: Date.now() - comeco,
  };
}

export type ResultadoDeUma =
  | { ok: true; status: StatusDaFila; detalhe: string }
  | { ok: false; erro: string };

/**
 * Recoloca uma mensagem na fila e a processa na hora.
 *
 * É o "reenviar" da tela. Uma linha reservada por outra execução não é tocada;
 * qualquer outro status (inclusive `enviado`) pode ser reenviado, porque quem
 * clica é gente da JB decidindo mandar de novo.
 */
export async function reenviarMensagem(id: string): Promise<ResultadoDeUma> {
  const linha = await prisma.outboundMessage.findUnique({ where: { id }, select: SELECAO });
  if (!linha) return { ok: false, erro: "Mensagem não encontrada." };

  const { count } = await prisma.outboundMessage.updateMany({
    where: { id, status: { not: ENVIANDO } },
    data: { status: ENVIANDO, error: `${MARCA_RESERVA}${new Date().toISOString()}` },
  });
  if (count === 0) {
    return { ok: false, erro: "Esta mensagem já está sendo processada agora. Tente em instantes." };
  }

  let desfecho: Desfecho;
  try {
    desfecho = await entregar(linha);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    desfecho = { status: FALHOU, erro: `Erro inesperado no envio: ${detalhe}` };
  }

  await fechar(id, desfecho.status, desfecho.erro);

  if (desfecho.status === FALHOU) return { ok: false, erro: desfecho.erro };

  return {
    ok: true,
    status: desfecho.status,
    detalhe:
      desfecho.status === ENVIADO
        ? `Mensagem enviada para ${linha.to}.`
        : `Mensagem registrada para ${linha.to}, sem envio: ${desfecho.erro}`,
  };
}

/** Contagem por status, para os selos da tela. */
export async function contarPorStatus(): Promise<Record<string, number>> {
  const grupos = await prisma.outboundMessage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const contagem: Record<string, number> = {};
  for (const grupo of grupos) contagem[grupo.status] = grupo._count._all;
  return contagem;
}
