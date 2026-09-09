import { describe, expect, it } from "vitest";

import {
  linhasDaComparacao,
  type ProdutoComparavel,
} from "@/components/loja/produto/comparacao-rapida";

function produto(
  name: string,
  specs: ProdutoComparavel["specs"],
): ProdutoComparavel {
  return {
    id: name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    priceCents: 100_000,
    allowDirectPurchase: true,
    voltage: null,
    warrantyMonths: null,
    specs,
  };
}

describe("linhasDaComparacao", () => {
  it("prioriza atributos que decidem uma autoclave", () => {
    const linhas = linhasDaComparacao([
      produto("Autoclave vertical 18 L", [
        { label: "Tensão", value: "220 V", order: 0 },
        { label: "Bandejas", value: "4", order: 1 },
        { label: "Secagem", value: "A vácuo", order: 2 },
        { label: "Ciclo", value: "Classe B", order: 3 },
        { label: "Capacidade", value: "18 L", order: 4 },
      ]),
      produto("Autoclave vertical 21 L", [
        { label: "Tensão", value: "220 V", order: 0 },
        { label: "Bandejas", value: "5", order: 1 },
        { label: "Secagem", value: "A vácuo", order: 2 },
        { label: "Ciclo", value: "Classe B", order: 3 },
        { label: "Capacidade", value: "21 L", order: 4 },
      ]),
    ]);

    expect(linhas.slice(0, 4).map((linha) => linha.rotulo)).toEqual([
      "Capacidade",
      "Ciclo",
      "Secagem",
      "Bandejas",
    ]);
  });

  it("prioriza os critérios próprios de fotopolimerização", () => {
    const linhas = linhasDaComparacao([
      produto("Fotopolimerizador LED 1200", [
        { label: "Peso", value: "160 g", order: 0 },
        { label: "Ponteira", value: "8 mm", order: 1 },
        { label: "Bateria", value: "300 ciclos", order: 2 },
        { label: "Modos", value: "5", order: 3 },
        { label: "Intensidade", value: "1.200 mW/cm²", order: 4 },
      ]),
      produto("Fotopolimerizador LED 1600", [
        { label: "Peso", value: "170 g", order: 0 },
        { label: "Ponteira", value: "10 mm", order: 1 },
        { label: "Bateria", value: "400 ciclos", order: 2 },
        { label: "Modos", value: "4", order: 3 },
        { label: "Intensidade", value: "1.600 mW/cm²", order: 4 },
      ]),
    ]);

    expect(linhas.slice(0, 4).map((linha) => linha.rotulo)).toEqual([
      "Intensidade",
      "Modos",
      "Bateria",
      "Ponteira",
    ]);
  });

  it("mantém voltagem e garantia como contexto depois das specs decisivas", () => {
    const atual = produto("Compressor 40 L", [
      { label: "Reservatório", value: "40 L", order: 0 },
      { label: "Pressão", value: "8 bar", order: 1 },
    ]);
    atual.voltage = "Bivolt";
    atual.warrantyMonths = 12;

    const alternativa = produto("Compressor 50 L", [
      { label: "Reservatório", value: "50 L", order: 0 },
      { label: "Pressão", value: "8 bar", order: 1 },
    ]);
    alternativa.voltage = "220 V";
    alternativa.warrantyMonths = 24;

    expect(linhasDaComparacao([atual, alternativa]).map((linha) => linha.rotulo)).toEqual([
      "Reservatório",
      "Pressão",
      "Voltagem",
      "Garantia",
    ]);
  });
});
