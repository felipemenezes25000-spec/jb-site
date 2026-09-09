import { expect, test } from "@playwright/test";

test.describe("Marketplace — coleções", () => {
  test("usa quatro colunas no desktop e duas no celular de 390 px", async ({ page }) => {
    await page.goto("/loja");
    const grade = page.locator("[data-grade-marketplace]").first();
    await expect(grade).toBeVisible();

    expect(
      await grade.evaluate((elemento) =>
        getComputedStyle(elemento).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
    ).toBe(4);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await grade.evaluate((elemento) =>
        getComputedStyle(elemento).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
    ).toBe(2);
  });

  test("mantém os componentes do marketplace fora da home", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-marketplace-shell]")).toHaveCount(0);
    await expect(page.locator("[data-grade-marketplace]")).toHaveCount(0);
  });
});
