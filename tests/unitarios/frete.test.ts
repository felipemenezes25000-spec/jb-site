import { describe, expect, it, vi } from "vitest";

/**
 * `calcularFrete` é pura: recebe os perfis já lidos e devolve o valor. O
 * módulo, porém, também exporta `calcularFreteDePedido`, que abre o Prisma —
 * este dublê existe só para o arquivo carregar sem Postgres.
 */
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { calcularFrete, ROTULO_GRATIS, ROTULO_SOB_ORCAMENTO } = await import("@/lib/frete");

type Perfil = Parameters<typeof calcularFrete>[0]["produtos"][number]["perfil"];

/* ------------------------------------------------------------- fábricas */

let sequencia = 0;

function faixa(
  entrada: Partial<{
    nome: string;
    cepInicio: string;
    cepFim: string;
    valorCents: number;
    prazoDias: number | null;
    ordem: number;
  }> = {},
) {
  sequencia += 1;
  return {
    id: `faixa-${sequencia}`,
    nome: entrada.nome ?? "Grande São Paulo",
    cepInicio: entrada.cepInicio ?? "01000000",
    cepFim: entrada.cepFim ?? "09999999",
    valorCents: entrada.valorCents ?? 8_900,
    prazoDias: entrada.prazoDias === undefined ? 5 : entrada.prazoDias,
    ordem: entrada.ordem ?? 0,
  };
}

function perfil(entrada: Partial<NonNullable<Perfil>> = {}): NonNullable<Perfil> {
  sequencia += 1;
  return {
    id: entrada.id ?? `perfil-${sequencia}`,
    nome: entrada.nome ?? "Transportadora",
    tipo: entrada.tipo ?? "transportadora",
    gratisAcimaCents: entrada.gratisAcimaCents ?? null,
    faixas: entrada.faixas ?? [faixa()],
  };
}

/* --------------------------------------------------------- faixa que casa */

describe("calcularFrete — faixa de CEP que casa", () => {
  it("cobra o valor cadastrado e devolve o prazo da faixa", () => {
    const frete = calcularFrete({
      cep: "04567-000",
      subtotalCents: 1_190_000,
      produtos: [{ perfil: perfil() }],
    });

    expect(frete.valorCents).toBe(8_900);
    expect(frete.prazoDias).toBe(5);
    expect(frete.tipo).toBe("transportadora");
    expect(frete.motivo).toBe("faixa");
    expect(frete.rotulo).toContain("Grande São Paulo");
  });

  it("completa a faixa curta como o admin completa: zeros no início, noves no fim", () => {
    // salvarZonaFrete grava sempre 8 dígitos; a mesma regra vale aqui para
    // faixa que tenha entrado no banco por outro caminho
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [
        {
          perfil: perfil({
            faixas: [faixa({ cepInicio: "01000", cepFim: "01999", valorCents: 4_500 })],
          }),
        },
      ],
    });

    expect(frete.valorCents).toBe(4_500);
  });

  it("nos limites exatos da faixa ainda casa, e um dígito fora já não casa", () => {
    const comFaixa = (cep: string) =>
      calcularFrete({
        cep,
        subtotalCents: 100_000,
        produtos: [
          {
            perfil: perfil({
              faixas: [faixa({ cepInicio: "01000000", cepFim: "01999999", valorCents: 3_000 })],
            }),
          },
        ],
      });

    expect(comFaixa("01000000").valorCents).toBe(3_000);
    expect(comFaixa("01999999").valorCents).toBe(3_000);
    expect(comFaixa("00999999").tipo).toBe("sob_orcamento");
    expect(comFaixa("02000000").tipo).toBe("sob_orcamento");
  });

  it("com faixas sobrepostas vence a de menor ordem", () => {
    const frete = calcularFrete({
      cep: "05000000",
      subtotalCents: 100_000,
      produtos: [
        {
          perfil: perfil({
            faixas: [
              faixa({ nome: "Capital", valorCents: 5_000, ordem: 1, prazoDias: 3 }),
              faixa({ nome: "Sudeste", valorCents: 12_000, ordem: 5, prazoDias: 9 }),
            ],
          }),
        },
      ],
    });

    expect(frete.valorCents).toBe(5_000);
    expect(frete.prazoDias).toBe(3);
    expect(frete.rotulo).toContain("Capital");
  });
});

/* ------------------------------------------------------ faixa que não casa */

describe("calcularFrete — sem faixa para o CEP", () => {
  it("devolve sob_orcamento com valor zero, que é o comportamento de sempre", () => {
    const frete = calcularFrete({
      cep: "88000-000",
      subtotalCents: 1_190_000,
      produtos: [
        {
          perfil: perfil({
            faixas: [faixa({ cepInicio: "01000000", cepFim: "09999999" })],
          }),
        },
      ],
    });

    expect(frete.tipo).toBe("sob_orcamento");
    expect(frete.valorCents).toBe(0);
    expect(frete.prazoDias).toBeNull();
    expect(frete.rotulo).toBe(ROTULO_SOB_ORCAMENTO);
    expect(frete.motivo).toBe("sem_faixa");
  });

  it("um único produto fora de faixa joga o pedido inteiro para orçamento", () => {
    // cobrar só o que casou seria vender entrega que a JB não sabe fazer
    const frete = calcularFrete({
      cep: "88000000",
      subtotalCents: 500_000,
      produtos: [
        { perfil: perfil({ faixas: [faixa({ cepInicio: "80000000", cepFim: "89999999" })] }) },
        { perfil: perfil({ faixas: [faixa({ cepInicio: "01000000", cepFim: "09999999" })] }) },
      ],
    });

    expect(frete.tipo).toBe("sob_orcamento");
    expect(frete.valorCents).toBe(0);
  });

  it("perfil sem faixa nenhuma cadastrada também cai em orçamento", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ faixas: [] }) }],
    });

    expect(frete.tipo).toBe("sob_orcamento");
  });

  it("perfil marcado como sob orçamento ignora qualquer faixa", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ tipo: "sob_orcamento", faixas: [faixa()] }) }],
    });

    expect(frete.tipo).toBe("sob_orcamento");
    expect(frete.valorCents).toBe(0);
  });

  it("faixa gravada com CEP curto demais é ignorada em vez de cobrir o Brasil inteiro", () => {
    const frete = calcularFrete({
      cep: "70000000",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ faixas: [faixa({ cepInicio: "01", cepFim: "9" })] }) }],
    });

    expect(frete.tipo).toBe("sob_orcamento");
  });
});

/* ------------------------------------------------------ grátis acima do X */

describe("calcularFrete — frete grátis acima do mínimo", () => {
  const comSubtotal = (subtotalCents: number) =>
    calcularFrete({
      cep: "01310100",
      subtotalCents,
      produtos: [
        { perfil: perfil({ gratisAcimaCents: 500_000, faixas: [faixa({ valorCents: 8_900 })] }) },
      ],
    });

  it("cobra normalmente abaixo do mínimo", () => {
    expect(comSubtotal(499_999).valorCents).toBe(8_900);
    expect(comSubtotal(499_999).motivo).toBe("faixa");
  });

  it("zera o frete exatamente no mínimo — a fronteira é inclusiva", () => {
    const frete = comSubtotal(500_000);
    expect(frete.valorCents).toBe(0);
    expect(frete.tipo).toBe("gratis");
    expect(frete.motivo).toBe("gratis");
    expect(frete.rotulo).toBe(ROTULO_GRATIS);
  });

  it("zera acima do mínimo e mantém o prazo da faixa", () => {
    const frete = comSubtotal(1_190_000);
    expect(frete.valorCents).toBe(0);
    expect(frete.prazoDias).toBe(5);
  });

  it("o mínimo não vale para CEP fora de faixa: continua orçamento", () => {
    const frete = calcularFrete({
      cep: "88000000",
      subtotalCents: 5_000_000,
      produtos: [
        {
          perfil: perfil({
            gratisAcimaCents: 500_000,
            faixas: [faixa({ cepInicio: "01000000", cepFim: "09999999" })],
          }),
        },
      ],
    });

    expect(frete.tipo).toBe("sob_orcamento");
    expect(frete.valorCents).toBe(0);
  });

  it("perfil do tipo grátis não cobra nem precisa de faixa", () => {
    const frete = calcularFrete({
      cep: "88000000",
      subtotalCents: 1_000,
      produtos: [{ perfil: perfil({ tipo: "gratis", faixas: [] }) }],
    });

    expect(frete.tipo).toBe("gratis");
    expect(frete.valorCents).toBe(0);
  });
});

/* --------------------------------------------------------- CEP mal formado */

describe("calcularFrete — CEP mal formado", () => {
  for (const cep of ["", "   ", "0131010", "013101000", "abcdefgh", "CEP-01310"]) {
    it(`não inventa valor para ${JSON.stringify(cep)}`, () => {
      const frete = calcularFrete({
        cep,
        subtotalCents: 1_190_000,
        produtos: [{ perfil: perfil() }],
      });

      expect(frete.tipo).toBe("sob_orcamento");
      expect(frete.valorCents).toBe(0);
      expect(frete.motivo).toBe("cep_invalido");
    });
  }

  it("aceita o CEP com máscara, que é como o formulário manda", () => {
    const frete = calcularFrete({
      cep: "01310-100",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil() }],
    });

    expect(frete.valorCents).toBe(8_900);
  });

  it("CEP inválido não impede o frete grátis do perfil que não depende dele", () => {
    const frete = calcularFrete({
      cep: "",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ tipo: "gratis", faixas: [] }) }],
    });

    expect(frete.tipo).toBe("gratis");
    expect(frete.valorCents).toBe(0);
  });
});

/* ------------------------------------------------------- perfil do produto */

describe("calcularFrete — qual perfil vale", () => {
  it("produto com perfil próprio usa o dele, não o padrão da loja", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ faixas: [faixa({ nome: "Próprio", valorCents: 15_000 })] }) }],
      perfilPadrao: perfil({ faixas: [faixa({ nome: "Padrão", valorCents: 2_000 })] }),
    });

    expect(frete.valorCents).toBe(15_000);
    expect(frete.rotulo).toContain("Próprio");
  });

  it("produto sem perfil cai no padrão da loja", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: null }],
      perfilPadrao: perfil({ faixas: [faixa({ nome: "Padrão", valorCents: 2_000 })] }),
    });

    expect(frete.valorCents).toBe(2_000);
    expect(frete.rotulo).toContain("Padrão");
  });

  it("sem perfil próprio e sem padrão cadastrado, orçamento", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: null }],
    });

    expect(frete.tipo).toBe("sob_orcamento");
    expect(frete.valorCents).toBe(0);
  });

  it("dois produtos do mesmo perfil pagam um frete só, não dois", () => {
    const compartilhado = perfil({ faixas: [faixa({ valorCents: 8_900 })] });
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 200_000,
      produtos: [{ perfil: compartilhado }, { perfil: compartilhado }],
    });

    expect(frete.valorCents).toBe(8_900);
  });

  it("perfis diferentes no mesmo carrinho: vale o mais caro e o prazo mais longo", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 200_000,
      produtos: [
        { perfil: perfil({ faixas: [faixa({ nome: "Leve", valorCents: 3_000, prazoDias: 2 })] }) },
        { perfil: perfil({ faixas: [faixa({ nome: "Pesado", valorCents: 19_000, prazoDias: 9 })] }) },
      ],
    });

    expect(frete.valorCents).toBe(19_000);
    expect(frete.prazoDias).toBe(9);
    expect(frete.rotulo).toContain("Pesado");
  });

  it("item que não viaja não puxa frete nem impede o cálculo dos outros", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 200_000,
      produtos: [
        { perfil: perfil({ tipo: "nao_aplicavel", faixas: [] }) },
        { perfil: perfil({ faixas: [faixa({ valorCents: 8_900 })] }) },
      ],
    });

    expect(frete.valorCents).toBe(8_900);
    expect(frete.tipo).toBe("transportadora");
  });

  it("carrinho sem nada para transportar não cobra frete", () => {
    const frete = calcularFrete({ cep: "01310100", subtotalCents: 50_000, produtos: [] });

    expect(frete.tipo).toBe("nao_aplicavel");
    expect(frete.valorCents).toBe(0);
    expect(frete.motivo).toBe("sem_frete");
  });

  it("perfil de retirada não cobra e não promete prazo de entrega", () => {
    const frete = calcularFrete({
      cep: "01310100",
      subtotalCents: 100_000,
      produtos: [{ perfil: perfil({ tipo: "retirada", faixas: [] }) }],
    });

    expect(frete.tipo).toBe("retirada");
    expect(frete.valorCents).toBe(0);
    expect(frete.motivo).toBe("retirada");
  });
});
