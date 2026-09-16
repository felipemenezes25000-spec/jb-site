import { describe, expect, it } from "vitest";

import {
  AUSENTE,
  TEXTO_AUSENTE,
  dimensoesLegiveis,
  garantiaLegivel,
  pesoLegivel,
  recomendar,
  textoDoValor,
  type ProdutoComparavel,
  type RespostasDaClinica,
} from "@/lib/comparador";
import {
  compararCenarios,
  custoDeParada,
  linhaDoReparo,
  totalDoCenario,
  type Cenario,
} from "@/lib/tco";

/* ============================================================================
   Comparador e TCO

   Os dois têm o mesmo modo de falha, e é o mais silencioso do projeto: dado
   ausente virando zero, e zero virando vantagem. Um equipamento sem requisito
   de instalação cadastrado pareceria o menos exigente; um reparo sem orçamento
   pareceria de graça. Nos dois casos ganha quem tem menos informação.
   ============================================================================ */

/* -------------------------------------------------------- comparador */

describe("textoDoValor", () => {
  it("ausente NÃO vira zero", () => {
    expect(textoDoValor(AUSENTE)).toBe(TEXTO_AUSENTE);
    expect(textoDoValor(AUSENTE)).not.toContain("0");
  });

  it("número sai com unidade", () => {
    expect(textoDoValor({ tipo: "numero", valor: 21, unidade: "L" })).toBe("21 L");
  });

  it("lista vazia é ausência, não lista", () => {
    expect(textoDoValor({ tipo: "lista", valores: [] })).toBe(TEXTO_AUSENTE);
  });
});

describe("normalização de unidades", () => {
  it("peso em gramas vira kg quando faz sentido", () => {
    expect(textoDoValor(pesoLegivel(45_000))).toBe("45 kg");
    expect(textoDoValor(pesoLegivel(800))).toBe("800 g");
  });

  it("peso zero é ausência — equipamento não pesa nada", () => {
    expect(pesoLegivel(0)).toEqual(AUSENTE);
    expect(pesoLegivel(null)).toEqual(AUSENTE);
  });

  it("garantia em meses vira anos quando fecha", () => {
    expect(textoDoValor(garantiaLegivel(24))).toBe("2 anos");
    expect(textoDoValor(garantiaLegivel(12))).toBe("1 ano");
    expect(textoDoValor(garantiaLegivel(18))).toBe("18 meses");
  });

  it("dimensão faltando aparece como '?', não como zero", () => {
    const valor = dimensoesLegiveis(450, null, 600);
    expect(textoDoValor(valor)).toContain("?");
    expect(textoDoValor(valor)).not.toContain(" 0 ");
  });

  it("nenhuma dimensão informada é ausência", () => {
    expect(dimensoesLegiveis(null, null, null)).toEqual(AUSENTE);
  });
});

function produto(parcial: Partial<ProdutoComparavel> = {}): ProdutoComparavel {
  return {
    slug: "a",
    nome: "Autoclave A",
    precoCents: 900_000,
    condicao: "novo",
    garantiaMeses: 12,
    infraestrutura: ["Tomada 220 V", "Bancada 60 cm"],
    instalacao: "opcional",
    ...parcial,
  };
}

const RESPOSTAS: RespostasDaClinica = {
  volume: "medio",
  infraestrutura: "pronta",
  prioridade: "menor_preco",
};

describe("recomendar", () => {
  it("com um produto só, não há comparação", () => {
    const r = recomendar([produto()], RESPOSTAS);
    expect(r.slug).toBeNull();
  });

  it("prioridade preço elege o mais barato quando todos têm preço", () => {
    const r = recomendar(
      [produto({ slug: "a", precoCents: 900_000 }), produto({ slug: "b", precoCents: 700_000 })],
      RESPOSTAS,
    );
    expect(r.slug).toBe("b");
    expect(r.criterios.join(" ")).toContain("menor investimento");
  });

  it("produto sob orçamento tira o preço da conta em vez de virar 'mais barato'", () => {
    const r = recomendar(
      [produto({ slug: "a", precoCents: 900_000 }), produto({ slug: "b", precoCents: 0 })],
      RESPOSTAS,
    );
    expect(r.slug).toBeNull();
    expect(r.lacunas.join(" ")).toContain("sob orçamento");
  });

  it("infraestrutura NÃO cadastrada não vira 'menos exigente'", () => {
    // é o erro central: ganhar a comparação por falta de dado
    const r = recomendar(
      [
        produto({ slug: "a", infraestrutura: ["Tomada 220 V", "Dreno"] }),
        produto({ slug: "b", infraestrutura: [] }),
      ],
      { ...RESPOSTAS, prioridade: "nao_sei", infraestrutura: "precisa_obra" },
    );
    expect(r.slug).toBeNull();
    expect(r.lacunas.join(" ")).toContain("não é o menos exigente");
  });

  it("garantia ausente em um dos produtos tira a garantia da conta", () => {
    const r = recomendar(
      [produto({ slug: "a", garantiaMeses: 24 }), produto({ slug: "b", garantiaMeses: null })],
      { ...RESPOSTAS, prioridade: "menor_manutencao" },
    );
    expect(r.lacunas.join(" ")).toContain("garantia");
    expect(r.slug).toBeNull();
  });

  it("empate não elege ninguém", () => {
    // escolher o primeiro faria a ordem de seleção virar critério
    const r = recomendar(
      [produto({ slug: "a", precoCents: 800_000 }), produto({ slug: "b", precoCents: 800_000 })],
      RESPOSTAS,
    );
    expect(r.slug).toBeNull();
  });

  it("nunca afirma compatibilidade clínica", () => {
    const r = recomendar([produto({ slug: "a" }), produto({ slug: "b", precoCents: 1 })], RESPOSTAS);
    const texto = [...r.criterios, ...r.lacunas].join(" ").toLowerCase();
    for (const proibido of ["adequado para", "atende ao procedimento", "compatível com"]) {
      expect(texto).not.toContain(proibido);
    }
  });
});

/* --------------------------------------------------------------- TCO */

function cenario(chave: Cenario["chave"], linhas: Cenario["linhas"]): Cenario {
  return { chave, titulo: chave, linhas, observacoes: [] };
}

describe("totalDoCenario", () => {
  it("linha ausente não soma zero — é contada como sem dado", () => {
    const total = totalDoCenario(
      cenario("reparar", [
        { rotulo: "Reparo", valorCents: null, origem: "ausente" },
        { rotulo: "Manutenção", valorCents: 50_000, origem: "premissa" },
      ]),
    );
    expect(total.totalCents).toBe(50_000);
    expect(total.linhasSemDado).toBe(1);
    expect(total.incompleto).toBe(true);
  });

  it("separa o que veio de premissa do usuário", () => {
    const total = totalDoCenario(
      cenario("novo", [
        { rotulo: "Aquisição", valorCents: 900_000, origem: "conhecido" },
        { rotulo: "Manutenção", valorCents: 100_000, origem: "premissa" },
      ]),
    );
    expect(total.totalCents).toBe(1_000_000);
    expect(total.dePremissaCents).toBe(100_000);
    expect(total.incompleto).toBe(false);
  });
});

describe("compararCenarios", () => {
  const completo = (chave: Cenario["chave"], valor: number) =>
    cenario(chave, [{ rotulo: "Total", valorCents: valor, origem: "conhecido" }]);

  it("cenário incompleto bloqueia a comparação", () => {
    // senão o mais barato venceria por falta de informação
    const r = compararCenarios(
      [
        completo("novo", 900_000),
        cenario("reparar", [{ rotulo: "Reparo", valorCents: null, origem: "ausente" }]),
      ],
      5,
    );
    expect(r.comparavel).toBe(false);
    if (!r.comparavel) expect(r.motivo).toContain("falta de dado");
  });

  it("com tudo preenchido, ordena do menor para o maior", () => {
    const r = compararCenarios(
      [completo("novo", 900_000), completo("seminovo", 500_000)],
      5,
    );
    expect(r.comparavel).toBe(true);
    if (r.comparavel) expect(r.ordem[0].chave).toBe("seminovo");
  });

  it("a ressalva nega vida útil, revenda e economia futura", () => {
    const r = compararCenarios(
      [completo("novo", 900_000), completo("seminovo", 500_000)],
      5,
    );
    if (!r.comparavel) throw new Error("esperava comparável");
    const texto = r.ressalva.toLowerCase();
    for (const palavra of ["vida útil", "revenda", "economia futura", "probabilidade de falha"]) {
      expect(texto, palavra).toContain(palavra);
    }
    expect(r.ressalva).toContain("5 anos");
  });
});

describe("custoDeParada", () => {
  it("não soma de novo o que já está em outra premissa", () => {
    const r = custoDeParada({ cents: 300_000, jaIncluidoEmOutraPremissa: true });
    expect(r.incluir).toBe(false);
    if (!r.incluir) expect(r.motivo).toContain("dobraria");
  });

  it("sem valor informado, não entra", () => {
    expect(custoDeParada({ cents: null, jaIncluidoEmOutraPremissa: false }).incluir).toBe(false);
  });

  it("informado e ainda não incluído, entra uma vez", () => {
    const r = custoDeParada({ cents: 300_000, jaIncluidoEmOutraPremissa: false });
    expect(r.incluir).toBe(true);
    if (r.incluir) expect(r.cents).toBe(300_000);
  });
});

describe("linhaDoReparo", () => {
  it("sem orçamento NÃO significa reparo gratuito", () => {
    const linha = linhaDoReparo(null);
    expect(linha.valorCents).toBeNull();
    expect(linha.origem).toBe("ausente");
    expect(linha.procedencia).toContain("não é gratuito");
  });

  it("com orçamento, guarda a procedência", () => {
    const linha = linhaDoReparo(120_000, "OS-001842");
    expect(linha.origem).toBe("conhecido");
    expect(linha.procedencia).toContain("OS-001842");
  });
});
