import { describe, expect, it, vi } from "vitest";
import type { ServiceRequestStatus } from "@prisma/client";

import { ROTULO_CHAMADO, passosDoChamado } from "@/lib/assistencia";

/**
 * `@/lib/assistencia` fala com o Postgres nas outras funções do arquivo, mas
 * `passosDoChamado` é pura: recebe o chamado já lido e devolve a linha do
 * tempo. O dublê do cliente do Prisma existe só para o módulo poder ser
 * importado sem abrir conexão — `vi.mock` é içado para antes dos imports.
 */
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

/* ==========================================================================
   Linha do tempo do chamado

   Seis etapas visíveis para catorze status. O que precisa ser verdade:

   1. chamado em andamento tem exatamente uma etapa "atual", com as anteriores
      concluídas e as seguintes ainda por vir;
   2. chamado concluído não tem etapa "atual" — o atendimento terminou;
   3. chamado CANCELADO não pode exibir etapa concluída que não aconteceu.
      Era o defeito: o evento de cancelamento caía na etapa "Concluído" (as
      duas fecham o chamado, e `ETAPA_DO_STATUS` as agrupa), e o cliente via as
      seis etapas com ✓ — inclusive "Equipamento testado e devolvido em
      funcionamento".
   ========================================================================== */

const ABERTURA = new Date("2026-02-02T10:00:00-03:00");

function evento(status: ServiceRequestStatus, minutos: number) {
  return { status, createdAt: new Date(ABERTURA.getTime() + minutos * 60_000) };
}

const ETAPAS = [
  "solicitacao_recebida",
  "triagem",
  "visita_agendada",
  "em_diagnostico",
  "em_manutencao",
  "concluido",
] as const satisfies readonly ServiceRequestStatus[];

/** Índice da etapa pelo rótulo que o cliente lê. */
function indiceDe(etapa: (typeof ETAPAS)[number]) {
  return ETAPAS.indexOf(etapa);
}

describe("chamado em andamento", () => {
  const passos = passosDoChamado({
    status: "em_diagnostico",
    createdAt: ABERTURA,
    closedAt: null,
    events: [
      evento("solicitacao_recebida", 0),
      evento("triagem", 30),
      evento("visita_agendada", 90),
      evento("em_diagnostico", 240),
    ],
  });

  it("mostra só as seis etapas visíveis", () => {
    expect(passos).toHaveLength(ETAPAS.length);
    expect(passos.map((p) => p.titulo)).toEqual(ETAPAS.map((e) => ROTULO_CHAMADO[e]));
  });

  it("tem uma única etapa atual, na altura do status", () => {
    const atuais = passos.filter((p) => p.estado === "atual");
    expect(atuais).toHaveLength(1);
    expect(atuais[0]?.titulo).toBe(ROTULO_CHAMADO.em_diagnostico);
  });

  it("conclui o que passou e deixa o resto como futuro", () => {
    expect(passos.map((p) => p.estado)).toEqual([
      "concluido",
      "concluido",
      "concluido",
      "atual",
      "futuro",
      "futuro",
    ]);
  });

  it("data a etapa pelo primeiro evento que a alcançou", () => {
    expect(passos[indiceDe("triagem")]?.quando).toBeTruthy();
    // etapa que ainda não aconteceu não inventa data
    expect(passos[indiceDe("em_manutencao")]?.quando).toBeUndefined();
  });

  it("status que não é etapa cai na etapa a que pertence", () => {
    const aguardando = passosDoChamado({
      status: "aguardando_cliente",
      createdAt: ABERTURA,
      closedAt: null,
      events: [evento("triagem", 30)],
    });

    expect(aguardando.filter((p) => p.estado === "atual")[0]?.titulo).toBe(ROTULO_CHAMADO.triagem);
  });
});

describe("chamado concluído", () => {
  const passos = passosDoChamado({
    status: "concluido",
    createdAt: ABERTURA,
    closedAt: new Date("2026-02-09T15:00:00-03:00"),
    events: [
      evento("triagem", 30),
      evento("visita_agendada", 90),
      evento("em_diagnostico", 240),
      evento("em_manutencao", 600),
      evento("concluido", 900),
    ],
  });

  it("fecha todas as seis etapas, sem etapa atual nem futura", () => {
    expect(passos).toHaveLength(ETAPAS.length);
    expect(passos.every((p) => p.estado === "concluido")).toBe(true);
  });

  it("não acrescenta passo de cancelamento", () => {
    expect(passos.some((p) => p.titulo === "Chamado cancelado")).toBe(false);
  });
});

describe("chamado cancelado", () => {
  const CANCELAMENTO = new Date("2026-02-03T11:00:00-03:00");

  const passos = passosDoChamado({
    status: "cancelado",
    createdAt: ABERTURA,
    closedAt: CANCELAMENTO,
    events: [evento("triagem", 30), evento("cancelado", 1500)],
  });

  it("não marca como concluída a etapa 'Concluído' — era o defeito", () => {
    const conclusao = passos.find((p) => p.titulo === ROTULO_CHAMADO.concluido);
    expect(conclusao?.estado).toBe("cancelado");
  });

  it("conclui só o que o atendimento realmente passou", () => {
    expect(passos.slice(0, ETAPAS.length).map((p) => p.estado)).toEqual([
      // a solicitação foi recebida e a triagem começou: a primeira etapa fechou
      "concluido",
      // parou na triagem — chegou, não terminou
      "cancelado",
      "cancelado",
      "cancelado",
      "cancelado",
      "cancelado",
    ]);
  });

  it("não deixa etapa 'atual' nem 'futura' num chamado que não anda mais", () => {
    expect(passos.some((p) => p.estado === "atual" || p.estado === "futuro")).toBe(false);
  });

  it("acrescenta o passo do cancelamento, com a data do fechamento", () => {
    const ultimo = passos.at(-1);
    expect(passos).toHaveLength(ETAPAS.length + 1);
    expect(ultimo?.titulo).toBe("Chamado cancelado");
    expect(ultimo?.estado).toBe("cancelado");
    expect(ultimo?.quando).toBeTruthy();
  });

  it("o evento de cancelamento não data a etapa 'Concluído'", () => {
    expect(passos[indiceDe("concluido")]?.quando).toBeUndefined();
  });

  it("cancelado logo na abertura não mostra nenhuma etapa concluída", () => {
    const cedo = passosDoChamado({
      status: "cancelado",
      createdAt: ABERTURA,
      closedAt: new Date(ABERTURA.getTime() + 5 * 60_000),
      events: [evento("cancelado", 5)],
    });

    expect(cedo.some((p) => p.estado === "concluido")).toBe(false);
    expect(cedo.at(-1)?.titulo).toBe("Chamado cancelado");
  });

  it("sem lista de eventos ainda desenha a linha inteira", () => {
    const semEventos = passosDoChamado({
      status: "cancelado",
      createdAt: ABERTURA,
      closedAt: null,
    });

    expect(semEventos).toHaveLength(ETAPAS.length + 1);
    // sem data de fechamento o passo existe, mas não inventa quando
    expect(semEventos.at(-1)?.quando).toBeUndefined();
  });
});
