import { describe, expect, it } from "vitest";

import {
  calcularExposicao,
  conferirPremissas,
  resumoDasPremissas,
  type PremissasParada,
} from "@/lib/parada";

/* ============================================================================
   Exposição anual a equipamento parado

   O que estes testes protegem: que a calculadora nunca mostre um número que
   ela não sabe justificar. NaN, divisão por zero, percentual aplicado duas
   vezes e "reparo zero" lido como "reparo de graça" são os quatro modos de
   falha que fariam a ferramenta mentir com aparência de precisão.
   ============================================================================ */

function premissas(parcial: Partial<PremissasParada> = {}): PremissasParada {
  return {
    receitaHoraCents: 25000, // R$ 250,00
    percentualAfetado: 100,
    horasPorDia: 8,
    diasPorOcorrencia: 2,
    ocorrenciasPorAno: 2,
    reparoCents: 0,
    ...parcial,
  };
}

describe("conferirPremissas", () => {
  it("aceita um conjunto completo", () => {
    expect(conferirPremissas(premissas())).toEqual([]);
  });

  it("o custo de reparo é opcional — zero é entrada válida", () => {
    expect(conferirPremissas(premissas({ reparoCents: 0 }))).toEqual([]);
  });

  it("recusa entrada não finita em vez de deixar NaN chegar à tela", () => {
    const p = conferirPremissas(premissas({ receitaHoraCents: Number.NaN }));
    expect(p.map((x) => x.campo)).toContain("receitaHoraCents");
  });

  it("recusa valor negativo em qualquer campo", () => {
    expect(conferirPremissas(premissas({ horasPorDia: -3 })).length).toBeGreaterThan(0);
    expect(conferirPremissas(premissas({ reparoCents: -1 })).length).toBeGreaterThan(0);
  });

  it("recusa o implausível: mais de 24 horas num dia", () => {
    const p = conferirPremissas(premissas({ horasPorDia: 30 }));
    expect(p.map((x) => x.campo)).toContain("horasPorDia");
  });

  it("recusa mais de 365 dias parados por ocorrência", () => {
    expect(
      conferirPremissas(premissas({ diasPorOcorrencia: 400 })).map((x) => x.campo),
    ).toContain("diasPorOcorrencia");
  });

  it("recusa percentual afetado acima de 100 — a agenda não para mais que inteira", () => {
    expect(
      conferirPremissas(premissas({ percentualAfetado: 150 })).map((x) => x.campo),
    ).toContain("percentualAfetado");
  });

  it("recusa zero nos campos que não são opcionais", () => {
    for (const campo of [
      "receitaHoraCents",
      "percentualAfetado",
      "horasPorDia",
      "diasPorOcorrencia",
      "ocorrenciasPorAno",
    ] as const) {
      const p = conferirPremissas(premissas({ [campo]: 0 }));
      expect(p.map((x) => x.campo)).toContain(campo);
    }
  });

  it("reúne todos os problemas, não só o primeiro", () => {
    const p = conferirPremissas(premissas({ horasPorDia: 0, ocorrenciasPorAno: 0 }));
    expect(p.length).toBe(2);
  });
});

describe("calcularExposicao", () => {
  it("aplica a fórmula da seção 6 do escopo", () => {
    // 2 ocorrências × (R$ 250,00/h × 100% × 8 h × 2 dias) = 2 × R$ 4.000,00
    const e = calcularExposicao(premissas());
    expect(e.horasPorOcorrencia).toBe(16);
    expect(e.receitaEmRiscoPorOcorrenciaCents).toBe(400000);
    expect(e.receitaEmRiscoAnualCents).toBe(800000);
    expect(e.exposicaoAnualCents).toBe(800000);
  });

  it("soma o reparo por ocorrência, sem recontar a receita", () => {
    const e = calcularExposicao(premissas({ reparoCents: 90000 }));
    expect(e.reparosAnualCents).toBe(180000);
    expect(e.exposicaoAnualCents).toBe(800000 + 180000);
  });

  it("aplica o percentual afetado UMA vez", () => {
    // 50% da agenda: metade da receita em risco, e nada mais é reduzido.
    const cheio = calcularExposicao(premissas());
    const metade = calcularExposicao(premissas({ percentualAfetado: 50 }));
    expect(metade.receitaAfetadaHoraCents).toBe(12500);
    expect(metade.exposicaoAnualCents).toBe(cheio.exposicaoAnualCents / 2);
  });

  it("o percentual não toca o custo de reparo", () => {
    // Reparo é custo do conserto, não receita: reduzi-lo pelo percentual seria
    // a dupla contagem que o escopo proíbe, só que ao contrário.
    const e = calcularExposicao(premissas({ percentualAfetado: 25, reparoCents: 100000 }));
    expect(e.reparosAnualCents).toBe(200000);
  });

  it("devolve tudo zerado, e nunca NaN, com premissa inválida", () => {
    const e = calcularExposicao(premissas({ receitaHoraCents: Number.NaN }));
    expect(e.exposicaoAnualCents).toBe(0);
    expect(Number.isNaN(e.exposicaoAnualCents)).toBe(false);
    expect(Number.isNaN(e.receitaAfetadaHoraCents)).toBe(false);
  });

  it("marca reparo desconhecido quando ele não foi informado", () => {
    // A tela precisa saber a diferença entre "conserto de graça" e "não sei
    // quanto custa" — as duas dão R$ 0,00 na soma e dizem coisas opostas.
    expect(calcularExposicao(premissas({ reparoCents: 0 })).reparoDesconhecido).toBe(true);
    expect(calcularExposicao(premissas({ reparoCents: 1 })).reparoDesconhecido).toBe(false);
  });

  it("a memória de cálculo fecha com o total", () => {
    const e = calcularExposicao(premissas({ percentualAfetado: 40, reparoCents: 73000 }));
    expect(e.receitaEmRiscoPorOcorrenciaCents).toBe(
      e.receitaAfetadaHoraCents * e.horasPorOcorrencia,
    );
    expect(e.receitaEmRiscoAnualCents).toBe(e.receitaEmRiscoPorOcorrenciaCents * 2);
    expect(e.exposicaoAnualCents).toBe(e.receitaEmRiscoAnualCents + e.reparosAnualCents);
  });

  it("mantém tudo em centavos inteiros", () => {
    // 33% de R$ 250,00 = R$ 82,50 → 8250 centavos, sem fração perdida no meio.
    const e = calcularExposicao(premissas({ percentualAfetado: 33 }));
    expect(Number.isInteger(e.receitaAfetadaHoraCents)).toBe(true);
    expect(Number.isInteger(e.exposicaoAnualCents)).toBe(true);
    expect(e.receitaAfetadaHoraCents).toBe(8250);
  });
});

describe("resumoDasPremissas", () => {
  const formatar = (c: number) => `R$ ${(c / 100).toFixed(2)}`;

  it("descreve cada premissa com a unidade", () => {
    const texto = resumoDasPremissas(premissas({ reparoCents: 90000 }), formatar);
    expect(texto).toContain("Receita por hora da clínica");
    expect(texto).toContain("Parcela da agenda afetada: 100%");
    expect(texto).toContain("Ocorrências por ano: 2");
    expect(texto).toContain("Exposição anual estimada");
  });

  it('diz "não informado" em vez de deixar o reparo parecer zero', () => {
    const texto = resumoDasPremissas(premissas({ reparoCents: 0 }), formatar);
    expect(texto).toContain("Custo do reparo por ocorrência: não informado");
  });
});
