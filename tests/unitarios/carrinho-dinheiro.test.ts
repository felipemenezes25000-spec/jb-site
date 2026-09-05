import { describe, expect, it, vi } from "vitest";

/**
 * Regressão das três contas de dinheiro que estavam erradas no carrinho.
 *
 * As três tinham o mesmo sintoma para quem compra: um valor na tela e outro na
 * cobrança. Cada teste aqui trava uma delas.
 */
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/codigos", () => ({ tokenAleatorio: () => "token-teste" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

const { calcularTotais, descontoDoCupom, linhaElegivelAoCupom, precoDoAdicional } = await import(
  "@/lib/carrinho"
);
const { carrinho, cupom } = await import("../apoio/fabricas");

describe("preço do adicional", () => {
  it("usa o preço que o produto dá ao serviço, não o preço padrão do serviço", () => {
    // a página do produto mostra ProductAddon.priceCents; cobrar Service.priceCents
    // fazia a loja cobrar diferente do que exibiu
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 1_190_000,
            quantidade: 1,
            adicionais: [{ nome: "Instalação", precoCents: 32_000, precoNoProduto: 45_000 }],
          },
        ],
      }),
    );

    expect(totais.linhas[0].addons[0].precoUnitarioCents).toBe(45_000);
    expect(totais.subtotalCents).toBe(1_190_000 + 45_000);
  });

  it("cai no preço padrão do serviço quando o produto não define um próprio", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 1_190_000,
            adicionais: [{ nome: "Treinamento", precoCents: 38_000, precoNoProduto: null }],
          },
        ],
      }),
    );

    expect(totais.linhas[0].addons[0].precoUnitarioCents).toBe(38_000);
  });

  it("cobra o adicional por unidade: dois equipamentos são duas instalações", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 1_000_000,
            quantidade: 3,
            adicionais: [{ nome: "Instalação", precoCents: 45_000, precoNoProduto: 45_000 }],
          },
        ],
      }),
    );

    expect(totais.linhas[0].addons[0].totalCents).toBe(135_000);
    expect(totais.subtotalCents).toBe(3_000_000 + 135_000);
  });

  it("precoDoAdicional prefere o preço do produto e nunca devolve indefinido", () => {
    const lista = [{ serviceId: "s1", priceCents: 45_000 }];
    expect(precoDoAdicional(lista, "s1", 32_000)).toBe(45_000);
    expect(precoDoAdicional(lista, "s2", 32_000)).toBe(32_000);
    expect(precoDoAdicional(undefined, "s1", 32_000)).toBe(32_000);
    expect(precoDoAdicional(undefined, "s1", null)).toBe(0);
    expect(precoDoAdicional([{ serviceId: "s1", priceCents: null }], "s1", 32_000)).toBe(32_000);
  });
});

describe("escopo do cupom", () => {
  it("cupom de categoria não abate as linhas de outra categoria", () => {
    // 10% em peças não pode descontar 10% de uma autoclave
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 1_000_000, categoriaId: "equipamentos" },
          { precoCents: 100_000, categoriaId: "pecas" },
        ],
        cupom: cupom({ code: "PECAS10", kind: "percentual", value: 10, categoryId: "pecas" }),
      }),
    );

    expect(totais.subtotalCents).toBe(1_100_000);
    expect(totais.descontoCents).toBe(10_000); // 10% de 100.000, não de 1.100.000
    expect(totais.totalCents).toBe(1_090_000);
  });

  it("cupom de produto abate só aquele produto", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { id: "autoclave", precoCents: 1_000_000 },
          { id: "compressor", precoCents: 500_000 },
        ],
        cupom: cupom({ code: "AUTO50", kind: "fixo", value: 50_000, productId: "autoclave" }),
      }),
    );

    expect(totais.descontoCents).toBe(50_000);
  });

  it("avisa quando o cupom é válido mas não vale para nada no carrinho", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 1_000_000, categoriaId: "equipamentos" }],
        cupom: cupom({ code: "PECAS10", value: 10, categoryId: "pecas" }),
      }),
    );

    expect(totais.descontoCents).toBe(0);
    expect(totais.cupomErro).toBe("Este cupom não vale para os itens deste carrinho.");
  });

  it("cupom sem restrição continua valendo para o carrinho inteiro", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 1_000_000, categoriaId: "equipamentos" },
          { precoCents: 100_000, categoriaId: "pecas" },
        ],
        cupom: cupom({ code: "GERAL10", value: 10 }),
      }),
    );

    expect(totais.descontoCents).toBe(110_000);
  });

  it("o desconto fixo nunca passa da base elegível", () => {
    expect(descontoDoCupom({ kind: "valor_fixo", value: 90_000 }, 50_000)).toBe(50_000);
    expect(descontoDoCupom({ kind: "percentual", value: 10 }, 0)).toBe(0);
  });

  it("linhaElegivelAoCupom trata cupom ausente como nada elegível", () => {
    const item = { productId: "p1", product: { categoryId: "c1" } };
    expect(linhaElegivelAoCupom(null, item)).toBe(false);
    expect(linhaElegivelAoCupom({ productId: null, categoryId: null }, item)).toBe(true);
    expect(linhaElegivelAoCupom({ productId: "p1", categoryId: null }, item)).toBe(true);
    expect(linhaElegivelAoCupom({ productId: "p2", categoryId: null }, item)).toBe(false);
    expect(linhaElegivelAoCupom({ productId: null, categoryId: "c1" }, item)).toBe(true);
    expect(linhaElegivelAoCupom({ productId: null, categoryId: "c2" }, item)).toBe(false);
  });
});

describe("item que saiu do ar", () => {
  it("produto arquivado fica na lista mas não entra na conta", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 1_000_000, status: "active" },
          { precoCents: 500_000, status: "archived" },
        ],
      }),
    );

    expect(totais.linhas).toHaveLength(2);
    expect(totais.linhas[1].disponivel).toBe(false);
    expect(totais.linhas[1].totalCents).toBe(0);
    expect(totais.subtotalCents).toBe(1_000_000);
  });

  it("produto em rascunho também não é cobrado", () => {
    const totais = calcularTotais(
      carrinho({ produtos: [{ precoCents: 800_000, status: "draft" }] }),
    );
    expect(totais.subtotalCents).toBe(0);
    expect(totais.linhas[0].disponivel).toBe(false);
  });

  it("o adicional de um produto fora do ar também não é cobrado", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 1_000_000,
            status: "archived",
            adicionais: [{ nome: "Instalação", precoCents: 45_000, precoNoProduto: 45_000 }],
          },
        ],
      }),
    );
    expect(totais.subtotalCents).toBe(0);
  });

  it("serviço avulso continua disponível", () => {
    const totais = calcularTotais(
      carrinho({ servicos: [{ nome: "Visita técnica", precoCents: 32_000 }] }),
    );
    expect(totais.linhas[0].disponivel).toBe(true);
    expect(totais.subtotalCents).toBe(32_000);
  });
});
