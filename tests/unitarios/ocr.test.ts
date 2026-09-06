import { describe, expect, it } from "vitest";

import {
  AVISO_DE_CONFERENCIA,
  LIMITE_DO_OCR,
  alternativasAmbiguas,
  interpretarEtiqueta,
  limitarLinhas,
  podeGravar,
} from "@/lib/ocr/interpretar";

/* ============================================================================
   OCR de etiqueta

   Fixtures sintéticas: etiqueta boa, desfocada, incompleta, com caracteres
   ambíguos, com duas etiquetas no quadro, e resposta de provedor esquisita.

   O modo de falha que estes testes existem para impedir: um serial lido de
   foto entrando no prontuário como se tivesse sido conferido — e, pior,
   sobrescrevendo um número que alguém tinha conferido olhando o aparelho.
   ============================================================================ */

const ETIQUETA_BOA = [
  "CRISTOFOLI EQUIPAMENTOS",
  "Modelo: Vitale Class 21",
  "Marca: Cristofoli",
  "Nº de série: CV21-2019-04471",
  "Tensão: 220 V~ 60 Hz",
  "Potência: 1500 W",
];

const ETIQUETA_DESFOCADA = ["", "   ", ""];

const ETIQUETA_INCOMPLETA = ["Modelo: Box 12", "Fabricado no Brasil"];

const ETIQUETA_AMBIGUA = ["Serial: 1O0I5B"];

const DUAS_ETIQUETAS = [
  "Modelo: Vitale 21",
  "N série: AAA-111",
  "Modelo: Box 12",
  "N serie: BBB-222",
];

describe("interpretarEtiqueta — etiqueta boa", () => {
  it("encontra marca, modelo, série e voltagem", () => {
    const r = interpretarEtiqueta(ETIQUETA_BOA);
    if (!r.ok) throw new Error(`esperava leitura, veio ${r.motivo}`);

    expect(r.campos.modelo?.valor).toBe("Vitale Class 21");
    expect(r.campos.marca?.valor).toBe("Cristofoli");
    expect(r.campos.serial?.valor).toBe("CV21-2019-04471");
    expect(r.campos.voltagem?.valor).toBe("220");
  });

  it("preserva o valor original de cada campo", () => {
    // normalizar não pode apagar diferença entre modelos
    const r = interpretarEtiqueta(ETIQUETA_BOA);
    if (!r.ok) throw new Error("esperava leitura");
    expect(r.campos.voltagem?.bruto).toContain("220 V");
  });

  it("confiança é null quando o mecanismo não informa — e null não é zero", () => {
    const r = interpretarEtiqueta(ETIQUETA_BOA);
    if (!r.ok) throw new Error("esperava leitura");
    expect(r.campos.serial?.confianca).toBeNull();
  });
});

describe("interpretarEtiqueta — os casos ruins", () => {
  it("imagem sem texto legível", () => {
    const r = interpretarEtiqueta(ETIQUETA_DESFOCADA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("imagem_ilegivel");
  });

  it("etiqueta incompleta devolve o que deu, sem inventar o resto", () => {
    const r = interpretarEtiqueta(ETIQUETA_INCOMPLETA);
    if (!r.ok) throw new Error("esperava leitura parcial");
    expect(r.campos.modelo?.valor).toBe("Box 12");
    expect(r.campos.marca).toBeNull();
    expect(r.campos.serial).toBeNull();
  });

  it("texto sem nenhum campo de etiqueta", () => {
    const r = interpretarEtiqueta(["Consultório Dr. Fulano", "Rua das Flores, 100"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("nada_encontrado");
  });

  it("duas etiquetas no quadro são recusadas", () => {
    // com dois seriais não dá para saber qual número é de qual equipamento
    const r = interpretarEtiqueta(DUAS_ETIQUETAS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("varias_etiquetas");
  });

  it("não escolhe modelo pela linha mais comprida", () => {
    const r = interpretarEtiqueta(["EQUIPAMENTO ODONTOLOGICO DE ALTA PERFORMANCE PARA CLINICAS"]);
    expect(r.ok).toBe(false);
  });
});

describe("caracteres ambíguos", () => {
  it("O/0, I/1, S/5 e B/8 viram alternativas, não um palpite", () => {
    const r = interpretarEtiqueta(ETIQUETA_AMBIGUA);
    if (!r.ok) throw new Error("esperava leitura");
    expect(r.campos.serial?.alternativas.length).toBeGreaterThan(0);
  });

  it("alternativas trocam todas as ocorrências de um caractere por vez", () => {
    expect(alternativasAmbiguas("1O0I")).toContain("10 0I".replace(" ", ""));
  });

  it("código sem ambiguidade não gera alternativa", () => {
    // "ACD-247" não tem nenhum dos oito caracteres confundíveis — "ABC" teria,
    // pelo B, e essa é a lembrança de que a lista de confusões é maior que O/0
    expect(alternativasAmbiguas("ACD-247")).toEqual([]);
  });

  it("a lista de alternativas tem teto", () => {
    expect(alternativasAmbiguas("O0I1S5B8", 3).length).toBeLessThanOrEqual(3);
  });
});

describe("limitarLinhas — o texto do OCR é dado, não instrução", () => {
  it("corta linhas demais", () => {
    const muitas = Array.from({ length: 500 }, (_, i) => `linha ${i}`);
    expect(limitarLinhas(muitas).length).toBeLessThanOrEqual(60);
  });

  it("corta linha comprida demais", () => {
    const [linha] = limitarLinhas(["x".repeat(5000)]);
    expect(linha.length).toBeLessThanOrEqual(200);
  });

  it("remove caractere de controle", () => {
    const [linha] = limitarLinhas(["Modelo:\u0007 Vitale 21"]);
     
    expect(linha).not.toMatch(/[\x00-\x1f]/);
    expect(linha).toBe("Modelo: Vitale 21");
  });

  it("aguenta resposta com entrada nula sem quebrar", () => {
    const linhas = limitarLinhas([null as unknown as string, "Modelo: X1"]);
    expect(linhas).toEqual(["Modelo: X1"]);
  });
});

describe("podeGravar", () => {
  const base = {
    confirmadoPeloUsuario: true,
    serialAtual: "",
    serialSugerido: "AB-123",
    serialConferido: false,
  };

  it("sem confirmação, não grava", () => {
    const r = podeGravar({ ...base, confirmadoPeloUsuario: false });
    expect(r.grava).toBe(false);
    if (!r.grava) expect(r.motivo).toBe("nao_confirmado");
  });

  it("confirmado e sem serial anterior, grava", () => {
    expect(podeGravar(base).grava).toBe(true);
  });

  it("NÃO sobrescreve serial conferido pela equipe", () => {
    // a regra que o escopo nomeia
    const r = podeGravar({
      ...base,
      serialAtual: "AB-999",
      serialConferido: true,
      serialSugerido: "AB-123",
    });
    expect(r.grava).toBe(false);
    if (!r.grava) expect(r.motivo).toBe("serial_ja_confirmado");
  });

  it("serial conferido igual ao sugerido não é sobrescrita", () => {
    const r = podeGravar({
      ...base,
      serialAtual: "AB-123",
      serialConferido: true,
      serialSugerido: "AB-123",
    });
    expect(r.grava).toBe(true);
  });

  it("sugestão vazia não apaga serial conferido", () => {
    const r = podeGravar({
      ...base,
      serialAtual: "AB-999",
      serialConferido: true,
      serialSugerido: "",
    });
    expect(r.grava).toBe(true);
  });
});

describe("os textos obrigatórios", () => {
  it("a frase de conferência é a do escopo, ao pé da letra", () => {
    expect(AVISO_DE_CONFERENCIA).toBe(
      "Encontramos estas informações. Confira antes de continuar.",
    );
  });

  it("o limite do OCR nega defeito, segurança, originalidade e garantia", () => {
    const texto = LIMITE_DO_OCR.toLowerCase();
    for (const palavra of ["defeito", "seguro", "original", "garantia"]) {
      expect(texto, palavra).toContain(palavra);
    }
  });
});
