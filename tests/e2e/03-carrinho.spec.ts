import { expect, test } from "@playwright/test";

import { adicionarAoCarrinho, emCentavos } from "./apoio";
import { fixtures } from "./fixtures";

/**
 * Do produto ao carrinho.
 *
 * A conta é o objeto do teste: subtotal e total precisam bater com preço
 * unitário × quantidade, em centavos. Comparar textos formatados esconderia
 * erro de arredondamento — por isso tudo é convertido para inteiro antes.
 */

/** Lê o valor de uma linha do resumo do carrinho (Subtotal, Total…). */
async function valorDoResumo(
  page: import("@playwright/test").Page,
  rotulo: string,
): Promise<number> {
  const linha = page.getByRole("main").getByText(rotulo, { exact: true }).first();
  const container = linha.locator("xpath=..");
  const texto = await container.innerText();
  const achado = texto.match(/R\$\s*[\d.]+,\d{2}/);
  return emCentavos(achado?.[0]);
}

test.describe("Carrinho", () => {
  test("começa vazio e com saída para o catálogo", async ({ page }) => {
    await page.goto("/carrinho");

    await expect(page.getByRole("heading", { name: "Carrinho", level: 1 })).toBeVisible();
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Ver equipamentos" })).toBeVisible();
  });

  test("adicionar um item mostra nome, preço e total corretos", async ({ page }) => {
    const { produto } = fixtures();
    const { precoUnitarioCents } = await adicionarAoCarrinho(page, { quantidade: 1 });

    await page.goto("/carrinho");

    await expect(page.getByRole("link", { name: produto.nome })).toBeVisible();

    const subtotal = await valorDoResumo(page, "Subtotal");
    const total = await valorDoResumo(page, "Total");

    expect(subtotal).toBe(precoUnitarioCents);
    expect(total).toBe(precoUnitarioCents);
  });

  test("o contador do cabeçalho acompanha o carrinho", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 2 });
    await page.goto("/carrinho");

    await expect(
      page.getByRole("banner").getByRole("link", { name: /Carrinho com 2 itens/ }),
    ).toBeVisible();
  });

  test("duas unidades cobram o dobro, e aumentar a quantidade recalcula", async ({ page }) => {
    const { precoUnitarioCents } = await adicionarAoCarrinho(page, { quantidade: 2 });

    await page.goto("/carrinho");
    expect(await valorDoResumo(page, "Subtotal")).toBe(precoUnitarioCents * 2);
    expect(await valorDoResumo(page, "Total")).toBe(precoUnitarioCents * 2);

    const { produto } = fixtures();
    await page.getByRole("button", { name: `Aumentar a quantidade de ${produto.nome}` }).click();

    await expect
      .poll(async () => valorDoResumo(page, "Total"), {
        message: "o total precisa refletir a terceira unidade",
      })
      .toBe(precoUnitarioCents * 3);
  });

  test("remover o item devolve o carrinho ao estado vazio", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/carrinho");

    await page.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("o carrinho vazio não deixa entrar no checkout", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForURL(/\/carrinho$/);
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });
});
