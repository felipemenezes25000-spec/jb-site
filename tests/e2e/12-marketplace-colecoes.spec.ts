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

  test("abre filtros, grava a escolha na URL e mostra o resumo aplicado", async ({ page }) => {
    await page.goto("/loja");
    const abrir = page.getByRole("button", { name: /Todos os filtros/ });
    await abrir.click();

    const dialogo = page.getByRole("dialog", { name: "Filtros do catálogo" });
    await expect(dialogo).toBeVisible();
    const opcao = dialogo
      .getByRole("link", { name: /^Filtrar por Categoria: / })
      .first();
    const rotulo = (await opcao.getAttribute("aria-label"))!.replace(
      "Filtrar por Categoria: ",
      "",
    );
    await opcao.click();

    await page.waitForURL(/categoria=/);
    await expect(
      page.getByRole("link", { name: `Remover filtro Categoria: ${rotulo}` }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Limpar tudo" }).first()).toBeVisible();
  });

  test("o diálogo devolve o foco ao botão ao fechar com Escape", async ({ page }) => {
    await page.goto("/loja");
    const abrir = page.getByRole("button", { name: /Todos os filtros/ });
    await abrir.click();
    await page.keyboard.press("Escape");
    await expect(abrir).toBeFocused();
  });
});
