import { expect, test } from "@playwright/test";

async function esperarImagens(page: import("@playwright/test").Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("img[data-imagem-produto]").first()).toBeVisible();
}

async function esperarRecortesReais(page: import("@playwright/test").Page) {
  const imagens = page.locator('img[data-imagem-produto][src*="catalogo-demo"]');
  expect(await imagens.count()).toBeGreaterThan(0);

  const resultado = await imagens.evaluateAll(async (elementos) => {
    return Promise.all(
      elementos.map(async (elemento) => {
        const imagem = elemento as HTMLImageElement;
        const origem = imagem.currentSrc || imagem.src;
        const amostra = new Image();
        amostra.src = origem;
        await amostra.decode();

        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const contexto = canvas.getContext("2d", { willReadFrequently: true });
        contexto?.drawImage(amostra, 0, 0, 1, 1, 0, 0, 1, 1);

        return {
          alphaDoCanto: contexto?.getImageData(0, 0, 1, 1).data[3] ?? 255,
          composicao: getComputedStyle(imagem).mixBlendMode,
          origem,
        };
      }),
    );
  });

  expect(
    resultado.every(({ origem }) =>
      decodeURIComponent(origem).includes("/catalogo-demo/sem-fundo/"),
    ),
  ).toBe(true);
  expect(new Set(resultado.map(({ composicao }) => composicao))).toEqual(new Set(["normal"]));
  expect(resultado.every(({ alphaDoCanto }) => alphaDoCanto <= 5)).toBe(true);
}

test.describe("Imagens de produto sem moldura branca", () => {
  test("a home trata todas as fotos de produto como recortes integrados ao fundo", async ({ page }) => {
    await page.goto("/");
    await esperarImagens(page);

    const imagens = page.locator("img[data-imagem-produto]");
    expect(await imagens.count()).toBeGreaterThanOrEqual(8);

    await esperarRecortesReais(page);
  });

  test("a grade da loja aplica o mesmo tratamento a todos os equipamentos", async ({ page }) => {
    await page.goto("/loja");
    await esperarImagens(page);

    const cards = page.locator("[data-marketplace-card]");
    const imagens = cards.locator("img[data-imagem-produto]");

    expect(await imagens.count()).toBeGreaterThan(0);
    await expect(cards.locator("img:not([data-imagem-produto])")).toHaveCount(0);

    await esperarRecortesReais(page);
  });

  test("a foto principal e as miniaturas do produto não recuperam o retângulo branco", async ({
    page,
  }) => {
    await page.goto("/loja/motor-de-implante-35ncm");
    await esperarImagens(page);

    const galeria = page.locator("[data-pdp-marketplace]").first();
    const imagens = galeria.locator("img[data-imagem-produto]");

    expect(await imagens.count()).toBeGreaterThanOrEqual(1);
    await esperarRecortesReais(page);
  });

  for (const largura of [320, 390]) {
    test(`a home não cria rolagem lateral em ${largura}px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      const larguraDocumento = await page.evaluate(() => ({
        cliente: document.documentElement.clientWidth,
        conteudo: document.documentElement.scrollWidth,
      }));

      expect(larguraDocumento.conteudo).toBe(larguraDocumento.cliente);
    });
  }
});
