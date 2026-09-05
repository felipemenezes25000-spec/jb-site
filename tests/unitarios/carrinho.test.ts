import { describe, expect, it, vi } from "vitest";

/**
 * `@/lib/carrinho` importa o cliente Prisma e `next/headers` para as funções
 * que leem o cookie. `calcularTotais` não usa nem um nem outro — é pura. Estes
 * dublês existem só para o módulo carregar sem abrir conexão com o Postgres.
 */
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/codigos", () => ({ tokenAleatorio: () => "token-teste" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

const { calcularTotais } = await import("@/lib/carrinho");
const { carrinho, cupom } = await import("../apoio/fabricas");

describe("calcularTotais — carrinho vazio", () => {
  it("devolve tudo zerado quando não há carrinho", () => {
    const totais = calcularTotais(null);
    expect(totais.linhas).toEqual([]);
    expect(totais.quantidadeItens).toBe(0);
    expect(totais.subtotalCents).toBe(0);
    expect(totais.descontoCents).toBe(0);
    expect(totais.totalCents).toBe(0);
    expect(totais.cupomCodigo).toBe("");
    expect(totais.cupomErro).toBeNull();
  });

  it("devolve zerado quando o carrinho existe mas não tem item", () => {
    const totais = calcularTotais(carrinho({}));
    expect(totais.linhas).toHaveLength(0);
    expect(totais.totalCents).toBe(0);
  });
});

describe("calcularTotais — produtos e quantidade", () => {
  it("multiplica preço por quantidade", () => {
    const totais = calcularTotais(
      carrinho({ produtos: [{ precoCents: 849000, quantidade: 3 }] }),
    );
    expect(totais.subtotalCents).toBe(2547000);
    expect(totais.totalCents).toBe(2547000);
    expect(totais.quantidadeItens).toBe(3);
    expect(totais.linhas[0].totalCents).toBe(2547000);
    expect(totais.linhas[0].precoUnitarioCents).toBe(849000);
  });

  it("soma linhas diferentes", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 849000, quantidade: 1 },
          { precoCents: 419000, quantidade: 2 },
        ],
      }),
    );
    expect(totais.subtotalCents).toBe(849000 + 838000);
    expect(totais.quantidadeItens).toBe(3);
    expect(totais.linhas).toHaveLength(2);
  });

  it("classifica serviço avulso como linha de serviço", () => {
    const totais = calcularTotais(
      carrinho({ servicos: [{ nome: "Instalação", precoCents: 45000, quantidade: 2 }] }),
    );
    expect(totais.linhas[0].tipo).toBe("servico");
    expect(totais.linhas[0].nome).toBe("Instalação");
    expect(totais.subtotalCents).toBe(90000);
  });

  it("mostra estoque infinito para quem não controla inventário", () => {
    const totais = calcularTotais(
      carrinho({ produtos: [{ precoCents: 10000, controlaEstoque: false, estoque: 0 }] }),
    );
    expect(totais.linhas[0].estoqueDisponivel).toBe(9999);
  });

  it("respeita o estoque real de quem controla inventário", () => {
    const totais = calcularTotais(
      carrinho({ produtos: [{ precoCents: 10000, controlaEstoque: true, estoque: 2 }] }),
    );
    expect(totais.linhas[0].estoqueDisponivel).toBe(2);
  });
});

describe("calcularTotais — adicionais", () => {
  it("cobra o adicional por unidade do produto", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 100000,
            quantidade: 3,
            adicionais: [{ nome: "Instalação", precoCents: 25000 }],
          },
        ],
      }),
    );
    // 3 × 100000 do produto + 3 × 25000 da instalação
    expect(totais.linhas[0].addons).toHaveLength(1);
    expect(totais.linhas[0].addons[0].totalCents).toBe(75000);
    expect(totais.linhas[0].totalCents).toBe(375000);
    expect(totais.subtotalCents).toBe(375000);
  });

  it("soma vários adicionais na mesma linha", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          {
            precoCents: 100000,
            quantidade: 2,
            adicionais: [
              { nome: "Instalação", precoCents: 25000 },
              { nome: "Treinamento", precoCents: 15000 },
            ],
          },
        ],
      }),
    );
    expect(totais.linhas[0].addons).toHaveLength(2);
    expect(totais.linhas[0].totalCents).toBe(2 * 100000 + 2 * 25000 + 2 * 15000);
  });

  it("adicional não conta como item na contagem do cabeçalho", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 100000, quantidade: 2, adicionais: [{ nome: "Instalação", precoCents: 1 }] },
        ],
      }),
    );
    expect(totais.linhas).toHaveLength(1);
    expect(totais.quantidadeItens).toBe(2);
  });

  it("adicional sem preço não muda o total", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 100000, quantidade: 1, adicionais: [{ nome: "Sob orçamento", precoCents: 0 }] },
        ],
      }),
    );
    expect(totais.totalCents).toBe(100000);
    expect(totais.linhas[0].addons[0].totalCents).toBe(0);
  });
});

describe("calcularTotais — cupom percentual", () => {
  it("aplica o percentual sobre o subtotal", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 100000, quantidade: 1 }],
        cupom: cupom({ code: "JB10", kind: "percentual", value: 10 }),
      }),
    );
    expect(totais.descontoCents).toBe(10000);
    expect(totais.totalCents).toBe(90000);
    expect(totais.cupomCodigo).toBe("JB10");
    expect(totais.cupomErro).toBeNull();
  });

  it("arredonda o desconto para baixo, a favor da loja e sem meio centavo", () => {
    // 15% de 33333 = 4999,95 → 4999
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 33333, quantidade: 1 }],
        cupom: cupom({ kind: "percentual", value: 15 }),
      }),
    );
    expect(totais.descontoCents).toBe(4999);
    expect(totais.totalCents).toBe(28334);
    expect(totais.descontoCents + totais.totalCents).toBe(totais.subtotalCents);
  });

  it("cupom de 100% zera o total sem passar do subtotal", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 100000, quantidade: 1 }],
        cupom: cupom({ kind: "percentual", value: 100 }),
      }),
    );
    expect(totais.descontoCents).toBe(100000);
    expect(totais.totalCents).toBe(0);
  });

  it("o percentual incide também sobre os adicionais", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 100000, quantidade: 1, adicionais: [{ nome: "Instalação", precoCents: 20000 }] },
        ],
        cupom: cupom({ kind: "percentual", value: 10 }),
      }),
    );
    expect(totais.subtotalCents).toBe(120000);
    expect(totais.descontoCents).toBe(12000);
    expect(totais.totalCents).toBe(108000);
  });
});

describe("calcularTotais — cupom fixo", () => {
  it("desconta o valor em centavos", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 100000, quantidade: 1 }],
        cupom: cupom({ code: "MENOS50", kind: "fixo", value: 5000 }),
      }),
    );
    expect(totais.descontoCents).toBe(5000);
    expect(totais.totalCents).toBe(95000);
  });

  it("nunca desconta mais que o subtotal — total não fica negativo", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [{ precoCents: 3000, quantidade: 1 }],
        cupom: cupom({ kind: "fixo", value: 50000 }),
      }),
    );
    expect(totais.descontoCents).toBe(3000);
    expect(totais.totalCents).toBe(0);
  });
});

describe("calcularTotais — cupom recusado", () => {
  const produtos = [{ precoCents: 100000, quantidade: 1 }];

  it("recusa cupom desativado", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, active: false }) }),
    );
    expect(totais.descontoCents).toBe(0);
    expect(totais.totalCents).toBe(100000);
    expect(totais.cupomErro).toBe("Este cupom não está mais válido.");
  });

  it("recusa cupom vencido", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, endsAt: new Date("2020-01-01") }) }),
    );
    expect(totais.descontoCents).toBe(0);
    expect(totais.cupomErro).toBe("Este cupom não está mais válido.");
  });

  it("recusa cupom que ainda não começou", () => {
    const daquiUmAno = new Date(Date.now() + 365 * 86400000);
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, startsAt: daquiUmAno }) }),
    );
    expect(totais.descontoCents).toBe(0);
    expect(totais.cupomErro).toBe("Este cupom não está mais válido.");
  });

  it("recusa cupom esgotado", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, maxUses: 5, usedCount: 5 }) }),
    );
    expect(totais.descontoCents).toBe(0);
    expect(totais.cupomErro).toBe("Este cupom não está mais válido.");
  });

  it("aceita cupom com uso restante", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, maxUses: 5, usedCount: 4 }) }),
    );
    expect(totais.descontoCents).toBe(10000);
    expect(totais.cupomErro).toBeNull();
  });

  it("recusa quando o subtotal não atinge o mínimo, com mensagem própria", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, minSubtotalCents: 200000 }) }),
    );
    expect(totais.descontoCents).toBe(0);
    expect(totais.cupomErro).toBe("O valor do pedido ainda não atinge o mínimo deste cupom.");
  });

  it("aceita quando o subtotal bate exatamente o mínimo", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ value: 10, minSubtotalCents: 100000 }) }),
    );
    expect(totais.descontoCents).toBe(10000);
    expect(totais.cupomErro).toBeNull();
  });

  it("cupom recusado ainda mostra o código digitado, para a pessoa entender", () => {
    const totais = calcularTotais(
      carrinho({ produtos, cupom: cupom({ code: "EXPIRADO", value: 10, active: false }) }),
    );
    expect(totais.cupomCodigo).toBe("EXPIRADO");
  });
});

describe("calcularTotais — invariantes de dinheiro", () => {
  it("todo valor é inteiro em centavos", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 33333, quantidade: 7, adicionais: [{ nome: "Extra", precoCents: 1111 }] },
        ],
        cupom: cupom({ kind: "percentual", value: 13 }),
      }),
    );
    for (const valor of [totais.subtotalCents, totais.descontoCents, totais.totalCents]) {
      expect(Number.isInteger(valor)).toBe(true);
    }
    expect(totais.totalCents).toBe(totais.subtotalCents - totais.descontoCents);
  });

  it("o subtotal é a soma exata das linhas", () => {
    const totais = calcularTotais(
      carrinho({
        produtos: [
          { precoCents: 849000, quantidade: 2 },
          { precoCents: 419000, quantidade: 1, adicionais: [{ nome: "Frete interno", precoCents: 7500 }] },
        ],
        servicos: [{ precoCents: 45000, quantidade: 3 }],
      }),
    );
    const soma = totais.linhas.reduce((total, linha) => total + linha.totalCents, 0);
    expect(totais.subtotalCents).toBe(soma);
  });
});
