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
   * A direção do catálogo tem fileira própria a partir de 1024px. Antes ela só
   * aparecia em 1700px: em 1440 — a largura desta suíte e a de trabalho mais
   * comum — o site inteiro caía no botão de menu, e o desktop navegava como
   * celular. Com um nível só para ela, a busca deixou de disputar a mesma
   * linha e o caminho real de quem está em 1440 passou a ser o link direto.
   *
   * O caminho do celular continua coberto pelo teste seguinte, que estreita a
   * janela e percorre a gaveta.
   */
  test("o menu do cabeçalho leva ao catálogo", async ({ page }) => {
    await page.goto("/");

    const direcao = page.getByRole("navigation", { name: "Principal" });
    await expect(direcao).toBeVisible();
    await direcao.getByRole("link", { name: "Equipamentos" }).click();

    await page.waitForURL(/\/(loja|novos|seminovos|usados|recondicionados)/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  /**
   * O mesmo destino pela gaveta, na largura em que ela é o caminho real.
   *
   * Cada linha da gaveta é duas coisas: o link do destino e, ao lado, o botão
   * que abre as opções daquela seção. O caminho para o catálogo inteiro é o
   * link — o botão só revela as categorias. A busca é feita dentro da
   * navegação principal da gaveta porque "Equipamentos" também é o nome de um
   * atalho da Área da Clínica, logo acima.
   */
  test("no celular, a gaveta leva ao catálogo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();

    const gaveta = page.getByRole("dialog", { name: "Menu principal" });
    await expect(gaveta).toBeVisible();

    await gaveta
      .getByRole("navigation", { name: "Navegação da home no celular" })
      .getByRole("link", { name: /Equipamentos/ })
      .first()
      .click();

    await page.waitForURL(/\/(loja|novos|seminovos|usados|recondicionados)/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("o rodapé traz os caminhos institucionais", async ({ page }) => {
    await page.goto("/");
    const rodape = page.getByRole("contentinfo");

    await expect(rodape.getByRole("link", { name: /Assistência técnica/ }).first()).toBeVisible();
    await expect(rodape.getByRole("link", { name: /Contato/ }).first()).toBeVisible();
  });

  test("a busca principal leva ao resultado", async ({ page }) => {
    await page.goto("/");

    const busca = page.getByRole("searchbox", { name: "Buscar no catálogo JB" });
    await busca.fill("autoclave");
    await busca.press("Enter");

    await page.waitForURL(/\/busca\?/);
    expect(new URL(page.url()).searchParams.get("q")).toBe("autoclave");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
