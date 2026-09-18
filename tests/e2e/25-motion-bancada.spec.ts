import { expect, test } from "@playwright/test";

const NOME_BANCADA = "O equipamento é aberto antes de ser vendido.";

test.describe("Bancada JB — capítulos do cuidado", () => {
  test("permite percorrer e voltar aos capítulos pelo teclado", async ({ page }) => {
    await page.goto("/");
    const bancada = page.getByRole("region", { name: NOME_BANCADA });
    const rotina = bancada.getByRole("tab", { name: /Rotina/ });
    const inspecao = bancada.getByRole("tab", { name: /Bancada/ });
    const historico = bancada.getByRole("tab", { name: /Histórico/ });

    await expect(rotina).toHaveAttribute("aria-selected", "true");
    await expect(bancada.getByRole("tabpanel")).toHaveCount(1);
    await expect(bancada.getByRole("heading", { name: "A clínica descreve a rotina" })).toBeVisible();

    await rotina.focus();
    await rotina.press("ArrowRight");
    await expect(inspecao).toBeFocused();
    await expect(inspecao).toHaveAttribute("aria-selected", "true");
    await expect(bancada.getByRole("heading", { name: "O equipamento passa pela bancada" })).toBeVisible();

    await inspecao.press("End");
    await expect(historico).toBeFocused();
    await expect(bancada.getByRole("heading", { name: "A JB continua depois da entrega" })).toBeVisible();
    await expect(bancada.getByRole("tabpanel")).toContainText("garantia e histórico");

    await historico.press("Home");
    await expect(rotina).toBeFocused();
    await expect(rotina).toHaveAttribute("aria-selected", "true");
    await rotina.press("ArrowLeft");
    await expect(historico).toBeFocused();
    await historico.press("Tab");
    await expect(bancada.getByRole("tabpanel")).toBeFocused();
  });

  test("no celular, mantém os três controles legíveis e alcançáveis", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto("/");
    const bancada = page.getByRole("region", { name: NOME_BANCADA });
    const controles = bancada.getByRole("tab");

    await expect(controles).toHaveCount(3);
    for (const controle of await controles.all()) {
      await expect(controle).toBeVisible();
      const dimensoes = await controle.boundingBox();
      expect(dimensoes?.width).toBeGreaterThanOrEqual(44);
      expect(dimensoes?.height).toBeGreaterThanOrEqual(44);
    }

    await bancada.getByRole("tab", { name: /Histórico/ }).click();
    await expect(bancada.getByRole("heading", { name: "A JB continua depois da entrega" })).toBeVisible();
    await bancada.getByRole("tab", { name: /Bancada/ }).click();
    await expect(bancada.getByRole("tabpanel")).toContainText("laudo daquela unidade");

    const largura = await bancada.evaluate((elemento) => ({
      conteudo: elemento.scrollWidth,
      visivel: elemento.clientWidth,
    }));
    expect(largura.conteudo).toBeLessThanOrEqual(largura.visivel + 1);
  });

  test("com movimento reduzido, troca o conteúdo sem animar foto ou texto", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const bancada = page.getByRole("region", { name: NOME_BANCADA });
    await bancada.getByRole("tab", { name: /Bancada/ }).click();

    const painel = bancada.getByRole("tabpanel");
    await expect(painel).toContainText("Todo seminovo é aberto, testado e fotografado.");
    expect(await painel.evaluate((elemento) => getComputedStyle(elemento).animationName)).toBe("none");
    const foto = bancada.getByRole("img", { name: "Técnico inspeciona um equipamento odontológico na bancada" });
    /* O reset global de movimento reduzido (`globals.css`) põe toda transição
       em 0,01ms, não em 0 — assim `transitionend` continua disparando para quem
       depende dele. O navegador devolve "1e-05s". O que importa é nenhuma
       transição levar tempo perceptível. */
    const duracoes = await foto.evaluate((elemento) =>
      getComputedStyle(elemento).transitionDuration.split(",").map((valor) => Number.parseFloat(valor)),
    );
    expect(Math.max(...duracoes)).toBeLessThanOrEqual(0.00001);
  });
});
