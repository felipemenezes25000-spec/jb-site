import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

/**
 * Catálogo.
 *
 * O que está sob teste é o contrato "filtro mora na URL": marcar uma condição
 * precisa aparecer na barra de endereço, sobreviver a um recarregamento e
 * voltar ao estado anterior no botão "voltar". Sem isso o resultado deixa de
 * ser compartilhável e o Next perde a renderização no servidor.
 */

test.describe("Catálogo", () => {
  test("lista equipamentos com preço e link para o produto", async ({ page }) => {
    await page.goto("/loja");

    await expect(page.getByRole("heading", { name: "Equipamentos odontológicos" })).toBeVisible();
    await expect(page.getByText(/itens? encontrados?/)).toBeVisible();

    const { produto } = fixtures();
    const link = page.getByRole("link", { name: produto.nome }).first();
    await expect(link).toBeVisible();

    await link.click();
    await page.waitForURL(new RegExp(`/loja/${produto.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: produto.nome })).toBeVisible();
  });

  test("filtrar por condição escreve o filtro na URL e reduz o resultado", async ({ page }) => {
    const { condicoes } = fixtures();
    test.skip(condicoes.length < 2, "o banco precisa de duas condições para o filtro significar algo");

    await page.goto("/loja");

    const contador = page.getByText(/itens? encontrados?/);
    await expect(contador).toBeVisible();
    const totalSemFiltro = Number((await contador.innerText()).match(/\d+/)?.[0] ?? 0);
    expect(totalSemFiltro).toBeGreaterThan(0);

    // pega a primeira condição oferecida pela própria página, em vez de
    // fixar um rótulo que o catálogo pode não ter
    const caixas = page.getByRole("checkbox");
    const escolhida = caixas.nth(0);
    const rotulo = (await escolhida.evaluate((el) => el.closest("label")?.textContent ?? "")).trim();
    expect(rotulo, "o painel de filtros precisa oferecer alguma opção").not.toBe("");

    // `check()` não serve aqui: a caixa é controlada pela URL, então o estado
    // só muda depois que o Next termina a navegação. Clicamos e esperamos a URL.
    await escolhida.click();

    await page.waitForURL(/\?.+=.+/);
    const url = new URL(page.url());
    const chaves = [...url.searchParams.keys()];
    expect(chaves.length, `a URL deveria carregar o filtro: ${url.search}`).toBeGreaterThan(0);

    await expect(escolhida).toBeChecked();

    const totalFiltrado = Number((await contador.innerText()).match(/\d+/)?.[0] ?? 0);
    expect(totalFiltrado).toBeGreaterThan(0);
    expect(totalFiltrado).toBeLessThanOrEqual(totalSemFiltro);
  });

  test("a condição escolhida sobrevive ao recarregamento e ao voltar", async ({ page }) => {
    const { condicoes } = fixtures();
    const condicao = condicoes[0];
    test.skip(!condicao, "nenhuma condição publicada no catálogo");

    await page.goto(`/loja?condicao=${condicao}`);

    const contador = page.getByText(/itens? encontrados?/);
    await expect(contador).toBeVisible();

    // o filtro veio da URL: a caixa correspondente precisa estar marcada
    const marcadas = page.getByRole("checkbox", { checked: true });
    await expect(marcadas).toHaveCount(1);

    // e a etiqueta de filtro ativo precisa oferecer a remoção
    const limpar = page.getByRole("button", { name: "limpar tudo" });
    await expect(limpar).toBeVisible();

    await page.reload();
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);

    await limpar.click();
    await page.waitForURL((url) => !url.searchParams.has("condicao"));
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);

    await page.goBack();
    await page.waitForURL(/condicao=/);
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);
  });

  test("filtro sem resultado mostra o estado vazio com saída útil", async ({ page }) => {
    await page.goto("/loja?preco_min=999999999");

    // o rodapé também oferece "Pedir orçamento"; o que interessa é a saída
    // dentro do conteúdo, ao lado do estado vazio
    const conteudo = page.getByRole("main");
    await expect(conteudo.getByText("Nenhum item com esses filtros")).toBeVisible();
    await expect(conteudo.getByRole("link", { name: "Limpar filtros" })).toBeVisible();
    await expect(conteudo.getByRole("link", { name: "Pedir orçamento" })).toBeVisible();
  });

  test("a ordenação por menor preço também vai para a URL", async ({ page }) => {
    await page.goto("/loja");

    await page.getByLabel("Ordenar por").selectOption("menor-preco");
    await page.waitForURL(/ordem=menor-preco/);

    expect(new URL(page.url()).searchParams.get("ordem")).toBe("menor-preco");
  });
});
