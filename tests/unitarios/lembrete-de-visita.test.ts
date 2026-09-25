import { beforeEach, describe, expect, it, vi } from "vitest";

/* ==========================================================================
   Lembrete de visita de manutenção

   O defeito: o botão de lembrete gravava só `Notification` — a caixa de
   avisos da área do cliente, que saiu do site em 22/09/2026 — e depois o
   `MaintenanceReminder`, que tira a visita da lista e impede o reenvio. A tela
   respondia "Cliente avisado" e o cliente não recebia nada.

   O que precisa ser verdade agora:

   1. o lembrete vira e-mail na fila, e o registro só é gravado DEPOIS;
   2. se o e-mail não entra na fila (sem endereço, endereço inválido, banco),
      nada é registrado e a equipe é mandada ao WhatsApp;
   3. a fila guarda só template + chave: o modelo `visita_lembrete` precisa
      conseguir remontar o texto a partir da chave, sem link para `/minha-jb`.
   ========================================================================== */

const banco = vi.hoisted(() => ({
  maintenanceVisit: { findUnique: vi.fn() },
  maintenanceReminder: { createMany: vi.fn() },
}));
const fila = vi.hoisted(() => ({ enfileirar: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: banco }));
vi.mock("@/lib/notificacoes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notificacoes")>()),
  enfileirar: fila.enfileirar,
}));
vi.mock("@/lib/settings", () => ({
  getSettings: async () => ({
    empresa_nome: "JB Soluções Odontológicas",
    whatsapp: "(11) 96341-7994",
    email: "comercial@jb.test",
  }),
}));

import { montarMensagem, modeloConhecido } from "@/lib/email/registro";
import { ErroDeManutencao, enviarLembreteDaVisita } from "@/lib/manutencao";
import { chaveDeDeduplicacao } from "@/lib/notificacoes";

const PREVISTA_PARA = new Date("2026-10-06T12:00:00Z");
const EMAIL = "clinica@exemplo.com.br";

function visitaDoBanco(extra: Record<string, unknown> = {}) {
  return {
    id: "visita-1",
    status: "prevista",
    dueAt: PREVISTA_PARA,
    scheduledAt: null,
    contractId: "contrato-1",
    equipment: { customer: { email: EMAIL } },
    ...extra,
  };
}

function naFila(extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    id: "msg-1",
    jaExistia: false,
    dedupeKey: "",
    para: EMAIL,
    assunto: "",
    corpo: "",
    ...extra,
  };
}

beforeEach(() => {
  banco.maintenanceVisit.findUnique.mockResolvedValue(visitaDoBanco());
  banco.maintenanceReminder.createMany.mockResolvedValue({ count: 1 });
  fila.enfileirar.mockResolvedValue(naFila());
});

/* ---------------------------------------------------------- caso de uso */

describe("enviarLembreteDaVisita", () => {
  it("põe o e-mail na fila e só depois registra o lembrete", async () => {
    const resultado = await enviarLembreteDaVisita("visita-1", 7);

    expect(fila.enfileirar).toHaveBeenCalledWith(
      expect.objectContaining({
        canal: "email",
        para: EMAIL,
        template: "visita_lembrete",
        refTipo: "visita",
        refId: `visita-1:7d:${PREVISTA_PARA.getTime()}`,
      }),
    );
    expect(banco.maintenanceReminder.createMany).toHaveBeenCalledWith({
      data: [{ visitId: "visita-1", daysBefore: 7 }],
      skipDuplicates: true,
    });

    const [ordemDaFila] = fila.enfileirar.mock.invocationCallOrder;
    const [ordemDoRegistro] = banco.maintenanceReminder.createMany.mock.invocationCallOrder;
    expect(ordemDaFila).toBeLessThan(ordemDoRegistro);

    expect(resultado).toEqual({
      visitaId: "visita-1",
      contratoId: "contrato-1",
      para: EMAIL,
      novo: true,
    });
  });

  it("a chave separa antecedência e data: 7 dias, 1 dia e visita remarcada são e-mails diferentes", async () => {
    await enviarLembreteDaVisita("visita-1", 7);
    await enviarLembreteDaVisita("visita-1", 1);

    const remarcada = new Date("2026-10-09T17:00:00Z");
    banco.maintenanceVisit.findUnique.mockResolvedValue(
      visitaDoBanco({ status: "agendada", scheduledAt: remarcada }),
    );
    await enviarLembreteDaVisita("visita-1", 7);

    const refIds = fila.enfileirar.mock.calls.map(([entrada]) => entrada.refId);
    expect(refIds).toEqual([
      `visita-1:7d:${PREVISTA_PARA.getTime()}`,
      `visita-1:1d:${PREVISTA_PARA.getTime()}`,
      `visita-1:7d:${remarcada.getTime()}`,
    ]);
  });

  it("o mesmo lembrete de novo não vira segundo e-mail, e a trava continua idempotente", async () => {
    fila.enfileirar.mockResolvedValue(naFila({ jaExistia: true }));
    banco.maintenanceReminder.createMany.mockResolvedValue({ count: 0 });

    const resultado = await enviarLembreteDaVisita("visita-1", 7);

    expect(resultado.novo).toBe(false);
    expect(banco.maintenanceReminder.createMany).toHaveBeenCalledOnce();
  });

  it("cliente sem e-mail: manda a equipe ao WhatsApp e não registra nada", async () => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(
      visitaDoBanco({ equipment: { customer: { email: "  " } } }),
    );

    const chamada = enviarLembreteDaVisita("visita-1", 7);
    await expect(chamada).rejects.toBeInstanceOf(ErroDeManutencao);
    await expect(chamada).rejects.toThrow(/WhatsApp/);

    expect(fila.enfileirar).not.toHaveBeenCalled();
    expect(banco.maintenanceReminder.createMany).not.toHaveBeenCalled();
  });

  it("fila recusou o e-mail: o motivo aparece e o lembrete não é registrado", async () => {
    fila.enfileirar.mockResolvedValue({ ok: false, motivo: "E-mail inválido." });

    const chamada = enviarLembreteDaVisita("visita-1", 7);
    await expect(chamada).rejects.toThrow(/E-mail inválido\..*WhatsApp/);

    expect(banco.maintenanceReminder.createMany).not.toHaveBeenCalled();
  });

  it.each(["concluida", "cancelada"])("visita %s não recebe lembrete", async (status) => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(visitaDoBanco({ status }));

    await expect(enviarLembreteDaVisita("visita-1", 7)).rejects.toBeInstanceOf(ErroDeManutencao);
    expect(fila.enfileirar).not.toHaveBeenCalled();
    expect(banco.maintenanceReminder.createMany).not.toHaveBeenCalled();
  });

  it("visita inexistente é erro de domínio, não falha genérica", async () => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(null);

    await expect(enviarLembreteDaVisita("sumiu", 7)).rejects.toThrow("Visita não encontrada.");
  });
});

/* -------------------------------------------------------------- modelo */

function linhaDaFila(refId: string) {
  return {
    id: "msg-1",
    channel: "email",
    to: EMAIL,
    template: "visita_lembrete",
    dedupeKey: chaveDeDeduplicacao("email", "visita_lembrete", "visita", refId),
    createdAt: new Date("2026-09-29T12:00:00Z"),
  };
}

function visitaDoModelo(extra: Record<string, unknown> = {}) {
  return {
    status: "prevista",
    dueAt: PREVISTA_PARA,
    scheduledAt: null,
    equipment: {
      name: "Autoclave",
      brandName: "Cristófoli",
      modelName: "Vitale 21",
      room: "Sala 2",
      customer: { name: "Clínica Sorriso" },
    },
    technician: { user: { name: "Marcos" } },
    contract: { number: "CT-0007" },
    ...extra,
  };
}

describe("modelo visita_lembrete", () => {
  it("é conhecido pela fila — template desconhecido falharia no worker", () => {
    expect(modeloConhecido("visita_lembrete")).toBe(true);
  });

  it("visita prevista: lembra a data e diz que a equipe combina o horário", async () => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(visitaDoModelo());

    const montada = await montarMensagem(linhaDaFila(`visita-1:7d:${PREVISTA_PARA.getTime()}`));

    // a chave carrega antecedência e data, mas a visita é achada pelo id
    expect(banco.maintenanceVisit.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "visita-1" } }),
    );
    if (!montada.ok) throw new Error(montada.erro);
    expect(montada.conteudo.assunto).toContain("prevista para 06/10/2026");
    expect(montada.conteudo.texto).toContain("Olá, Clínica Sorriso.");
    expect(montada.conteudo.texto).toContain("Autoclave Cristófoli Vitale 21");
    expect(montada.conteudo.texto).toContain("combinar o dia e o horário");
    // técnico só é nomeado quando a visita tem hora marcada
    expect(montada.conteudo.texto).not.toContain("Marcos");
    expect(montada.conteudo.texto).not.toContain("minha-jb");
  });

  it("visita agendada: usa a hora marcada, no fuso de São Paulo", async () => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(
      visitaDoModelo({ status: "agendada", scheduledAt: new Date("2026-10-06T17:00:00Z") }),
    );

    const montada = await montarMensagem(linhaDaFila("visita-1:1d:0"));

    if (!montada.ok) throw new Error(montada.erro);
    expect(montada.conteudo.assunto).toContain("06/10/2026");
    expect(montada.conteudo.assunto).toContain("14:00");
    expect(montada.conteudo.texto).toContain("Técnico responsável: Marcos.");
    expect(montada.conteudo.texto).not.toContain("minha-jb");
  });

  it("visita cancelada antes do envio: a linha falha com o motivo, não lembra o cliente", async () => {
    banco.maintenanceVisit.findUnique.mockResolvedValue(visitaDoModelo({ status: "cancelada" }));

    const montada = await montarMensagem(linhaDaFila("visita-1:7d:0"));

    expect(montada).toEqual({ ok: false, erro: expect.stringContaining("cancelada") });
  });
});
