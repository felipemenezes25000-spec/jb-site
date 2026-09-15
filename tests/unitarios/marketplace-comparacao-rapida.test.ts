import { describe, expect, it } from "vitest";

import { compararProdutos } from "@/domain/specs/comparar";
import type { ProdutoParaFicha } from "@/domain/specs/construir";

/* ============================================================================
   Comparação entre produtos

   Este arquivo testava `linhasDaComparacao`, que era o TERCEIRO esquema de
   atributos do site para os mesmos dois produtos. Ele agora exercita a fonte
   única — a mesma que a ficha da PDP, o comparador completo e o prontuário
   leem — e cobre o que a auditoria encontrou quebrado: capacidade e ciclo
   fora da comparação, "220" ao lado de "bivolt", e "6 meses" ao lado de
   "1 ano" na mesma coluna.
   ============================================================================ */

function produto(
  nome: string,
  specs: NonNullable<ProdutoParaFicha["specs"]>,
  extras: Partial<ProdutoParaFicha> = {},
): ProdutoParaFicha {
  return {
    nome,
    sku: nome.toLowerCase().replaceAll(" ", "-"),
    condicao: "novo",
    specs,
    ...extras,
  };
}

describe("compararProdutos", () => {
  it("coloca os atributos decisivos da autoclave no topo", () => {
    const comparacao = compararProdutos([
      produto("Autoclave vertical 18 L", [
        { label: "Tensão", value: "220 V", order: 0 },
        { label: "Bandejas", value: "4", order: 1 },
        { label: "Secagem", value: "20 min", order: 2 },
        { label: "Capacidade", value: "18 L", order: 3 },
      ]),
      produto("Autoclave vertical 21 L", [
        { label: "Tensão", value: "220 V", order: 0 },
        { label: "Bandejas", value: "5", order: 1 },
        { label: "Secagem", value: "20 min", order: 2 },
        { label: "Capacidade", value: "21 L", order: 3 },
      ]),
    ]);

    const decisivas = comparacao.linhas
      .filter((linha) => linha.decisive)
      .map((linha) => linha.label);

    expect(decisivas).toContain("Capacidade");
    expect(decisivas).toContain("Bandejas");
    expect(comparacao.linhas[0].decisive).toBe(true);
  });

  it("não deixa a mesma tensão sair como '220' num lado e 'bivolt' no outro", () => {
    const comparacao = compararProdutos([
      produto("Compressor 40 L", [], { voltagem: "bivolt" }),
      produto("Compressor 50 L", [], { voltagem: "220" }),
    ]);

    const tensao = comparacao.linhas.find((linha) => linha.key === "tensao");
    expect(tensao?.valores).toEqual(["Bivolt (110/220 V)", "220 V"]);
  });

  it("converte garantia para a mesma unidade nas duas colunas", () => {
    const comparacao = compararProdutos([
      produto("Autoclave 12 L", [], { garantiaMeses: 6 }),
      produto("Autoclave 18 L", [], { garantiaMeses: 12 }),
    ]);

    /* A coluna inteira sai em meses quando as escalas se misturariam: "6
       meses" ao lado de "1 ano" era o que a auditoria fotografou. */
    const garantia = comparacao.linhas.find((linha) => linha.key === "garantia");
    expect(garantia?.valores).toEqual(["6 meses", "12 meses"]);
    expect(garantia?.diverge).toBe(true);
  });

  it("conta como divergente só o que realmente muda", () => {
    const comparacao = compararProdutos([
      produto("Autoclave A", [{ label: "Capacidade", value: "12 L", order: 0 }], {
        voltagem: "220",
      }),
      produto("Autoclave B", [{ label: "Capacidade", value: "12 L", order: 0 }], {
        voltagem: "220 V",
      }),
    ]);

    expect(comparacao.divergentes).toBe(0);
  });

  it("avisa quando as famílias comparadas são diferentes", () => {
    const comparacao = compararProdutos([
      produto("Autoclave vertical 18 L", []),
      produto("Cuba lavadora ultrassônica 7 L", []),
    ]);

    expect(comparacao.familiasMisturadas).toBe(true);
  });

  it("não cria linha inteira de travessões", () => {
    const comparacao = compararProdutos([
      produto("Autoclave A", [{ label: "Capacidade", value: "12 L", order: 0 }]),
      produto("Autoclave B", [{ label: "Capacidade", value: "18 L", order: 0 }]),
    ]);

    for (const linha of comparacao.linhas) {
      expect(linha.valores.some((valor) => valor !== null)).toBe(true);
    }
  });
});
