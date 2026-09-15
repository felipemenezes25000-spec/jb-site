import { describe, expect, it } from "vitest";

import { ecoDaGarantia } from "../../scripts/corrigir-descricoes-do-catalogo";

/**
 * A regra apaga texto do catálogo. Ela precisa errar para o lado de não apagar.
 *
 * O bloco "Por que este modelo" é a descrição cadastrada, e quase tudo nela é
 * argumento de verdade — "Radiômetro na base para conferir a potência real",
 * "Sem óleo: ar seco direto na peça de mão". Um único bullet repetia a ficha,
 * porque saía do mesmo campo: a garantia. É só ele que sai.
 */

describe("ecoDaGarantia", () => {
  it("reconhece o bullet que só repete a coluna de garantia", () => {
    expect(ecoDaGarantia("12 meses de garantia de fábrica", 12)).toBe(true);
    expect(ecoDaGarantia("6 meses de garantia JB", 6)).toBe(true);
    expect(ecoDaGarantia("24 meses de garantia de fábrica", 24)).toBe(true);
    expect(ecoDaGarantia("1 mês de garantia", 1)).toBe(true);
  });

  it("não apaga quando o número é outro", () => {
    /* "Garantia estendida de 24 meses" num produto de 12 não é eco: é uma
       oferta a mais, e apagá-la esconderia o que a ficha não diz. */
    expect(ecoDaGarantia("24 meses de garantia estendida", 12)).toBe(false);
    expect(ecoDaGarantia("12 meses de garantia de fábrica", 24)).toBe(false);
  });

  it("não apaga bullet que começa com a garantia e continua com outra coisa", () => {
    const longo = "12 meses de garantia de fábrica, com troca de peças e visita inclusa";
    expect(longo.length).toBeGreaterThan(60);
    expect(ecoDaGarantia(longo, 12)).toBe(false);
  });

  it("não apaga frase que apenas menciona garantia", () => {
    expect(ecoDaGarantia("Assistência própria durante a garantia", 12)).toBe(false);
    expect(ecoDaGarantia("Garantia acompanhada pela Área da Clínica", 12)).toBe(false);
    expect(ecoDaGarantia("Registro de ciclo impresso para auditoria", 12)).toBe(false);
  });

  it("não apaga nada em produto sem garantia cadastrada", () => {
    /* Sem `warrantyMonths` a ficha não mostra linha de garantia — então o
       bullet não repete coisa alguma e é a única fonte do dado. */
    expect(ecoDaGarantia("12 meses de garantia de fábrica", 0)).toBe(false);
  });

  it("lê o bullet com marcação dentro", () => {
    expect(ecoDaGarantia("<strong>12 meses</strong> de garantia de fábrica", 12)).toBe(true);
  });

  it("não tropeça em acento nem em caixa", () => {
    expect(ecoDaGarantia("12 MESES DE GARANTIA DE FÁBRICA", 12)).toBe(true);
    expect(ecoDaGarantia("1 mês de Garantia", 1)).toBe(true);
  });

  it("ignora bullet vazio", () => {
    expect(ecoDaGarantia("", 12)).toBe(false);
    expect(ecoDaGarantia("   ", 12)).toBe(false);
  });
});
