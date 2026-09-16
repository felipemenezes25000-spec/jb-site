import { expect, test } from "@playwright/test";

import { vigiarConsole } from "./apoio";

/**
 * A home é a porta da loja. Se ela carregar torta, nada mais importa — daí o
 * teste olhar as três coisas que sustentam qualquer página: os marcos de
 * navegação, o conteúdo principal e o console limpo.
 */

test.describe("Home", () => {
  test("carrega com cabeçalho, conteúdo e rodapé, sem erro de console", async ({ page }) => {
    const vigia = vigiarConsole(page);

    const resposta = await page.goto("/");
    expect(resposta?.status(), "a home precisa responder 200").toBe(200);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    await expect(
      page.getByRole("link", { name: "JB Soluções Odontológicas — início" }),
    ).toBeVisible();

    // deixa a hidratação acontecer antes de julgar o console
    await page.waitForLoadState("networkidle");

    expect(vigia.erros, `erros de console:\n${vigia.erros.join("\n")}`).toEqual([]);
    expect(vigia.falhas, `respostas 5xx:\n${vigia.falhas.join("\n")}`).toEqual([]);
  });

  /**
   * O menu do cabeçalho tem duas formas, e a largura decide qual.
   *
   * A barra horizontal com os cinco destinos só aparece a partir de 1536px:
   * abaixo disso ela espremeria o campo de busca a menos de 100px, e a busca
   * é o controle mais usado do cabeçalho. Nesta suíte a janela tem 1440px,
   * então o caminho REAL de quem está aqui é a gaveta — e é ele que o teste
   * percorre, em vez de exigir uma barra que aquela largura não mostra.
   *
   * "Equipamentos" tem mega menu, então na gaveta é um botão que abre a
   * seção; o link do catálogo inteiro está dentro dela.
   */
  test("o menu do cabeçalho leva ao catálogo", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Abrir o menu" }).click();

    const gaveta = page.getByRole("dialog", { name: "Menu de navegação" });
    await expect(gaveta).toBeVisible();

    await gaveta.getByRole("button", { name: /Equipamentos/ }).first().click();
    await gaveta.getByRole("link", { name: "Ver todos os equipamentos" }).click();

    await page.waitForURL(/\/(loja|novos|seminovos|usados|recondicionados)/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("o rodapé traz os caminhos institucionais", async ({ page }) => {
    await page.goto("/");
    const rodape = page.getByRole("contentinfo");

    await expect(rodape.getByRole("link", { name: /Assistência técnica/ }).first()).toBeVisible();
    await expect(rodape.getByRole("link", { name: /Contato/ }).first()).toBeVisible();
  });

  test("a busca do cabeçalho sugere e leva ao resultado", async ({ page }) => {
    await page.goto("/");

    /* `combobox`, e não `searchbox`: o campo passou a abrir uma lista de
       sugestões enquanto se digita, e o padrão ARIA disso é o combobox
       com `listbox`. O papel faz parte do contrato — é o que diz ao
       leitor de tela que existem opções a percorrer com as setas. */
    const busca = page.getByRole("combobox", { name: "Buscar no catálogo" }).first();
    await busca.fill("autoclave");

    // o painel abre a partir de três letras, com resultado ou sem ele
    await expect(page.getByRole("listbox", { name: "Sugestões da busca" })).toBeVisible();

    await busca.press("Enter");

    await page.waitForURL(/\/busca\?/);
    expect(new URL(page.url()).searchParams.get("q")).toBe("autoclave");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
