import { describe, expect, it } from "vitest";

import { disponibilidadeDoProduto } from "@/domain/catalogo/disponibilidade";

/**
 * Um produto, uma frase sobre o estoque dele.
 *
 * A mesma autoclave com três unidades era anunciada como "Últimas 3 un" na
 * home, "Últimas 3 unidades" na conta e "Em estoque" no catálogo — três
 * cartões, três funções, três respostas. A terceira era a pior: o catálogo não
 * tinha o degrau de "acabando" e dizia o mesmo de três unidades e de quarenta,
 * então a urgência sumia no clique da home para a lista.
 */

const produto = (parcial: Partial<Parameters<typeof disponibilidadeDoProduto>[0]>) =>
  disponibilidadeDoProduto({
    trackInventory: true,
    stock: 10,
    unique: false,
    ...parcial,
  });

describe("disponibilidadeDoProduto", () => {
  it("separa peça única vendida de produto temporariamente indisponível", () => {
    /* Num anúncio de peça única, "esta máquina tem dono" e "acabou por
       enquanto" levam a decisões opostas: procurar outra ou esperar. */
    expect(produto({ stock: 0, unique: true })).toEqual({
      texto: "Unidade vendida",
      tom: "esgotado",
    });
    expect(produto({ stock: 0, unique: false })).toEqual({
      texto: "Indisponível",
      tom: "esgotado",
    });
  });

  it("anuncia escassez só quando ela é verdade", () => {
    expect(produto({ stock: 3 })).toEqual({ texto: "Últimas 3 unidades", tom: "pouco" });
    expect(produto({ stock: 2 })).toEqual({ texto: "Últimas 2 unidades", tom: "pouco" });
    expect(produto({ stock: 4 })).toEqual({ texto: "Em estoque", tom: "ok" });
    expect(produto({ stock: 40 })).toEqual({ texto: "Em estoque", tom: "ok" });
  });

  it("não escreve 'Últimas 1 unidades'", () => {
    expect(produto({ stock: 1 })).toEqual({ texto: "Última unidade", tom: "pouco" });
  });

  it("não lê escassez de um cadastro que não conta unidades", () => {
    /* `stock` não quer dizer nada sem `trackInventory`: tratar o zero desse
       cadastro como esgotado esconderia da loja um produto que a JB consegue. */
    expect(produto({ trackInventory: false, stock: 0 })).toEqual({
      texto: "Disponível",
      tom: "sob-encomenda",
    });
    expect(produto({ trackInventory: false, stock: 1 })).toEqual({
      texto: "Disponível",
      tom: "sob-encomenda",
    });
  });

  it("peça única sem controle de estoque continua sendo peça única", () => {
    expect(produto({ trackInventory: false, stock: 0, unique: true })).toEqual({
      texto: "Unidade única",
      tom: "unico",
    });
  });

  it("peça única com estoque não vira 'Últimas 1 unidades'", () => {
    expect(produto({ stock: 1, unique: true })).toEqual({
      texto: "Unidade única",
      tom: "unico",
    });
  });

  it("estoque negativo é tratado como esgotado, não como escassez", () => {
    /* Acontece: devolução processada duas vezes, ajuste manual errado. Um
       "Últimas -1 unidades" na vitrine seria pior do que o próprio erro. */
    expect(produto({ stock: -2 }).tom).toBe("esgotado");
  });
});
