import { describe, expect, it } from "vitest";

import {
  categoriaDaAlternativaAutomatica,
  codificarOrdemRelacao,
  decodificarOrdemRelacao,
  ordenarRelacoesTipadas,
} from "@/lib/marketplace/relacionamentos-produto";

describe("relacionamentos de produto", () => {
  it("mantém relações legadas como alternativas", () => {
    expect(decodificarOrdemRelacao(0)).toEqual({ tipo: "alternativa", ordem: 0 });
    expect(decodificarOrdemRelacao(27)).toEqual({ tipo: "alternativa", ordem: 27 });
    expect(decodificarOrdemRelacao(999)).toEqual({ tipo: "alternativa", ordem: 999 });
  });

  it("codifica acessórios e complementos em faixas sem colisão", () => {
    expect(codificarOrdemRelacao("alternativa", 3)).toBe(3);
    expect(codificarOrdemRelacao("acessorio", 3)).toBe(1003);
    expect(codificarOrdemRelacao("complemento", 3)).toBe(2003);

    expect(decodificarOrdemRelacao(1003)).toEqual({ tipo: "acessorio", ordem: 3 });
    expect(decodificarOrdemRelacao(2003)).toEqual({ tipo: "complemento", ordem: 3 });
  });

  it("limita a ordem interna para uma relação nunca invadir outra faixa", () => {
    expect(codificarOrdemRelacao("alternativa", 50_000)).toBe(999);
    expect(codificarOrdemRelacao("acessorio", 50_000)).toBe(1999);
    expect(codificarOrdemRelacao("complemento", 50_000)).toBe(2999);
  });

  it("ordena primeiro por intenção e depois pela prioridade dentro do grupo", () => {
    expect(
      ordenarRelacoesTipadas([
        { targetId: "c2", tipo: "complemento", ordem: 2 },
        { targetId: "a5", tipo: "alternativa", ordem: 5 },
        { targetId: "x1", tipo: "acessorio", ordem: 1 },
        { targetId: "a0", tipo: "alternativa", ordem: 0 },
      ]),
    ).toEqual([
      { targetId: "a0", tipo: "alternativa", ordem: 0 },
      { targetId: "a5", tipo: "alternativa", ordem: 5 },
      { targetId: "x1", tipo: "acessorio", ordem: 1 },
      { targetId: "c2", tipo: "complemento", ordem: 2 },
    ]);
  });

  it("só permite completar alternativas automaticamente quando há categoria", () => {
    expect(categoriaDaAlternativaAutomatica("profilaxia-id")).toBe("profilaxia-id");
    expect(categoriaDaAlternativaAutomatica("  profilaxia-id  ")).toBe("profilaxia-id");
    expect(categoriaDaAlternativaAutomatica("")).toBeNull();
    expect(categoriaDaAlternativaAutomatica(null)).toBeNull();
    expect(categoriaDaAlternativaAutomatica(undefined)).toBeNull();
  });
});
