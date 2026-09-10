import { describe, expect, it } from "vitest";

import { itemDaPdpParaCotacao } from "@/lib/frete-produto-item";

describe("itemDaPdpParaCotacao", () => {
  it("cota exatamente uma unidade do produto visualizado", () => {
    expect(
      itemDaPdpParaCotacao({
        id: "produto-1",
        name: "Autoclave 18 L",
        priceCents: 7_900_00,
        weightGrams: 42_500,
        widthMm: 470,
        heightMm: 420,
        depthMm: 560,
      }),
    ).toEqual({
      id: "produto-1",
      name: "Autoclave 18 L",
      quantity: 1,
      unitPriceCents: 7_900_00,
      weightGrams: 42_500,
      widthMm: 470,
      heightMm: 420,
      depthMm: 560,
    });
  });

  it("preserva dimensões ausentes para o cotador decidir o fallback", () => {
    expect(
      itemDaPdpParaCotacao({
        id: "produto-sem-medidas",
        name: "Equipamento sem medidas",
        priceCents: 100_000,
        weightGrams: null,
        widthMm: null,
        heightMm: null,
        depthMm: null,
      }),
    ).toMatchObject({
      id: "produto-sem-medidas",
      quantity: 1,
      weightGrams: null,
      widthMm: null,
      heightMm: null,
      depthMm: null,
    });
  });
});
