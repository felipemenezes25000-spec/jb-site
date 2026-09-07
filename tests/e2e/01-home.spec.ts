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

  test("o menu principal leva ao catálogo", async ({ page }) => {
    await page.goto("/");

    const navegacao = page.getByRole("navigation", { name: "Principal" });
    await expect(navegacao).toBeVisible();

    await navegacao.getByRole("link", { name: /Equipamentos/ }).first().click();
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
