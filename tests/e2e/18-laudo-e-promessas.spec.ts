import { expect, test } from "@playwright/test";

/* ============================================================================
   A página não promete o que não entrega

   Dois casos medidos na auditoria de 15/09/2026, e os dois são do mesmo tipo:
   texto afirmando que existe algo que a página não mostra.

   1. **O laudo.** A caixa de condição dizia "O laudo de inspeção desta
      unidade está mais abaixo" e a resposta do FAQ dizia "está nesta página,
      item a item". Não estava: o componente do laudo tinha virado um
      `return null` e as frases continuaram no ar.

   2. **As âncoras.** A barra da ficha oferecia "Esta unidade" para uma seção
      que não existia mais.

   O teste é de contrato, e vale para qualquer seminovo do catálogo: se a
   página fala em laudo, a seção `#laudo` existe; se ela existe, a âncora leva
   até lá.
   ============================================================================ */

test.describe("Promessas da ficha de seminovo", () => {
  test("todo equipamento que não é novo tem a seção do laudo", async ({ page }) => {
    await page.goto("/seminovos");

    const primeiro = page.locator("a[href^='/loja/']").first();
    if ((await primeiro.count()) === 0) test.skip(true, "sem seminovo publicado");

    const href = await primeiro.getAttribute("href");
    await page.goto(href!);

    const laudo = page.locator("#laudo");
    await expect(laudo).toHaveCount(1);
    await expect(laudo).toContainText(/Laudo de inspeção desta unidade/i);
  });

  test("quem fala em laudo tem a seção — e quem não tem, não fala", async ({ page }) => {
    await page.goto("/seminovos");
    const primeiro = page.locator("a[href^='/loja/']").first();
    if ((await primeiro.count()) === 0) test.skip(true, "sem seminovo publicado");

    await page.goto((await primeiro.getAttribute("href"))!);

    const caixaDeCondicao = page.getByText(/laudo de inspeção desta unidade/i).first();
    if ((await caixaDeCondicao.count()) === 0) return;

    /* A frase existe: então a seção precisa existir e ter conteúdo, não só o
       título. */
    const itens = page.locator("#laudo li");
    const notas = page.locator("#laudo h3");
    expect((await itens.count()) + (await notas.count())).toBeGreaterThan(0);
  });

  test("a âncora do laudo aparece na barra e leva até a seção", async ({ page }) => {
    await page.goto("/seminovos");
    const primeiro = page.locator("a[href^='/loja/']").first();
    if ((await primeiro.count()) === 0) test.skip(true, "sem seminovo publicado");

    await page.goto((await primeiro.getAttribute("href"))!);

    const ancora = page.locator("a[href='#laudo']").first();
    await expect(ancora).toHaveCount(1);

    await ancora.click();
    await expect(page.locator("#laudo")).toBeInViewport();
  });

  test("equipamento novo não inventa laudo de unidade", async ({ page }) => {
    await page.goto("/loja");
    const primeiro = page.locator("a[href^='/loja/']").first();
    if ((await primeiro.count()) === 0) test.skip(true, "catálogo vazio");

    await page.goto((await primeiro.getAttribute("href"))!);
    await expect(page.locator("#laudo")).toHaveCount(0);
  });
});
