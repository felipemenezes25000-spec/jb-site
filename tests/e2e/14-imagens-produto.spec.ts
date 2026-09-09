import { expect, test } from "@playwright/test";

async function esperarImagens(page: import("@playwright/test").Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("img[data-imagem-produto]").first()).toBeVisible();
}

test.describe("Imagens de produto sem moldura branca", () => {
  test("a home trata todas as fotos de produto como recortes integrados ao fundo", async ({ page }) => {
    await page.goto("/");
    await esperarImagens(page);

    const imagens = page.locator("img[data-imagem-produto]");
    expect(await imagens.count()).toBeGreaterThanOrEqual(8);

    const tratamentos = await imagens.evaluateAll((elementos) =>
      elementos.map((elemento) => getComputedStyle(elemento).mixBlendMode),
    );

    expect(new Set(tratamentos)).toEqual(new Set(["multiply"]));
  });

  test("a grade da loja aplica o mesmo tratamento a todos os equipamentos", async ({ page }) => {
    await page.goto("/loja");
    await esperarImagens(page);

    const cards = page.locator("[data-marketplace-card]");
    const imagens = cards.locator("img[data-imagem-produto]");

    expect(await imagens.count()).toBeGreaterThan(0);
    await expect(cards.locator("img:not([data-imagem-produto])")).toHaveCount(0);

    const tratamentos = await imagens.evaluateAll((elementos) =>
      elementos.map((elemento) => getComputedStyle(elemento).mixBlendMode),
    );
    expect(new Set(tratamentos)).toEqual(new Set(["multiply"]));
  });

  test("a foto principal e as miniaturas do produto não recuperam o retângulo branco", async ({
    page,
  }) => {
    await page.goto("/loja/motor-de-implante-35ncm");
    await esperarImagens(page);

    const galeria = page.locator("[data-pdp-marketplace]").first();
    const imagens = galeria.locator("img[data-imagem-produto]");

    expect(await imagens.count()).toBeGreaterThanOrEqual(1);
    const tratamentos = await imagens.evaluateAll((elementos) =>
      elementos.map((elemento) => getComputedStyle(elemento).mixBlendMode),
    );
    expect(new Set(tratamentos)).toEqual(new Set(["multiply"]));
  });
});
