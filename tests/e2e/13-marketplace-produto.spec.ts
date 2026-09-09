import { expect, test } from "@playwright/test";

import { emReais } from "./apoio";
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

  test("mantém preço, CEP e ações na ordem de decisão", async ({ page }) => {
    const { frete } = fixtures();
    await page.goto(`/loja/${frete.slug}`);

    const painel = page.locator("[data-pdp-buybox]");
    const preco = painel.getByText(emReais(frete.precoCents)).first();
    const cep = painel.getByRole("textbox", { name: /CEP/ });
    const comprar = painel.getByRole("button", { name: "Comprar agora" });
    await expect(preco).toBeVisible();
    await expect(cep).toBeVisible();
    await expect(comprar).toBeVisible();
    await expect(
      painel.getByRole("button", { name: "Adicionar ao carrinho" }),
    ).toBeVisible();

    const [caixaPreco, caixaCep, caixaComprar] = await Promise.all([
      preco.boundingBox(),
      cep.boundingBox(),
      comprar.boundingBox(),
    ]);
    expect(caixaPreco!.y).toBeLessThan(caixaCep!.y);
    expect(caixaCep!.y).toBeLessThan(caixaComprar!.y);
  });

  test("organiza conteúdo técnico antes de relacionados e evita chamadas repetidas", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const preparo = page.locator("#preparo");
    const entrega = page.locator("#entrega-e-garantia");
    const relacionados = page.locator("#relacionados");
    await expect(preparo).toBeVisible();
    await expect(entrega).toBeVisible();
    await expect(relacionados).toBeVisible();

    const candidatos = [page.locator("#ficha-tecnica"), preparo, entrega];
    for (const candidato of candidatos) {
      if (await candidato.count()) {
        expect((await candidato.boundingBox())!.y).toBeLessThan(
          (await relacionados.boundingBox())!.y,
        );
      }
    }
    expect(
      await page.getByText("Assistência técnica própria", { exact: true }).count(),
    ).toBeLessThanOrEqual(1);
  });

  test("mantém a conversão acessível no celular sem cobrir o final da página", async ({ page }) => {
    const { produto } = fixtures();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/loja/${produto.slug}`);
    await page.locator("#ficha-tecnica, #preparo").first().scrollIntoViewIfNeeded();

    const barra = page.getByRole("link", { name: "Comprar", exact: true });
    await expect(barra).toBeVisible();
    const caixa = await barra.boundingBox();
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(844);

    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    const padding = await page.evaluate(() => getComputedStyle(document.body).paddingBottom);
    expect(Number.parseFloat(padding)).toBeGreaterThan(0);
  });
});
