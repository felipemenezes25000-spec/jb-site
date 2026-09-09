import { describe, expect, it } from "vitest";

import { destaquesDoCard } from "@/lib/marketplace/destaques-card";

describe("destaquesDoCard", () => {
  it("prioriza atributos técnicos de decisão e limita a dois", () => {
    expect(
      destaquesDoCard({
        specs: [
          { label: "Cor", value: "Branco", order: 0 },
          { label: "Torque", value: "35 N·cm", order: 1 },
          { label: "Rotação", value: "2.000 rpm", order: 2 },
        ],
        voltage: "220",
        warrantyMonths: 12,
      }),
    ).toEqual([
      { rotulo: "Torque", valor: "35 N·cm" },
      { rotulo: "Rotação", valor: "2.000 rpm" },
    ]);
  });

  it("usa voltagem e garantia apenas como alternativas cadastradas", () => {
    expect(
      destaquesDoCard({ specs: [], voltage: "bivolt", warrantyMonths: 6 }),
    ).toEqual([
      { rotulo: "Voltagem", valor: "Bivolt" },
      { rotulo: "Garantia", valor: "6 meses" },
    ]);
  });

  it("remove vazios e não cria atributo ausente", () => {
    expect(
      destaquesDoCard({
        specs: [{ label: "Torque", value: "  ", order: 0 }],
        voltage: null,
        warrantyMonths: null,
      }),
    ).toEqual([]);
  });
});
