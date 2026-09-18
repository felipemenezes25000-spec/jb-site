import { expect, test, type Page } from "@playwright/test";

import { fixtures } from "./fixtures";

const nomeDaBarra = "Equipamentos selecionados para comparar";

async function selecionarDois(page: Page) {
  const { produto, frete } = fixtures();
  await page.goto(`/loja/${produto.slug}`);
  await page.getByText("Mais opções da compra", { exact: true }).click();
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Na comparação", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto(`/loja/${frete.slug}`);
  await page.getByText("Mais opções da compra", { exact: true }).click();
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: nomeDaBarra }).getByRole("link", { name: "Comparar 2" }),
  ).toBeVisible();
  return { produto, frete };
}

test.describe("Comparador — continuidade da seleção", () => {
  test("preserva seleção ao recarregar e mantém foco utilizável durante remoção", async ({ page }) => {
    const { produto, frete } = await selecionarDois(page);
    await page.reload();
    await page.getByText("Mais opções da compra", { exact: true }).click();
    const barra = page.getByRole("complementary", { name: nomeDaBarra });
    await expect(barra.getByRole("link", { name: "Comparar 2" })).toBeVisible();

    const removerPrimeiro = barra.getByRole("button", { name: `Tirar ${produto.nome} da comparação` });
    const removerSegundo = barra.getByRole("button", { name: `Tirar ${frete.nome} da comparação` });
    await removerPrimeiro.focus();
    await page.keyboard.press("Enter");
    await expect(removerSegundo).toBeFocused();
    await expect(removerPrimeiro).toHaveCount(0);
    await expect(barra.getByRole("link", { name: "Escolha mais um" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await page.keyboard.press("Enter");
    await expect(barra).toHaveCount(0);
    const origem = page.getByRole("button", { name: "Comparar", exact: true });
    await expect(origem).toBeFocused();
    await expect(origem).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(barra).toHaveCount(0);
  });

  test("abre a comparação com os dois equipamentos selecionados", async ({ page }) => {
    const { produto, frete } = await selecionarDois(page);
    await page.getByRole("complementary", { name: nomeDaBarra })
      .getByRole("link", { name: "Comparar 2" }).click();
    await expect(page).toHaveURL((url) =>
      url.pathname === "/comparar"
      && url.searchParams.getAll("p").join(",") === `${produto.slug},${frete.slug}`,
    );
    await expect(page.getByRole("complementary", { name: nomeDaBarra })).toHaveCount(0);
  });
});

test.describe("Comparador — celular com movimento reduzido", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("revela o último item sem animar nem aumentar a largura da página", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { frete } = await selecionarDois(page);
    const barra = page.getByRole("complementary", { name: nomeDaBarra });
    const lista = barra.getByRole("list", { name: "Seleção de equipamentos" });
    const ultimo = barra.getByRole("button", { name: `Tirar ${frete.nome} da comparação` });

    await expect.poll(() => barra.evaluate((elemento) => getComputedStyle(elemento).transform))
      .toBe("none");
    await expect.poll(() => lista.evaluate((elemento) =>
      elemento.getAnimations({ subtree: true }).filter((animacao) => animacao.playState === "running").length,
    )).toBe(0);

    const caixaLista = await lista.boundingBox();
    const caixaUltimo = await ultimo.boundingBox();
    expect(caixaLista).not.toBeNull();
    expect(caixaUltimo).not.toBeNull();
    expect(caixaUltimo!.x + caixaUltimo!.width).toBeLessThanOrEqual(caixaLista!.x + caixaLista!.width + 1);
    expect(caixaUltimo!.width).toBeGreaterThanOrEqual(44);
    expect(caixaUltimo!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await ultimo.click();
    await expect(ultimo).toHaveCount(0);
    await expect(barra.getByRole("link", { name: "Escolha mais um" })).toBeVisible();
  });

  test("revela a seleção mais recente quando um item chega na frente dela", async ({ page }) => {
    /* A seleção [B] vira [A, B]: A entra na frente e empurra B para fora da
       faixa. Acontecia quando o clique chegava antes de o provedor ler o
       localStorage (intermitente, ~1 em 12 rodadas da spec acima) e acontece
       sempre que outra aba grava a comparação. A barra revelava só quando o
       último item mudava — e aqui ele continua sendo B. */
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { produto, frete } = fixtures();
    await page.goto(`/loja/${frete.slug}`);
    await page.evaluate(() => window.localStorage.removeItem("jb:comparar"));
    await page.reload();
    await page.getByText("Mais opções da compra", { exact: true }).click();
    await page.getByRole("button", { name: "Comparar", exact: true }).click();
    const barra = page.getByRole("complementary", { name: nomeDaBarra });
    await expect(barra.getByRole("link", { name: "Escolha mais um" })).toBeVisible();

    // Outra aba grava a seleção com o outro equipamento na frente.
    await page.evaluate(
      (itens) => {
        const valor = JSON.stringify(itens);
        window.localStorage.setItem("jb:comparar", valor);
        window.dispatchEvent(new StorageEvent("storage", { key: "jb:comparar", newValue: valor }));
      },
      [
        { slug: produto.slug, nome: produto.nome },
        { slug: frete.slug, nome: frete.nome },
      ],
    );
    await expect(barra.getByRole("link", { name: "Comparar 2" })).toBeVisible();

    const lista = barra.getByRole("list", { name: "Seleção de equipamentos" });
    const recente = barra.getByRole("button", { name: `Tirar ${frete.nome} da comparação` });
    await expect
      .poll(async () => {
        const [caixaLista, caixaRecente] = await Promise.all([lista.boundingBox(), recente.boundingBox()]);
        return caixaRecente!.x + caixaRecente!.width <= caixaLista!.x + caixaLista!.width + 1;
      })
      .toBe(true);
  });
});
