import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SpecRow } from "@/components/specs/spec-row";

import { construirFicha, type ProdutoParaFicha } from "@/domain/specs/construir";
import { definicaoDe, familiaDoProduto } from "@/domain/specs/definicoes";
import {
  formatarSpec,
  garantiaEmMeses,
  interpretarValor,
  normalizarTensao,
  textoDaGarantia,
} from "@/domain/specs/formatar";

/* ============================================================================
   A ficha técnica, item a item

   Cada caso aqui nasceu de uma medição da auditoria de 15/09/2026 na página do
   produto:

     "220 V" aparecia cinco vezes, com três rótulos e dois formatos
     "6 meses" de um lado e "1 ano" do outro, na mesma linha do comparador
     o contador dizia "6 especificações" numa página com nove atributos
     "Ciclo: 121 °C e 134 °C" virava "121" quando alguém tentava ler o número
   ============================================================================ */

const ESPACO = " ";

function produto(extra: Partial<ProdutoParaFicha> = {}): ProdutoParaFicha {
  return {
    nome: "Autoclave 12 L revisada",
    sku: "JB-AUT-12R",
    condicao: "seminovo",
    categoria: { slug: "biosseguranca", nome: "Biossegurança" },
    ...extra,
  };
}

describe("normalizarTensao", () => {
  it("escreve bivolt de um jeito só", () => {
    for (const bruto of ["bivolt", "Bivolt", "110/220", "220/110V", "BIVOLT"]) {
      expect(normalizarTensao(bruto)).toBe("Bivolt (110/220 V)");
    }
  });

  it("cola a unidade no número", () => {
    expect(normalizarTensao("220")).toBe(`220${ESPACO}V`);
    expect(normalizarTensao("220 V")).toBe(`220${ESPACO}V`);
    expect(normalizarTensao("127v")).toBe(`127${ESPACO}V`);
  });
});

describe("garantia", () => {
  it("lê meses e anos como a mesma unidade", () => {
    expect(garantiaEmMeses("6 meses")).toBe(6);
    expect(garantiaEmMeses("1 ano")).toBe(12);
    expect(garantiaEmMeses("2 anos")).toBe(24);
    expect(garantiaEmMeses("12")).toBe(12);
    expect(garantiaEmMeses("sob consulta")).toBeNull();
  });

  it("escreve sempre em meses, nunca em anos", () => {
    /* A tradução para a fala natural — 12 virando "1 ano" — deixava cada tela
       ótima sozinha e o conjunto incoerente: a ficha da seladora dizia "1 ano"
       e o bullet logo acima dizia "12 meses". Mês é a unidade do dado, e passa
       a ser a da tela. */
    expect(textoDaGarantia(6)).toBe("6 meses");
    expect(textoDaGarantia(1)).toBe("1 mês");
    expect(textoDaGarantia(12)).toBe("12 meses");
    expect(textoDaGarantia(24)).toBe("24 meses");
    expect(textoDaGarantia(18)).toBe("18 meses");
    expect(textoDaGarantia(0)).toBe("Sem garantia declarada");
  });

  it("nenhuma superfície pode escrever a garantia em anos", () => {
    for (const meses of [12, 18, 24, 36, 60]) {
      expect(textoDaGarantia(meses)).not.toMatch(/ano/);
    }
  });
});

describe("interpretarValor", () => {
  const capacidade = definicaoDe("capacidade")!;
  const ciclo = definicaoDe("ciclo")!;

  it("separa número e unidade quando o texto é só isso", () => {
    expect(interpretarValor("12 L", capacidade)).toEqual({ valor: 12, unidade: "L" });
    expect(interpretarValor("12", capacidade)).toEqual({ valor: 12, unidade: "L" });
  });

  it("não transforma dois números num só", () => {
    /* "Ciclo: 121 °C e 134 °C" são DUAS temperaturas. Um parser que pega o
       primeiro número transformava dois ciclos de esterilização em "121". */
    expect(interpretarValor("121 °C e 134 °C", ciclo).valor).toBe("121 °C e 134 °C");
  });

  it("preserva o texto quando ele diz mais que o número", () => {
    expect(interpretarValor("12 L com secagem ativa", capacidade).valor).toBe(
      "12 L com secagem ativa",
    );
  });
});

describe("formatarSpec", () => {
  it("põe a unidade uma vez só", () => {
    const definicao = definicaoDe("capacidade")!;
    expect(
      formatarSpec(definicao, { key: "capacidade", value: 12, source: "fabricante" }),
    ).toBe(`12${ESPACO}L`);
  });

  it("não repete a unidade que já está no texto", () => {
    const definicao = definicaoDe("tensao")!;
    expect(
      formatarSpec(definicao, {
        key: "tensao",
        value: "Bivolt (110/220 V)",
        source: "fabricante",
      }),
    ).toBe("Bivolt (110/220 V)");
  });

  it("devolve nulo quando não há dado — nunca zero", () => {
    const definicao = definicaoDe("peso")!;
    expect(formatarSpec(definicao, null)).toBeNull();
    expect(formatarSpec(definicao, { key: "peso", value: null, source: "fabricante" })).toBeNull();
  });
});

describe("familiaDoProduto", () => {
  it("reconhece a família pelo nome", () => {
    expect(familiaDoProduto({ nome: "Autoclave 12 L revisada" })).toBe("autoclave");
    expect(familiaDoProduto({ nome: "Seladora de embalagens 30 cm" })).toBe("seladora");
    expect(familiaDoProduto({ nome: "Fotopolimerizador LED 1200" })).toBe("fotopolimerizador");
    expect(familiaDoProduto({ nome: "Bomba de vácuo" })).toBe("aspirador");
  });

  it("cai em genérico sem inventar família", () => {
    expect(familiaDoProduto({ nome: "Item sem nome reconhecível" })).toBe("generico");
  });
});

describe("construirFicha", () => {
  it("coloca a tensão num lugar só, com um rótulo só", () => {
    const ficha = construirFicha(
      produto({
        voltagem: "220",
        specs: [
          { label: "Alimentação", value: "220 V", order: 0 },
          { label: "Tensão", value: "220", order: 1 },
        ],
      }),
    );

    const linhas = ficha.grupos.flatMap((grupo) => grupo.linhas);
    const tensoes = linhas.filter((linha) => /tens|alimenta|voltagem/i.test(linha.definicao.label));

    expect(tensoes).toHaveLength(1);
    expect(tensoes[0].definicao.label).toBe("Tensão");
    expect(tensoes[0].texto).toBe(`220${ESPACO}V`);
  });

  it("conta só o que tem dado — o contador da página sai daqui", () => {
    const ficha = construirFicha(
      produto({ specs: [{ label: "Capacidade", value: "12 L", order: 0 }] }),
    );

    const comDado = ficha.grupos.flatMap((grupo) => grupo.linhas).length;
    expect(ficha.total).toBe(comDado);
    expect(ficha.grupos.every((grupo) => grupo.linhas.length > 0)).toBe(true);
  });

  it("sobe no máximo três atributos decisivos", () => {
    const ficha = construirFicha(
      produto({
        voltagem: "220",
        garantiaMeses: 6,
        specs: [
          { label: "Capacidade", value: "12 L", order: 0 },
          { label: "Ciclo", value: "35 min", order: 1 },
          { label: "Bandejas", value: "3", order: 2 },
        ],
      }),
    );

    expect(ficha.decisivas.length).toBeLessThanOrEqual(3);
    expect(ficha.decisivas.every((linha) => linha.definicao.decisive)).toBe(true);
  });

  it("marca como medido pela JB o que veio da unidade física", () => {
    const ficha = construirFicha(
      produto({
        unidade: {
          serialNumber: "JB-AUT12R-01",
          manufactureYear: 2021,
          usageHours: null,
          usageCycles: 1840,
          warrantyMonths: 6,
          acquiredFrom: "Troca por equipamento novo",
        },
      }),
    );

    const unidade = ficha.grupos.find((grupo) => grupo.id === "unidade");
    expect(unidade).toBeDefined();
    expect(unidade!.linhas.every((linha) => linha.valor?.source === "inspecao-jb")).toBe(true);
    expect(ficha.procedencias).toContain("inspecao-jb");
  });

  it("a garantia da unidade vence a do modelo", () => {
    const ficha = construirFicha(
      produto({
        garantiaMeses: 12,
        unidade: {
          serialNumber: null,
          manufactureYear: null,
          usageHours: null,
          usageCycles: null,
          warrantyMonths: 6,
          acquiredFrom: null,
        },
      }),
    );

    const garantia = ficha.grupos
      .flatMap((grupo) => grupo.linhas)
      .find((linha) => linha.definicao.key === "garantia");

    expect(garantia?.texto).toBe("6 meses");
    expect(garantia?.valor?.source).toBe("inspecao-jb");
  });

  it("não joga fora spec que não casa com nenhuma definição", () => {
    const ficha = construirFicha(
      produto({ specs: [{ label: "Revisão", value: "Selo e resistência novos", order: 0 }] }),
    );

    const rotulos = ficha.grupos.flatMap((grupo) => grupo.linhas.map((l) => l.definicao.label));
    expect(rotulos).toContain("Revisão");
  });

  it("os cinco grupos saem sempre na mesma ordem", () => {
    const ficha = construirFicha(
      produto({
        voltagem: "220",
        garantiaMeses: 6,
        pesoGramas: 32_000,
        specs: [{ label: "Capacidade", value: "12 L", order: 0 }],
        unidade: {
          serialNumber: "X",
          manufactureYear: null,
          usageHours: null,
          usageCycles: null,
          warrantyMonths: null,
          acquiredFrom: null,
        },
      }),
    );

    expect(ficha.grupos.map((grupo) => grupo.id)).toEqual([
      "identidade",
      "desempenho",
      "instalacao",
      "comercial",
      "unidade",
    ]);
  });
});

describe("interpretarValor — o que NÃO é unidade", () => {
  it("não confunde material com unidade", () => {
    /* "3 inox" é a quantidade de bandejas E o material delas. Uma versão
       anterior aceitava qualquer palavra de até cinco letras como unidade e
       devolvia "3 un" — o inox sumia da ficha. */
    const bandejas = definicaoDe("bandejas")!;
    expect(interpretarValor("3 inox", bandejas).valor).toBe("3 inox");
  });

  it("aceita a unidade escrita por extenso e a devolve como símbolo", () => {
    const capacidade = definicaoDe("capacidade")!;
    expect(interpretarValor("12 litros", capacidade)).toEqual({ valor: 12, unidade: "L" });
  });

  it("não engole texto que apenas começa com número", () => {
    const capacidade = definicaoDe("capacidade")!;
    expect(interpretarValor("12 bandejas de inox", capacidade).valor).toBe(
      "12 bandejas de inox",
    );
  });
});

describe("SpecRow — o desenho da linha", () => {
  const capacidade = definicaoDe("capacidade")!;
  const requisitos = definicaoDe("requisitos")!;

  function renderizar(definicao: typeof capacidade, texto: string) {
    return renderToStaticMarkup(
      createElement(SpecRow, {
        linha: {
          definicao,
          valor: { key: definicao.key, value: texto, source: "fabricante" },
          texto,
        },
      }),
    );
  }

  it("valor curto fica ao lado do rótulo", () => {
    const html = renderizar(capacidade, "12 L");
    expect(html).toContain("grid-cols-[auto_minmax(0,1fr)]");
    expect(html).toContain("text-right");
  });

  it("valor longo empilha em vez de espremer o rótulo", () => {
    /* O caso medido em 15/09/2026: com a grade de duas colunas, este valor
       levava a largura inteira e o `<dt>` ia a 0 px de largura por 340 px de
       altura — "Requisitos do local" descendo uma letra por linha. */
    const longo =
      "Tomada exclusiva de 20 A em 220 V, com aterramento · Bancada nivelada com 60 cm livres de profundidade · Água destilada";
    const html = renderizar(requisitos, longo);

    expect(html).not.toContain("grid-cols-");
    expect(html).not.toContain("text-right");
    expect(html).toContain("Requisitos do local");
    expect(html).toContain("Água destilada");
  });

  it("a fronteira entre os dois desenhos é o tamanho do texto", () => {
    expect(renderizar(capacidade, "x".repeat(20))).toContain("grid-cols-");
    expect(renderizar(capacidade, "x".repeat(80))).not.toContain("grid-cols-");
  });
});
