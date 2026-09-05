import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderStatus, type Order } from "@prisma/client";

import { FLUXO_PADRAO, ROTULO_STATUS } from "@/lib/pedido";

/* ==========================================================================
   Estado do pedido

   Duas coisas são testadas aqui:

   1. o vocabulário — todo status do banco tem rótulo em português, e o fluxo
      exibido ao cliente é um subconjunto ordenado desses status;
   2. as recusas de `mudarStatusPedido` — as transições que o painel NÃO pode
      fazer, porque cada uma delas tem efeito colateral que precisa passar por
      outro caminho (cancelar devolve estoque, pagar cria equipamento).

   O segundo grupo usa dublês para todo o entorno da ação: banco, permissão,
   auditoria, fila de aviso e revalidação. O que está sob teste é a decisão,
   não a persistência.
   ========================================================================== */

const pedidoNoBanco = vi.fn<() => Promise<Partial<Order> | null>>();
const confirmarPagamento = vi.fn(async () => undefined);
const mudarStatus = vi.fn(async () => undefined);
const cancelarPedido = vi.fn(async () => undefined);
const registrarAuditoria = vi.fn(async () => undefined);

vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect não deveria ser chamado neste teste");
  },
}));
vi.mock("@/lib/permissoes", () => ({
  exigirEdicao: async () => ({ id: "usuario-1", name: "Equipe JB", role: "admin" }),
  exigirLeitura: async () => ({ id: "usuario-1", name: "Equipe JB", role: "admin" }),
}));
vi.mock("@/lib/auditoria", () => ({
  registrarAuditoria: (...args: unknown[]) => registrarAuditoria(...(args as [])),
  ipAtual: async () => "127.0.0.1",
}));
vi.mock("@/lib/notificacoes", () => ({ enfileirar: async () => undefined }));
vi.mock("@/lib/upload", () => ({
  ErroDeUpload: class ErroDeUpload extends Error {},
  enviarArquivo: async () => "",
  removerArquivo: async () => undefined,
}));
vi.mock("@/lib/orcamento", () => ({
  ErroDeOrcamento: class ErroDeOrcamento extends Error {},
  aprovarOrcamento: async () => undefined,
  criarOrcamento: async () => undefined,
  enviarOrcamento: async () => undefined,
  recusarOrcamento: async () => undefined,
  substituirItens: async () => undefined,
}));
vi.mock("@/lib/pagamento", () => ({
  provedorPagamento: () => ({ nome: "mock", metodos: ["pix", "cartao"] }),
  pagamentoEhSimulado: () => true,
}));
vi.mock("@/lib/pedido", async (original) => {
  const real = await original<typeof import("@/lib/pedido")>();
  return {
    ...real,
    confirmarPagamento: (...args: unknown[]) => confirmarPagamento(...(args as [])),
    mudarStatus: (...args: unknown[]) => mudarStatus(...(args as [])),
    cancelarPedido: (...args: unknown[]) => cancelarPedido(...(args as [])),
  };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: () => pedidoNoBanco() },
  },
}));

const { mudarStatusPedido } = await import("@/app/acoes/admin-vendas");

/** Formulário do painel de status. */
function formulario(status: string, nota = "") {
  const dados = new FormData();
  dados.set("pedidoId", "pedido-1");
  dados.set("status", status);
  dados.set("nota", nota);
  return dados;
}

function pedido(parcial: Partial<Order> = {}) {
  return {
    id: "pedido-1",
    number: "JB-0001",
    status: "aguardando_pagamento" as const,
    paidAt: null,
    ...parcial,
  };
}

describe("ROTULO_STATUS", () => {
  it("cobre todos os status do banco", () => {
    for (const status of Object.values(OrderStatus)) {
      expect(ROTULO_STATUS[status], status).toBeTruthy();
    }
    expect(Object.keys(ROTULO_STATUS)).toHaveLength(Object.values(OrderStatus).length);
  });

  it("não repete rótulo — dois estados nunca leem igual na tela", () => {
    const rotulos = Object.values(ROTULO_STATUS);
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  it("está em português, sem underline de enum vazando", () => {
    for (const rotulo of Object.values(ROTULO_STATUS)) {
      expect(rotulo).not.toContain("_");
    }
  });
});

describe("FLUXO_PADRAO", () => {
  it("só contém status que existem no banco", () => {
    for (const status of FLUXO_PADRAO) {
      expect(Object.values(OrderStatus)).toContain(status);
    }
  });

  it("começa em aguardando pagamento e termina em concluído", () => {
    expect(FLUXO_PADRAO[0]).toBe("aguardando_pagamento");
    expect(FLUXO_PADRAO.at(-1)).toBe("concluido");
  });

  it("não repete etapa", () => {
    expect(new Set(FLUXO_PADRAO).size).toBe(FLUXO_PADRAO.length);
  });

  it("não mostra desfecho negativo na linha do tempo — ele é ramo, não etapa", () => {
    expect(FLUXO_PADRAO).not.toContain("cancelado");
    expect(FLUXO_PADRAO).not.toContain("reembolsado");
  });

  it("mantém a ordem em que a operação realmente acontece", () => {
    const posicao = (status: OrderStatus) => FLUXO_PADRAO.indexOf(status);
    expect(posicao("pago")).toBeGreaterThan(posicao("aguardando_pagamento"));
    expect(posicao("separacao")).toBeGreaterThan(posicao("pago"));
    expect(posicao("enviado")).toBeGreaterThan(posicao("separacao"));
    expect(posicao("entregue")).toBeGreaterThan(posicao("enviado"));
    expect(posicao("concluido")).toBeGreaterThan(posicao("entregue"));
  });
});

describe("mudarStatusPedido — transições recusadas", () => {
  beforeEach(() => {
    pedidoNoBanco.mockReset();
    confirmarPagamento.mockClear();
    mudarStatus.mockClear();
    registrarAuditoria.mockClear();
  });

  it("recusa status que não existe no banco", async () => {
    pedidoNoBanco.mockResolvedValue(pedido());
    const resultado = await mudarStatusPedido({}, formulario("entregue_ontem"));
    expect(resultado.erro).toBeTruthy();
    expect(mudarStatus).not.toHaveBeenCalled();
  });

  it("recusa pedido que não existe, sem escrever nada", async () => {
    pedidoNoBanco.mockResolvedValue(null);
    const resultado = await mudarStatusPedido({}, formulario("separacao"));
    expect(resultado.erro).toBe("Pedido não encontrado.");
    expect(mudarStatus).not.toHaveBeenCalled();
    expect(registrarAuditoria).not.toHaveBeenCalled();
  });

  it("recusa mudar para o status em que o pedido já está", async () => {
    pedidoNoBanco.mockResolvedValue(pedido({ status: "separacao" }));
    const resultado = await mudarStatusPedido({}, formulario("separacao"));
    expect(resultado.erro).toBe("O pedido já está neste status.");
    expect(resultado.campo).toBe("status");
    expect(mudarStatus).not.toHaveBeenCalled();
  });

  it("recusa cancelar por aqui — cancelar precisa devolver o estoque", async () => {
    pedidoNoBanco.mockResolvedValue(pedido({ status: "pago" }));
    const resultado = await mudarStatusPedido({}, formulario("cancelado"));
    expect(resultado.erro).toContain("cancelamento com motivo");
    expect(resultado.campo).toBe("status");
    expect(mudarStatus).not.toHaveBeenCalled();
    expect(cancelarPedido).not.toHaveBeenCalled();
  });

  it("recusa reconfirmar o pagamento de um pedido já pago", async () => {
    pedidoNoBanco.mockResolvedValue(
      pedido({ status: "separacao", paidAt: new Date("2026-02-01T12:00:00Z") }),
    );
    const resultado = await mudarStatusPedido({}, formulario("pago"));
    expect(resultado.erro).toContain("já teve o pagamento confirmado");
    expect(confirmarPagamento).not.toHaveBeenCalled();
  });

  it("recusa formulário sem pedido", async () => {
    const dados = new FormData();
    dados.set("status", "separacao");
    const resultado = await mudarStatusPedido({}, dados);
    expect(resultado.erro).toBeTruthy();
    expect(mudarStatus).not.toHaveBeenCalled();
  });
});

describe("mudarStatusPedido — transições aceitas", () => {
  beforeEach(() => {
    pedidoNoBanco.mockReset();
    confirmarPagamento.mockClear();
    mudarStatus.mockClear();
    registrarAuditoria.mockClear();
  });

  it("avança para separação registrando a nota e a auditoria", async () => {
    pedidoNoBanco.mockResolvedValue(pedido({ status: "pago", paidAt: new Date() }));
    const resultado = await mudarStatusPedido({}, formulario("separacao", "Separando na bancada."));
    expect(resultado.ok).toBe("Status atualizado.");
    expect(mudarStatus).toHaveBeenCalledTimes(1);
    expect(mudarStatus).toHaveBeenCalledWith(
      "pedido-1",
      "separacao",
      expect.objectContaining({ nota: "Separando na bancada.", userId: "usuario-1" }),
    );
    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
  });

  it("marcar como pago passa por confirmarPagamento, não por mudarStatus direto", async () => {
    pedidoNoBanco.mockResolvedValue(pedido({ status: "aguardando_pagamento", paidAt: null }));
    const resultado = await mudarStatusPedido({}, formulario("pago"));
    expect(resultado.ok).toBe("Status atualizado.");
    expect(confirmarPagamento).toHaveBeenCalledWith("pedido-1");
    expect(mudarStatus).not.toHaveBeenCalled();
  });

  it("aceita corrigir para trás — engano de operação tem conserto", async () => {
    pedidoNoBanco.mockResolvedValue(pedido({ status: "enviado", paidAt: new Date() }));
    const resultado = await mudarStatusPedido({}, formulario("separacao"));
    expect(resultado.ok).toBe("Status atualizado.");
    expect(mudarStatus).toHaveBeenCalledWith("pedido-1", "separacao", expect.anything());
  });
});
