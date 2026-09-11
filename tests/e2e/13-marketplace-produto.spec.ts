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
    const personalizar = painel.getByText("Mais opções da compra", { exact: true });

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
    // aos inputs hidden do formulário principal que ficou acima dele. Ele mora
    // dentro da gaveta "Mais opções da compra", que nasce fechada — a primeira
    // dobra não precisa carregar quantidade e serviços para quem só quer o
    // preço.
    await painel.getByText("Mais opções da compra", { exact: true }).click();
    await painel.getByRole("button", { name: "Aumentar quantidade" }).click();
    // o bloco chama-se só "Total" (com a composição na linha de baixo)
    const total = painel.getByText("Total", { exact: true });
    await expect(total).toBeVisible();
    // O valor sai de `formatarPreco`, que escreve "R$ 2.468,00" dentro de um
    // único <strong> — procurar "2.468,00" com `exact` nunca casaria. A busca
    // é pelo bloco do total, e o número é conferido como parte do texto dele.
    await expect(total.locator("xpath=ancestor::div[1]")).toContainText(
      emReais(frete.precoCents * 2),
    );

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

  /**
   * O contrato mudou em 10/09/2026, e este teste mudou junto.
   *
   * Antes ele exigia o oposto do que exige agora: três `<details>` recolhidos
   * em `#ficha-tecnica`, `#preparo` e `#entrega-e-garantia`, e um clique para
   * abrir. No desktop isso virava três gavetas de 73px empilhadas onde deveria
   * estar o miolo técnico da página — e requisito de instalação é justamente o
   * que o cliente precisa descobrir *antes* de comprar.
   *
   * Nenhuma das dez fichas de produto medidas como referência recolhe a ficha
   * técnica no desktop. A divulgação progressiva não sumiu: ela desceu para
   * dentro da lista longa (ver `DADOS_VISIVEIS` em `especificacoes.tsx`), que
   * é onde as mesmas referências realmente encurtam a página.
   */
  test("mostra o miolo técnico aberto e não recupera relacionados genéricos", async ({ page }) => {
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

    // Nenhuma seção é uma gaveta.
    await expect(
      page.locator("#ficha-tecnica > details, #preparo > details, #entrega-e-garantia > details"),
    ).toHaveCount(0);

    // E o conteúdo delas está na tela sem ninguém clicar em nada.
    await expect(preparo.getByRole("heading", { name: "Antes de comprar" })).toBeVisible();
    await expect(preparo.getByText("Compatibilidade com o local")).toBeVisible();
    await expect(ficha.getByText("Dados do modelo")).toBeVisible();

    // Um `h2` por página, e não cinco tamanhos: a régua que a auditoria pediu.
    const tamanhosDeH2 = await page
      .locator("main h2")
      .evaluateAll((itens) => [...new Set(itens.map((h) => getComputedStyle(h).fontSize))]);
    expect(tamanhosDeH2).toHaveLength(1);

    // E uma largura só de container, do topo ao rodapé da ficha.
    const largurasDeContainer = await page
      .locator("main .container-jb")
      .evaluateAll((itens) => [
        ...new Set(itens.map((c) => Math.round(c.getBoundingClientRect().width))),
      ]);
    expect(largurasDeContainer).toHaveLength(1);

    expect(
      await page.getByText("Assistência técnica própria", { exact: true }).count(),
    ).toBeLessThanOrEqual(1);
  });

  /**
   * A tira "Você viu recentemente" só existe para quem já visitou outros dois
   * produtos — e por isso ela escapa de qualquer conferência feita em
   * navegador limpo. Foi assim que ela passou uma revisão inteira usando
   * `container-jb` puro (1440px) no meio de uma ficha que corre a 1600px: um
   * degrau de 80px de cada lado, invisível para quem abre a página pela
   * primeira vez.
   *
   * O teste semeia o histórico à mão e cobra a mesma régua do resto da página.
   */
  test("a tira de histórico respeita a largura do resto da ficha", async ({ page }) => {
    await page.goto("/loja");
    const slugs = await page
      .locator('main a[href^="/loja/"]')
      .evaluateAll((links) => [
        ...new Set(
          links
            .map((a) => new URL((a as HTMLAnchorElement).href).pathname.replace("/loja/", ""))
            .filter((s) => s && !s.includes("/")),
        ),
      ]);
    test.skip(slugs.length < 3, "o catálogo precisa de três produtos para formar histórico");

    const [primeiro, segundo, atual] = slugs;
    await page.addInitScript(
      ([a, b]) => window.localStorage.setItem("jb:vistos", JSON.stringify([a, b])),
      [primeiro, segundo],
    );

    await page.goto(`/loja/${atual}`);
    await expect(page.getByRole("heading", { name: "Você viu recentemente" })).toBeVisible();

    const larguras = await page
      .locator("main .container-jb")
      .evaluateAll((itens) => [
        ...new Set(itens.map((c) => Math.round(c.getBoundingClientRect().width))),
      ]);
    expect(larguras).toHaveLength(1);

    const tamanhosDeH2 = await page
      .locator("main h2")
      .evaluateAll((itens) => [...new Set(itens.map((h) => getComputedStyle(h).fontSize))]);
    expect(tamanhosDeH2).toHaveLength(1);
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

    await duvidas.getByText("Ainda ficou alguma dúvida?", { exact: true }).click();
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
