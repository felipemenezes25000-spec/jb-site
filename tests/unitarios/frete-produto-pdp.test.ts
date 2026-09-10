import { describe, expect, it } from "vitest";

import {
  itemAptoParaCotacaoExterna,
  itemDaPdpParaCotacao,
} from "@/lib/frete-produto-item";

describe("frete da PDP", () => {
  it("cota exatamente uma unidade do produto visualizado", () => {
    const item = itemDaPdpParaCotacao({
      id: "produto-1",
      name: "Autoclave 18 L",
      priceCents: 790_000,
      weightGrams: 42_500,
      widthMm: 470,
      heightMm: 420,
      depthMm: 560,
    });

    expect(item).toEqual({
      id: "produto-1",
      name: "Autoclave 18 L",
      quantity: 1,
      unitPriceCents: 790_000,
      weightGrams: 42_500,
      widthMm: 470,
      heightMm: 420,
      depthMm: 560,
    });
    expect(itemAptoParaCotacaoExterna(item)).toBe(true);
  });

  it("não chama cotador externo quando falta peso ou dimensão", () => {
    const item = itemDaPdpParaCotacao({
      id: "produto-sem-medidas",
      name: "Equipamento sem medidas",
      priceCents: 100_000,
      weightGrams: null,
      widthMm: null,
      heightMm: null,
      depthMm: null,
    });

    expect(item).toMatchObject({
      id: "produto-sem-medidas",
      quantity: 1,
      weightGrams: null,
      widthMm: null,
      heightMm: null,
      depthMm: null,
    });
    expect(itemAptoParaCotacaoExterna(item)).toBe(false);
  });

  it("recusa dimensão zero como item transportável", () => {
    const item = itemDaPdpParaCotacao({
      id: "produto-altura-zero",
      name: "Produto inválido",
      priceCents: 100_000,
      weightGrams: 1_000,
      widthMm: 100,
      heightMm: 0,
      depthMm: 100,
    });

    expect(itemAptoParaCotacaoExterna(item)).toBe(false);
  });
});
