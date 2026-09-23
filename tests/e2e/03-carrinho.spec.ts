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

/**
 * Lê o valor de uma linha do resumo do carrinho (Subtotal, Total…).
 *
 * O rótulo é procurado pelo texto que o próprio elemento escreve — "Subtotal"
 * vem acompanhado da contagem de unidades num `<span>` irmão, então casar o
 * conteúdo inteiro do `<dt>` deixaria de funcionar a cada mudança de copy.
 */
async function valorDoResumo(
  page: import("@playwright/test").Page,
  rotulo: string,
): Promise<number> {
  const linha = page
    .getByRole("main")
    .locator(`xpath=.//*[normalize-space(text())=${JSON.stringify(rotulo)}]`)
    .first();
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
    await expect(page.getByRole("main").getByRole("link", { name: "Ver catálogo" })).toBeVisible();
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

  test("comprar agora segue direto para o checkout", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    await page.getByRole("button", { name: "Comprar agora" }).click();
    await page.waitForURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Finalizar compra", level: 1 })).toBeVisible();
    await expect(page.getByText(produto.nome).first()).toBeVisible();
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

    /* Escopado em `#conteudo` porque aqui se chega por REDIRECIONAMENTO.
       `redirect()` num Server Component não vem como 3xx: o servidor responde a
       rota pedida e manda o cliente navegar. Durante essa troca o React mantém
       no documento a cópia escondida do fluxo anterior, e a mesma frase casa
       duas vezes — uma no conteúdo e uma no `<div hidden>`. Modo estrito trata
       isso como erro e para de tentar, então a espera nem chega a acontecer.
       Não é defeito da página: é a busca perguntando ao documento inteiro em
       vez de perguntar ao conteúdo. */
    await expect(
      page.locator("#conteudo").getByText("Seu carrinho está vazio"),
    ).toBeVisible();
  });
});
