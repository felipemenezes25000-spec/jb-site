import { describe, expect, it } from "vitest";

import { escoposComparaveis, precoDoPlano, type BasePlano } from "@/lib/plano";

/* ============================================================================
   Como um plano fala do próprio preço

   Cada teste aqui protege contra uma frase errada na página pública. A que
   mais importa é a última de cada bloco: quando o cadastro não sustenta a
   afirmação, a tela precisa cair para "Sob consulta" — nunca completar a
   lacuna com o palpite mais vendável.
   ============================================================================ */

function plano(parcial: Partial<BasePlano> = {}): BasePlano {
  return {
    priceCents: 89000,
    periodMonths: 12,
    billingBasis: "por_equipamento",
    coveredEquipment: null,
    ...parcial,
  };
}

describe("precoDoPlano — por equipamento", () => {
  it("mostra o valor com a unidade explícita", () => {
    const p = precoDoPlano(plano());
    expect(p.tipo).toBe("valor");
    if (p.tipo !== "valor") return;
    expect(p.centavos).toBe(89000);
    expect(p.unidade).toBe("por equipamento");
    expect(p.periodo).toBe("por 12 meses de cobertura");
    expect(p.aPartirDe).toBe(false);
  });

  it("cai para consulta sem preço, em vez de anunciar R$ 0,00", () => {
    expect(precoDoPlano(plano({ priceCents: null })).tipo).toBe("sob_consulta");
    expect(precoDoPlano(plano({ priceCents: 0 })).tipo).toBe("sob_consulta");
    expect(precoDoPlano(plano({ priceCents: -100 })).tipo).toBe("sob_consulta");
  });
});

describe("precoDoPlano — pacote", () => {
  it("declara quantos equipamentos o preço cobre", () => {
    const p = precoDoPlano(plano({ billingBasis: "pacote", coveredEquipment: 5 }));
    expect(p.tipo).toBe("valor");
    if (p.tipo !== "valor") return;
    expect(p.unidade).toBe("para até 5 equipamentos");
  });

  it("usa singular quando o pacote cobre um só", () => {
    const p = precoDoPlano(plano({ billingBasis: "pacote", coveredEquipment: 1 }));
    if (p.tipo !== "valor") throw new Error("esperava valor");
    expect(p.unidade).toBe("para 1 equipamento");
  });

  it("pacote sem quantidade cai para consulta — não presume 1", () => {
    for (const quantidade of [null, 0, -3]) {
      const p = precoDoPlano(plano({ billingBasis: "pacote", coveredEquipment: quantidade }));
      expect(p.tipo).toBe("sob_consulta");
    }
  });
});

describe('precoDoPlano — "a partir de"', () => {
  it('só diz "a partir de" quando essa é a base cadastrada', () => {
    const p = precoDoPlano(plano({ billingBasis: "a_partir_de" }));
    if (p.tipo !== "valor") throw new Error("esperava valor");
    expect(p.unidade).toBe("a partir de");
    expect(p.aPartirDe).toBe(true);
  });

  it("nenhuma outra base produz um piso disfarçado", () => {
    for (const base of ["por_equipamento", "pacote"] as const) {
      const p = precoDoPlano(plano({ billingBasis: base, coveredEquipment: 3 }));
      if (p.tipo !== "valor") continue;
      expect(p.aPartirDe).toBe(false);
    }
  });
});

describe("precoDoPlano — sob consulta", () => {
  it("é o estado dos planos cadastrados antes desta modelagem", () => {
    // `sob_consulta` é o padrão da coluna: todo plano existente cai aqui até
    // alguém declarar a base no painel.
    const p = precoDoPlano(plano({ billingBasis: "sob_consulta" }));
    expect(p.tipo).toBe("sob_consulta");
  });

  it("ignora o preço cadastrado quando a base não está declarada", () => {
    // Ter preço não autoriza exibi-lo: sem base, não se sabe do que ele é o
    // preço. É este caso que impedia dizer "R$ 890 por equipamento".
    const p = precoDoPlano(plano({ billingBasis: "sob_consulta", priceCents: 289000 }));
    expect(p.tipo).toBe("sob_consulta");
  });

  it("explica a ausência em vez de deixar a tela muda", () => {
    const p = precoDoPlano(plano({ billingBasis: "sob_consulta" }));
    if (p.tipo !== "sob_consulta") throw new Error("esperava consulta");
    expect(p.explicacao.length).toBeGreaterThan(10);
  });
});

describe("precoDoPlano — período", () => {
  it("descreve o período em palavras", () => {
    const mensal = precoDoPlano(plano({ periodMonths: 1 }));
    const bienal = precoDoPlano(plano({ periodMonths: 24 }));
    if (mensal.tipo !== "valor" || bienal.tipo !== "valor") throw new Error("esperava valor");
    expect(mensal.periodo).toBe("por mês de cobertura");
    expect(bienal.periodo).toBe("por 24 meses de cobertura");
  });

  it("período indefinido cai para consulta — preço sem prazo não é preço", () => {
    // Cair no padrão de 12 meses seria inventar a vigência do contrato.
    for (const meses of [0, -6, Number.NaN]) {
      expect(precoDoPlano(plano({ periodMonths: meses })).tipo).toBe("sob_consulta");
    }
  });
});

describe("escoposComparaveis", () => {
  it("aceita planos com a mesma base e o mesmo período", () => {
    expect(escoposComparaveis(plano(), plano({ priceCents: 159000 }))).toBe(true);
  });

  it("recusa períodos diferentes", () => {
    expect(escoposComparaveis(plano(), plano({ periodMonths: 24 }))).toBe(false);
  });

  it("recusa bases diferentes — anuidade por aparelho não é pacote de clínica", () => {
    expect(
      escoposComparaveis(plano(), plano({ billingBasis: "pacote", coveredEquipment: 5 })),
    ).toBe(false);
  });

  it("recusa pacotes de tamanhos diferentes", () => {
    const a = plano({ billingBasis: "pacote", coveredEquipment: 3 });
    const b = plano({ billingBasis: "pacote", coveredEquipment: 8 });
    expect(escoposComparaveis(a, b)).toBe(false);
  });

  it("dois planos sob consulta são comparáveis entre si", () => {
    const a = plano({ billingBasis: "sob_consulta" });
    expect(escoposComparaveis(a, a)).toBe(true);
  });
});
