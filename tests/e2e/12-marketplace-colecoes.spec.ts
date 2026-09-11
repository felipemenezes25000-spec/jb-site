import { expect, test, type Page } from "@playwright/test";

import { fixtures } from "./fixtures";

/**
 * Filtros: lateral no desktop, gaveta no celular.
 *
 * Estes testes abriam "Todos os filtros" — um botão que não existe em `src` e
 * não existia nem no HEAD. Além disso o catálogo passou a mostrar os filtros
 * numa coluna à esquerda a partir de 1024px, e a gaveta ficou só para o
 * celular. `abrirFiltros` devolve o container certo para a largura corrente.
 */
async function abrirFiltros(page: Page) {
  const botao = page.getByRole("button", { name: "Abrir filtros" });
  if (await botao.isVisible().catch(() => false)) {
    await botao.click();
    return page.getByRole("dialog", { name: "Filtros do catálogo" });
  }
  return page.locator("[data-painel-filtros]");
}


test.describe("Marketplace — coleções", () => {
  /**
   * A grade acompanha o espaço que sobra, não a largura da janela.
   *
   * Este teste cobrava quatro colunas no desktop, e isso valia enquanto a
   * grade ocupava a linha inteira. Com a coluna de filtros à esquerda — que é
   * o que todo marketplace usa e o que o catálogo passou a ter —, o número de
   * colunas depende do que sobra depois dela, e `auto-fill` decide.
   *
   * O que importa não é o número: é que a peça nunca encolha quando a janela
   * cresce. A regra antiga produzia exatamente isso — 3 colunas de 305px a
   * 1366 viravam 4 de 243px a 1440.
   */
  test("a grade acompanha o espaço disponível, sem encolher quando a janela cresce", async ({
    page,
  }) => {
    await page.goto("/loja");
    const grade = page.locator("[data-grade-marketplace]").first();
    await expect(grade).toBeVisible();

    const medir = async () =>
      grade.evaluate((elemento) => {
        const colunas = getComputedStyle(elemento)
          .gridTemplateColumns.split(" ")
          .filter(Boolean);
        return { colunas: colunas.length, largura: Math.round(parseFloat(colunas[0]) || 0) };
      });

    const larguras = [1280, 1366, 1440, 1600, 1920];
    const medidas: { janela: number; colunas: number; largura: number }[] = [];
    for (const janela of larguras) {
      await page.setViewportSize({ width: janela, height: 900 });
      await page.waitForTimeout(150);
      medidas.push({ janela, ...(await medir()) });
    }

    for (const m of medidas) {
      expect(m.colunas, `colunas a ${m.janela}px`).toBeGreaterThanOrEqual(2);
      expect(m.largura, `largura do cartão a ${m.janela}px`).toBeGreaterThanOrEqual(260);
    }

    // dentro da mesma contagem de colunas, janela maior nunca dá cartão menor
    for (let i = 1; i < medidas.length; i++) {
      const antes = medidas[i - 1];
      const agora = medidas[i];
      if (agora.colunas !== antes.colunas) continue;
      expect(
        agora.largura,
        `cartão encolheu de ${antes.janela}px (${antes.largura}) para ${agora.janela}px (${agora.largura})`,
      ).toBeGreaterThanOrEqual(antes.largura);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    expect((await medir()).colunas, "duas colunas no celular").toBe(2);
  });

  test("mantém os componentes do marketplace fora da home", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-marketplace-shell]")).toHaveCount(0);
    await expect(page.locator("[data-grade-marketplace]")).toHaveCount(0);
  });

  test("abre filtros, grava a escolha na URL e mostra o resumo aplicado", async ({ page }) => {
    await page.goto("/loja");
    const dialogo = await abrirFiltros(page);
    await expect(dialogo.first()).toBeVisible();
    const opcao = dialogo
      .getByRole("link", { name: /^Filtrar por Categoria: / })
      .first();
    const rotulo = (await opcao.getAttribute("aria-label"))!.replace(
      "Filtrar por Categoria: ",
      "",
    );
    await opcao.click();

    await page.waitForURL(/categoria=/);
    await expect(
      page.getByRole("link", { name: `Remover filtro Categoria: ${rotulo}` }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Limpar tudo" }).first()).toBeVisible();
  });

  /* Só no celular: no desktop os filtros estão na coluna da esquerda, sempre
     à vista, e não há gaveta nem botão para devolver foco. */
  test("no celular, a gaveta devolve o foco ao botão ao fechar com Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/loja");
    const abrir = page.getByRole("button", { name: "Abrir filtros" });
    await abrir.click();
    await expect(page.getByRole("dialog", { name: "Filtros do catálogo" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(abrir).toBeFocused();
  });

  test("coloca o primeiro produto na primeira tela e não simula orçamento como card", async ({ page }) => {
    await page.goto("/loja");
    const primeiro = page.locator("[data-marketplace-card]").first();
    await expect(primeiro).toBeVisible();
    expect((await primeiro.boundingBox())!.y).toBeLessThan(900);
    await expect(
      page.locator("[data-marketplace-card] [data-convite-orcamento]"),
    ).toHaveCount(0);
  });

  test("usa o mesmo cabeçalho compacto na loja e nas categorias", async ({ page }) => {
    await page.goto("/loja");
    await expect(page.locator("[data-cabecalho-colecao]")).toBeVisible();

    const categoria = page
      .getByRole("navigation", { name: /Categorias/ })
      .getByRole("link")
      .first();
    await categoria.click();
    await page.waitForURL(/\/categoria\//);
    await expect(page.locator("[data-marketplace-shell]:visible")).toBeVisible();
    await expect(page.locator("[data-cabecalho-colecao]:visible")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
  });

  test("a busca usa o card do marketplace e permite refinar no catálogo", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/busca?q=${encodeURIComponent(produto.nome)}`);
    await expect(page.locator("[data-marketplace-card]").first()).toBeVisible();
    // hoje o convite se chama "Ver no catálogo com filtros"
    await expect(page.getByRole("link", { name: /Ver no catálogo com filtros/ })).toBeVisible();
  });

  test("as condições públicas compartilham o shell", async ({ page }) => {
    for (const rota of [
      "/novos",
      "/seminovos",
      "/usados",
      "/recondicionados",
      "/pecas-e-acessorios",
    ]) {
      await page.goto(rota);
      await expect(page.locator("[data-marketplace-shell]:visible"), rota).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ visible: true }),
        rota,
      ).toBeVisible();
    }
  });

  test("coleção e filtros funcionam por teclado sem overflow horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/loja");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );

    const abrir = page.getByRole("button", { name: "Abrir filtros" });
    await abrir.focus();
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog", { name: "Filtros do catálogo" });
    await expect(dialogo).toBeVisible();

    const alvosPequenos = await dialogo
      .locator("button, a, input, select")
      .evaluateAll((elementos) =>
        elementos
          .filter((elemento) => {
            const caixa = elemento.getBoundingClientRect();
            return (
              caixa.width > 0 &&
              caixa.height > 0 &&
              (caixa.width < 44 || caixa.height < 44)
            );
          })
          .map((elemento) =>
            (
              elemento.textContent ||
              elemento.getAttribute("aria-label") ||
              elemento.tagName
            ).trim(),
          ),
      );
    expect(alvosPequenos).toEqual([]);
  });
});
