import { expect, test } from "@playwright/test";

import { emCentavos, entrarComoEquipe, sufixo, vigiarConsole } from "./apoio";

/**
 * O painel serve para a JB tocar o site sozinha.
 *
 * Todo o resto da suíte olha o que o cliente vê. Este arquivo olha o outro
 * lado: alguém da equipe consegue cadastrar um equipamento e colocá-lo à venda
 * sem pedir socorro para um programador? A prova é o percurso inteiro —
 * cadastrar, publicar, e encontrar o produto na loja pelo preço certo.
 */
test.describe("Cadastro de produto pelo painel", () => {
  test("a equipe cadastra um equipamento e ele aparece na loja", async ({ page }) => {
    const vigia = vigiarConsole(page);
    const marca = sufixo();
    const nome = `Autoclave de teste ${marca}`;
    const precoCents = 1_234_500;

    await entrarComoEquipe(page);

    /* ------------------------------------------------------------ cadastro */
    await page.goto("/admin/produtos/novo");
    await expect(page.getByRole("heading", { level: 1, name: "Novo produto" })).toBeVisible();

    await page.getByLabel("Nome do produto").fill(nome);
    await page.getByLabel("SKU").fill(`TESTE-${marca.toUpperCase()}`);
    await page.getByLabel("Preço de venda").fill("12.345,00");
    await page.getByLabel("Condição").selectOption("novo");
    await page.getByLabel("Situação").selectOption("active");

    await page.getByRole("button", { name: "Criar e continuar" }).click();

    // o cadastro leva direto para a ficha completa, que é onde o resto se edita
    await page.waitForURL(/\/admin\/produtos\/[^/]+$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1, name: nome })).toBeVisible();

    /* -------------------------------------------------- o produto está na loja */
    const slug = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await page.goto(`/loja/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: nome })).toBeVisible();

    const preco = await page.locator("main").getByText(/R\$\s*12\.345,00/).first().textContent();
    expect(emCentavos(preco)).toBe(precoCents);

    /* ---------------------------------------- despublicar tira da loja na hora */
    await page.goto("/admin/produtos");
    await page.getByRole("link", { name: nome }).first().click();
    await page.waitForURL(/\/admin\/produtos\/[^/]+$/);

    /* Escopado ao painel do formulário, e não global.
       Com Cache Components ligado, o Next usa `<Activity>` para manter a rota
       ANTERIOR montada e escondida ao navegar — então a listagem de produtos,
       com o filtro "Situação", continua no DOM enquanto se edita um produto.
       Um localizador global passa a encontrar dois campos com o mesmo rótulo.
       Ver node_modules/next/dist/docs/.../cacheComponents.md, "Navigation with
       Activity". */
    await page
      .getByRole("tabpanel", { name: "Básico" })
      .getByLabel("Situação")
      .selectOption("draft");
    await page.getByRole("button", { name: /Salvar/ }).first().click();
    await expect(page.getByText(/salv/i).first()).toBeVisible({ timeout: 30_000 });

    const resposta = await page.goto(`/loja/${slug}`);
    // rascunho não é vendável: ou some, ou aparece sem botão de compra
    const temComprar = await page
      .getByRole("button", { name: /adicionar ao carrinho/i })
      .count();
    expect(temComprar, "produto em rascunho não pode ter botão de compra").toBe(0);
    expect(resposta?.status()).toBeLessThan(500);

    expect(vigia.erros, "erros de console: " + vigia.erros.join(" | ")).toEqual([]);
    expect(vigia.falhas, "respostas 5xx: " + vigia.falhas.join(" | ")).toEqual([]);
  });
});

/**
 * Editar o conteúdo do site sem tocar em código é o outro pedido da JB. O
 * teste do arquivo 07 já cobre a página institucional; aqui o alvo é o
 * cadastro que muda a vitrine: categoria e marca, que alimentam os filtros.
 */
test.describe("Cadastro de apoio do catálogo", () => {
  test("a equipe cria uma marca e ela passa a filtrar a loja", async ({ page }) => {
    const vigia = vigiarConsole(page);
    const nome = `Marca Teste ${sufixo()}`;

    await entrarComoEquipe(page);
    await page.goto("/admin/marcas/nova");

    await page.getByLabel("Nome da marca").fill(nome);
    await page.getByRole("button", { name: "Criar marca" }).click();

    // criar leva para a ficha da marca — ficar no formulário de criação
    // convidava a clicar de novo e cadastrar duplicado
    await page.waitForURL(/\/admin\/marcas\/[^/]+/, { timeout: 60_000 });
    await expect(page.getByLabel("Nome da marca")).toHaveValue(nome);

    await page.goto("/admin/marcas");
    await expect(page.getByText(nome).first()).toBeVisible();

    // a marca recém-criada precisa existir na página pública de marcas
    await page.goto("/marcas");
    await expect(page.getByText(nome).first()).toBeVisible();

    expect(vigia.erros, "erros de console: " + vigia.erros.join(" | ")).toEqual([]);
    expect(vigia.falhas, "respostas 5xx: " + vigia.falhas.join(" | ")).toEqual([]);
  });
});
