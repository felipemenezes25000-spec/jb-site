import { expect, test } from "@playwright/test";

const PRETO_JB = "rgb(26, 28, 30)";

test.describe("Legibilidade e alinhamento da loja pública", () => {
  test("textos secundários usam preto nas principais jornadas", async ({ page }) => {
    for (const caminho of [
      "/",
      "/loja",
      "/categoria/cirurgia",
      "/busca?q=autoclave",
      "/marcas",
      "/seminovos",
      "/loja/motor-de-implante-35ncm",
      "/assistencia-tecnica",
    ]) {
      await page.goto(caminho);

      const casca = page.locator('[data-jb-publico="true"]');
      await expect(casca, `casca pública ausente em ${caminho}`).toHaveCount(1);

      const cores = await casca.evaluate((raiz) => {
        const seletores = [
          ".text-graf-500",
          ".text-graf-600",
          ".text-graf-700",
          '[class*="text-graf-950/"]',
        ].join(",");

        return Array.from(raiz.querySelectorAll<HTMLElement>(seletores))
          .filter(
            (elemento) =>
              elemento.textContent?.trim() &&
              !elemento.classList.contains("line-through") &&
              elemento.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
                contentVisibilityAuto: true,
              }),
          )
          .map((elemento) => getComputedStyle(elemento).color);
      });

      expect(cores.length, `sem amostra de texto em ${caminho}`).toBeGreaterThan(0);
      expect(new Set(cores), `texto cinza encontrado em ${caminho}`).toEqual(
        new Set([PRETO_JB]),
      );
    }
  });

  test("texto e botão do menu desktop não dividem a mesma área de clique", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/loja");

    const link = page.getByRole("navigation", { name: "Principal" }).getByRole("link", {
      name: "Equipamentos",
      exact: true,
    });
    const botao = page.getByRole("button", { name: "Abrir o menu de Equipamentos" });
    const [caixaLink, caixaBotao] = await Promise.all([link.boundingBox(), botao.boundingBox()]);

    expect(caixaLink).not.toBeNull();
    expect(caixaBotao).not.toBeNull();
    expect(caixaBotao!.x).toBeGreaterThanOrEqual(caixaLink!.x + caixaLink!.width);
  });

  test("ordenação continua legível na largura mínima suportada", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/categoria/cirurgia");

    const filtros = page.getByRole("button", { name: "Todos os filtros" });
    const ordem = page.getByRole("combobox", { name: "Ordenar resultados" });
    const [caixaFiltros, caixaOrdem] = await Promise.all([
      filtros.boundingBox(),
      ordem.boundingBox(),
    ]);

    expect(caixaFiltros).not.toBeNull();
    expect(caixaOrdem).not.toBeNull();
    expect(caixaFiltros!.width).toBeLessThanOrEqual(112);
    expect(caixaOrdem!.width).toBeGreaterThanOrEqual(160);
  });
});
