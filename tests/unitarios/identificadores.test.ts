import { describe, expect, it } from "vitest";

import { conferirGtin, conferirMpn, gtinValido, normalizarGtin } from "@/lib/identificadores";

/* ============================================================================
   GTIN e MPN

   O modo de falha: o SKU interno da JB viajando no feed como se fosse código
   de fabricante. O anúncio é aceito, roda por semanas, e o produto aparece
   casado com o de outra empresa.
   ============================================================================ */

// EAN-13 reais de exemplo, com dígito verificador correto
const EAN13 = "4006381333931";
const UPC12 = "036000291452";
const GTIN8 = "96385074";

describe("conferirGtin", () => {
  it("aceita EAN-13, UPC-12 e GTIN-8 válidos", () => {
    for (const codigo of [EAN13, UPC12, GTIN8]) {
      expect(conferirGtin(codigo), codigo).toBeNull();
    }
  });

  it("vazio não é erro — GTIN é opcional e não se inventa", () => {
    expect(conferirGtin("")).toBeNull();
    expect(conferirGtin(null)).toBeNull();
    expect(conferirGtin(undefined)).toBeNull();
  });

  it("recusa um dígito trocado", () => {
    // é o erro que passa despercebido: o número parece certo
    const errado = EAN13.slice(0, -1) + (Number(EAN13.at(-1)) === 9 ? "8" : "9");
    expect(conferirGtin(errado)).toBe("digito_verificador");
  });

  it("recusa comprimento fora do padrão", () => {
    expect(conferirGtin("123456789")).toBe("comprimento");
    expect(conferirGtin("1234567890123456")).toBe("comprimento");
  });

  it("recusa letra e pontuação", () => {
    expect(conferirGtin("400-638133393")).toBe("nao_numerico");
    expect(conferirGtin("40063813339A1")).toBe("nao_numerico");
  });

  it("recusa uma sequência de zeros, que passa no dígito mas não identifica nada", () => {
    expect(conferirGtin("00000000")).toBe("sequencia_vazia");
  });

  it("recusa o SKU interno no lugar do GTIN", () => {
    // a regra explícita do escopo
    expect(conferirGtin(EAN13, { sku: EAN13 })).toBe("igual_ao_sku");
  });

  it("SKU com máscara continua sendo o mesmo SKU", () => {
    expect(conferirGtin(EAN13, { sku: "400.6381-333931" })).toBe("igual_ao_sku");
  });

  it("SKU diferente não atrapalha um GTIN legítimo", () => {
    expect(conferirGtin(EAN13, { sku: "JB-AUTOCLAVE-21" })).toBeNull();
  });
});

describe("gtinValido", () => {
  it("vazio não é válido — é ausente", () => {
    // a diferença importa: o feed omite o campo em vez de mandar string vazia
    expect(gtinValido("")).toBe(false);
    expect(gtinValido(EAN13)).toBe(true);
  });
});

describe("normalizarGtin", () => {
  it("tira máscara sem julgar o conteúdo", () => {
    expect(normalizarGtin(" 400-638.133 3931 ")).toBe("4006381333931");
    expect(normalizarGtin(null)).toBe("");
  });
});

describe("conferirMpn", () => {
  it("aceita código de fabricante comum", () => {
    expect(conferirMpn("CD-8100-BR")).toBeNull();
  });

  it("vazio não é erro", () => {
    expect(conferirMpn("")).toBeNull();
  });

  it("recusa acima de 70 caracteres", () => {
    expect(conferirMpn("x".repeat(71))).toBe("comprimento");
  });

  it("recusa o SKU interno, ignorando caixa", () => {
    expect(conferirMpn("jb-autoclave-21", { sku: "JB-AUTOCLAVE-21" })).toBe("igual_ao_sku");
  });
});
