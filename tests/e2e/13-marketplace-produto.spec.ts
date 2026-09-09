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

  test("mantém preço, ações, entrega e personalização na ordem de decisão", async ({ page }) => {
    const { frete } = fixtures();
    await page.goto(`/loja/${frete.slug}`);

    const painel = page.locator("[data-pdp-buybox]");
    const preco = painel.getByText(emReais(frete.precoCents)).first();
    const comprar = painel.getByRole("button", { name: "Comprar agora" });
    const cep = painel.getByRole("textbox", { name: /CEP/ });
    const personalizar = painel.getByText("Personalize a compra", { exact: true });

    await expect(preco).toBeVisible();
    await expect(comprar).toBeVisible();
    await expect(
      painel.getByRole("button", { name: "Adicionar ao carrinho" }),
    ).toBeVisible();
    await expect(cep).toBeVisible();
    await expect(personalizar).toBeVisible();

    const [caixaPreco, caixaComprar, caixaCep, caixaPersonalizar] = await Promise.all([
      preco.boundingBox(),
      comprar.boundingBox(),
      cep.boundingBox(),
      personalizar.boundingBox(),
    ]);
    expect(caixaPreco!.y).toBeLessThan(caixaComprar!.y);
    expect(caixaComprar!.y).toBeLessThan(caixaCep!.y);
    expect(caixaCep!.y).toBeLessThan(caixaPersonalizar!.y);
  });

  test("personalização abaixo do CTA alimenta o mesmo formulário de compra", async ({ page }) => {
    const { frete } = fixtures();
    await page.goto(`/loja/${frete.slug}`);

    const painel = page.locator("[data-pdp-buybox]");
    const adicionar = painel.getByRole("button", { name: "Adicionar ao carrinho" });

    // O controle está depois de entrega/CTA no DOM, mas o estado precisa chegar
    // aos inputs hidden do formulário principal que ficou acima dele.
    await painel.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(painel.getByText("Total configurado", { exact: true })).toBeVisible();
    await expect(painel.getByText(emReais(frete.precoCents * 2), { exact: true })).toBeVisible();

    const formulario = adicionar.locator("xpath=ancestor::form");
    await expect(formulario.locator('input[name="quantidade"]')).toHaveValue("2");

    await adicionar.click();
    await expect(page.getByText(`${frete.nome} foi adicionado ao carrinho.`)).toBeVisible();

    await page.goto("/carrinho");
    await expect(page.getByRole("link", { name: frete.nome })).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: /Carrinho com 2 itens/ }),
    ).toBeVisible();
  });

  test("usa hub técnico progressivo e não recupera relacionados genéricos", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const ficha = page.locator("#ficha-tecnica");
    const preparo = page.locator("#preparo");
    const entrega = page.locator("#entrega-e-garantia");
    await expect(ficha).toBeVisible();
    await expect(preparo).toBeVisible();
    await expect(entrega).toBeVisible();

    // O carrossel genérico foi aposentado: cada intenção comercial tem sua
    // própria experiência (comparação, acessórios e complementos).
    await expect(page.locator("#relacionados")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Seções deste equipamento" }).getByRole("link", {
        name: "Relacionados",
      }),
    ).toHaveCount(0);

    const detalhes = page.locator(
      "#ficha-tecnica > details, #preparo > details, #entrega-e-garantia > details",
    );
    await expect(detalhes).toHaveCount(3);

    const estadosIniciais = await detalhes.evaluateAll((itens) =>
      itens.map((item) => (item as HTMLDetailsElement).open),
    );
    expect(estadosIniciais).toEqual([false, false, false]);

    await preparo.locator("summary").click();
    await expect(preparo.locator("details")).toHaveAttribute("open", "");
    await expect(preparo.getByText("Antes de comprar", { exact: true }).first()).toBeVisible();

    expect(
      await page.getByText("Assistência técnica própria", { exact: true }).count(),
    ).toBeLessThanOrEqual(1);
  });

  test("a navegação sticky não aponta para seção inexistente", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const destinos = await page
      .getByRole("navigation", { name: "Seções deste equipamento" })
      .locator('a[href^="#"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));

    const ausentes = await page.evaluate((hrefs) =>
      hrefs.filter((href) => !document.querySelector(href as string)),
      destinos,
    );
    expect(ausentes).toEqual([]);
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

  test("não cria overflow horizontal da página em larguras críticas", async ({ page }) => {
    const { produto } = fixtures();

    for (const width of [320, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
      await page.goto(`/loja/${produto.slug}`);

      const medidas = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        medidas.scrollWidth,
        `overflow horizontal na PDP com viewport ${width}px`,
      ).toBeLessThanOrEqual(medidas.clientWidth + 1);
    }
  });

  test("pergunta técnica fica recolhida até o cliente pedir", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const duvidas = page.locator("#duvidas");
    await expect(duvidas).toBeVisible();

    const campo = duvidas.getByRole("textbox", { name: "Sua pergunta" });
    await expect(campo).toBeHidden();

    await duvidas.getByText("Não encontrou sua dúvida?", { exact: true }).click();
    await expect(campo).toBeVisible();
    await expect(duvidas.getByRole("textbox", { name: "Seu nome" })).toBeVisible();
    await expect(duvidas.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  });

  test("o produto comprável não mistura orçamento ou indisponibilidade", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const painel = page.locator("[data-pdp-buybox]");
    await expect(painel.getByRole("button", { name: "Comprar agora" })).toBeEnabled();
    await expect(painel.getByText("Disponível sob orçamento")).toHaveCount(0);
    await expect(painel.getByText("Indisponível", { exact: true })).toHaveCount(0);
  });

  test("não exibe número de série fora de uma unidade identificável", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    await expect(page.getByText(/Número de série/i)).toHaveCount(0);
  });
});
