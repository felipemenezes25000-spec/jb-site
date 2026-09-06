import { describe, expect, it } from "vitest";

import { contagemProva, MINIMO_PARA_PROVAR } from "@/lib/prova";

/* ============================================================================
   Quando um número vira prova

   A regra existe para impedir que a home e o Sobre discordem sobre quando uma
   contagem convence — e para que "esconder contagem pequena" seja uma decisão
   testada, não um `if` esquecido numa faixa.
   ============================================================================ */

describe("contagemProva", () => {
  it("aprova a contagem exatamente no limite", () => {
    for (const [tipo, minimo] of Object.entries(MINIMO_PARA_PROVAR)) {
      expect(contagemProva(tipo as keyof typeof MINIMO_PARA_PROVAR, minimo)).toBe(true);
    }
  });

  it("recusa a contagem um abaixo do limite", () => {
    for (const [tipo, minimo] of Object.entries(MINIMO_PARA_PROVAR)) {
      expect(contagemProva(tipo as keyof typeof MINIMO_PARA_PROVAR, minimo - 1)).toBe(false);
    }
  });

  it("recusa zero — ausência de dado não é prova", () => {
    expect(contagemProva("equipamentos", 0)).toBe(false);
    expect(contagemProva("marcas", 0)).toBe(false);
    expect(contagemProva("servicos", 0)).toBe(false);
  });

  it("recusa contagem negativa", () => {
    expect(contagemProva("equipamentos", -5)).toBe(false);
  });

  it("recusa valor não finito em vez de deixar NaN vazar para a tela", () => {
    expect(contagemProva("equipamentos", Number.NaN)).toBe(false);
    expect(contagemProva("equipamentos", Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("trunca fração em vez de arredondar para cima", () => {
    // 23,9 equipamentos não existem, e arredondar para cima publicaria uma
    // prova que o catálogo não sustenta.
    expect(contagemProva("equipamentos", MINIMO_PARA_PROVAR.equipamentos - 0.1)).toBe(false);
  });

  it("o catálogo de demonstração da JB hoje não sustenta a contagem", () => {
    // 8 produtos publicados no banco de desenvolvimento. O teste existe para
    // que uma mudança de limite seja uma decisão consciente, e não um efeito
    // colateral que faz a home passar a anunciar uma vitrine curta.
    expect(contagemProva("equipamentos", 8)).toBe(false);
  });
});
