import { beforeEach, describe, expect, it, vi } from "vitest";

const atualizarPedido = vi.fn(async () => ({}));
const criarEvento = vi.fn(async () => ({}));
const transacao = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
  fn({
    order: { update: atualizarPedido },
    orderStatusEvent: { create: criarEvento },
  }),
);

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/pedido-base", () => ({
  criarPedido: vi.fn(),
  confirmarPagamento: vi.fn(async () => undefined),
  cancelarPedido: vi.fn(async () => undefined),
  estornarPedido: vi.fn(async () => undefined),
}));
vi.mock("@/lib/melhor-envio", () => ({
  processarPedidoMelhorEnvio: vi.fn(async () => ({ ok: true })),
  cancelarEtiquetasMelhorEnvio: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/logistica-meta", () => ({
  escreverMetaMelhorEnvio: (_atual: string, _meta: unknown) => "",
  partesDoRotuloMelhorEnvio: () => null,
}));
vi.mock("@/lib/selecao-frete", () => ({
  COOKIE_ESCOLHA_FRETE: "jb_frete",
  lerEscolhaFrete: () => null,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transacao(...(args as [never])),
    order: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
  },
}));

const { mudarStatus } = await import("@/lib/pedido");

describe("borda pública de pedido", () => {
  beforeEach(() => {
    atualizarPedido.mockClear();
    criarEvento.mockClear();
    transacao.mockClear();
  });

  it("grava status e evento dentro da mesma transação", async () => {
    await mudarStatus("pedido-1", "enviado", {
      nota: "Saiu para a transportadora.",
      userId: "usuario-1",
    });

    expect(transacao).toHaveBeenCalledTimes(1);
    expect(atualizarPedido).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pedido-1" },
        data: expect.objectContaining({ status: "enviado" }),
      }),
    );
    expect(criarEvento).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "pedido-1",
        status: "enviado",
        note: "Saiu para a transportadora.",
        userId: "usuario-1",
      }),
    });
  });

  it("grava o marco temporal da etapa quando o status possui data própria", async () => {
    await mudarStatus("pedido-1", "entregue");

    const chamada = atualizarPedido.mock.calls[0]?.[0] as {
      data?: { deliveredAt?: unknown };
    };
    expect(chamada.data?.deliveredAt).toBeInstanceOf(Date);
  });
});
