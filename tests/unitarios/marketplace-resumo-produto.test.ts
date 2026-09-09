import { describe, expect, it } from "vitest";

import { destaquesDaPdp } from "@/lib/marketplace/resumo-produto";

describe("destaquesDaPdp", () => {
  it("combina ficha, voltagem, garantia e ANVISA sem repetir", () => {
    expect(
      destaquesDaPdp({
        specs: [
          { label: "Torque", value: "35 N·cm", order: 0 },
          { label: "Rotação", value: "2.000 rpm", order: 1 },
        ],
        voltage: "bivolt",
        warrantyMonths: 6,
        anvisaCode: "12345678901",
      }),
    ).toEqual([
      { rotulo: "Torque", valor: "35 N·cm" },
      { rotulo: "Rotação", valor: "2.000 rpm" },
      { rotulo: "Voltagem", valor: "Bivolt" },
      { rotulo: "Garantia", valor: "6 meses" },
      { rotulo: "Registro", valor: "12345678901" },
    ]);
  });

  it("usa ANVISA quando existe espaço e não inventa registro", () => {
    expect(
      destaquesDaPdp({
        specs: [],
        voltage: null,
        warrantyMonths: null,
        anvisaCode: "ANVISA 999",
      }),
    ).toEqual([{ rotulo: "Registro", valor: "ANVISA 999" }]);
    expect(
      destaquesDaPdp({
        specs: [],
        voltage: null,
        warrantyMonths: null,
        anvisaCode: null,
      }),
    ).toEqual([]);
  });
});
