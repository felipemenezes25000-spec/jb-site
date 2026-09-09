import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

/**
 * Cabeçalho exclusivo da PDP.
 *
 * A Home já tem o cabeçalho aprovado. O contrato desta suíte é justamente
 * impedir que o acabamento da ficha de produto vaze para `/`, `/loja` ou
 * qualquer outra tela, e garantir que a versão especial continue íntegra nas
 * larguras onde um header de marketplace costuma quebrar.
 */

const HEADER = 'header[data-jb-premium-header="true"]';
const PDP = "[data-pdp-marketplace]";
const BUSCA_DESKTOP = ".jb-busca-topo";

async function semRolagemHorizontal(page: import("@playwright/test").Page) {
  const medidas = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documento: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(
    Math.max(medidas.documento, medidas.body),
    `a página não pode ultrapassar a viewport (${medidas.viewport}px)`,
  ).toBeLessThanOrEqual(medidas.viewport + 1);
}

async function abrirProduto(page: import("@playwright/test").Page) {
  const { produto } = fixtures();
  await page.goto(`/loja/${produto.slug}`);
  await expect(page.locator(PDP)).toBeVisible();
  await expect(page.locator(HEADER)).toBeVisible();
}

test.describe("Cabeçalho da página de produto", () => {
  test("não altera o cabeçalho aprovado da Home", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.locator(PDP)).toHaveCount(0);

    const maxWidthDaBusca = await page.locator(BUSCA_DESKTOP).evaluate((el) =>
      getComputedStyle(el).maxWidth,
    );

    // Na Home continua valendo o limite do header original. Na PDP o CSS
    // exclusivo troca esse valor para `none` e deixa a busca absorver espaço.
    expect(maxWidthDaBusca).not.toBe("none");
    await semRolagemHorizontal(page);
  });

  test("em 1440px ativa somente a composição premium da PDP", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrirProduto(page);

    const busca = page.locator(BUSCA_DESKTOP);
    await expect(busca).toBeVisible();

    const estado = await busca.evaluate((el) => {
      const caixa = el.getBoundingClientRect();
      return {
        largura: caixa.width,
        maxWidth: getComputedStyle(el).maxWidth,
      };
    });

    expect(estado.maxWidth).toBe("none");
    expect(estado.largura).toBeGreaterThanOrEqual(420);

    const assinatura = await page.locator(`${HEADER} .jb-logo`).evaluate((el) =>
      getComputedStyle(el, "::after").content,
    );
    expect(assinatura).toContain("MARKETPLACE");

    await expect(page.locator(`${HEADER} nav[aria-label="Principal"]`)).toBeVisible();
    await semRolagemHorizontal(page);
  });

  test("mantém navegação desktop aberta entre 1700 e 1839px", async ({ page }) => {
    await page.setViewportSize({ width: 1760, height: 1000 });
    await abrirProduto(page);

    await expect(page.locator(`${HEADER} nav[aria-label="Principal"]`)).toBeVisible();
    await expect(page.locator(`${HEADER} button[aria-haspopup="dialog"]`)).toBeHidden();
    await semRolagemHorizontal(page);
  });

  for (const largura of [1024, 1280, 1920]) {
    test(`não estoura o header em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrirProduto(page);

      const caixa = await page.locator(HEADER).boundingBox();
      expect(caixa).not.toBeNull();
      expect(caixa!.x).toBeGreaterThanOrEqual(-1);
      expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(largura + 1);

      await semRolagemHorizontal(page);
    });
  }

  for (const largura of [320, 360, 390, 430, 768]) {
    test(`mobile/tablet ${largura}px preserva ações e não cria rolagem lateral`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 844 });
      await abrirProduto(page);

      // A busca grande é desktop; no mobile fica o gatilho e a busca expansível.
      await expect(page.locator(`${HEADER} ${BUSCA_DESKTOP}`)).toBeHidden();
      await expect(page.locator(`${HEADER} button[aria-haspopup="dialog"]`)).toBeVisible();

      const botoes = page.locator(`${HEADER} button:visible, ${HEADER} a:visible`);
      const total = await botoes.count();
      expect(total).toBeGreaterThan(0);

      await semRolagemHorizontal(page);
    });
  }
});
