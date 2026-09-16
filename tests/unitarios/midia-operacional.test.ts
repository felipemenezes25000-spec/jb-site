import { describe, expect, it } from "vitest";

import { midiaOperacionalEhPrivada, urlExpostaDaMidia } from "@/lib/midia-operacional";

describe("mídia operacional", () => {
  it.each(["chamados", "equipamentos", "ordens", "documentos"])(
    "trata %s como pasta privada",
    (folder) => {
      expect(midiaOperacionalEhPrivada(folder)).toBe(true);
      expect(
        urlExpostaDaMidia({
          id: "midia-123",
          folder,
          url: "https://storage.exemplo/segredo.jpg",
        }),
      ).toBe("/api/midia/midia-123");
    },
  );

  it("mantém URL direta para mídia pública de catálogo", () => {
    expect(
      urlExpostaDaMidia({
        id: "midia-publica",
        folder: "produtos",
        url: "https://storage.exemplo/produto.jpg",
      }),
    ).toBe("https://storage.exemplo/produto.jpg");
  });
});
