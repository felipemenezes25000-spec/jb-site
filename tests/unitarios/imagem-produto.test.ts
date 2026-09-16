import { describe, expect, it } from "vitest";

import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

describe("imagemProdutoSemFundo", () => {
  it("troca os JPGs do catálogo demonstrativo pelo recorte PNG", () => {
    expect(imagemProdutoSemFundo("/catalogo-demo/motor-implante.jpg")).toBe(
      "/catalogo-demo/sem-fundo/motor-implante.png",
    );
  });

  it("preserva URLs externas e mídias que não pertencem ao catálogo demonstrativo", () => {
    expect(imagemProdutoSemFundo("https://cdn.exemplo.com/produto.jpg")).toBe(
      "https://cdn.exemplo.com/produto.jpg",
    );
    expect(imagemProdutoSemFundo("/uploads/produto.jpg")).toBe("/uploads/produto.jpg");
    expect(imagemProdutoSemFundo(null)).toBeNull();
  });
});
