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

  it("prioriza capacidade, ciclo e secagem numa autoclave", () => {
    const destaques = destaquesDaPdp({
      nome: "Autoclave vertical 18 L — Classe B",
      categoriaSlug: "biosseguranca",
      specs: [
        { label: "Tensão", value: "220 V", order: 0 },
        { label: "Bandejas", value: "4 inox", order: 1 },
        { label: "Secagem", value: "A vácuo", order: 2 },
        { label: "Capacidade", value: "18 litros", order: 3 },
        { label: "Ciclo", value: "134 °C · Classe B", order: 4 },
      ],
      voltage: null,
      warrantyMonths: null,
      anvisaCode: null,
    });

    expect(destaques.map((item) => item.rotulo).slice(0, 4)).toEqual([
      "Capacidade",
      "Ciclo",
      "Secagem",
      "Bandejas",
    ]);
  });

  it("prioriza intensidade e autonomia num fotopolimerizador", () => {
    const destaques = destaquesDaPdp({
      nome: "Fotopolimerizador LED 1200 mW",
      categoriaSlug: "profilaxia",
      specs: [
        { label: "Peso", value: "160 g", order: 0 },
        { label: "Ponteira", value: "Fibra óptica 8 mm", order: 1 },
        { label: "Bateria", value: "Lítio, 300 ciclos", order: 2 },
        { label: "Modos", value: "5 programas", order: 3 },
        { label: "Intensidade", value: "1.200 mW/cm²", order: 4 },
      ],
      voltage: null,
      warrantyMonths: null,
      anvisaCode: null,
    });

    expect(destaques.map((item) => item.rotulo).slice(0, 4)).toEqual([
      "Intensidade",
      "Modos",
      "Bateria",
      "Ponteira",
    ]);
  });

  it("reconhece compressor pelos próprios rótulos mesmo sem nome técnico", () => {
    const destaques = destaquesDaPdp({
      specs: [
        { label: "Tensão", value: "Bivolt", order: 0 },
        { label: "Consultórios", value: "Até 2", order: 1 },
        { label: "Ruído", value: "58 dB", order: 2 },
        { label: "Pressão", value: "8 bar", order: 3 },
        { label: "Reservatório", value: "40 litros", order: 4 },
        { label: "Motor", value: "1 HP", order: 5 },
      ],
      voltage: null,
      warrantyMonths: null,
      anvisaCode: null,
    });

    expect(destaques.map((item) => item.rotulo).slice(0, 4)).toEqual([
      "Reservatório",
      "Pressão",
      "Ruído",
      "Consultórios",
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
