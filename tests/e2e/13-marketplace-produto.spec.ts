import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

test.describe("Marketplace — página do produto", () => {
  test("reúne galeria, identidade e compra na primeira dobra desktop", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const galeria = page.locator("[data-pdp-gallery]");
    const resumo = page.locator("[data-pdp-summary]");
    const compra = page.locator("[data-pdp-buybox]");
    await expect(galeria).toBeVisible();
    await expect(resumo).toBeVisible();
    await expect(compra).toBeVisible();

    const [g, r, c] = await Promise.all([
      galeria.boundingBox(),
      resumo.boundingBox(),
      compra.boundingBox(),
    ]);
    expect(g!.x).toBeLessThan(r!.x);
    expect(r!.x).toBeLessThan(c!.x);
    expect(Math.max(g!.y, r!.y, c!.y)).toBeLessThan(900);
    await expect(compra.getByRole("button", { name: "Comprar agora" })).toBeVisible();
    await expect(
      compra.getByRole("button", { name: "Adicionar ao carrinho" }),
    ).toBeVisible();
  });
});
