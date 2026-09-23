import { expect, test } from "@playwright/test";

const LANDINGS = [
  ["/autoclave", "Autoclave"],
  ["/compressor", "Compressor"],
  ["/cadeira-odontologica", "Cadeira"],
  ["/bomba-de-vacuo", "Bomba de vácuo"],
  ["/seladora", "Seladora"],
  ["/destilador", "Destilador"],
  ["/lavadora-ultrassonica", "Lavadora"],
] as const;

const REMOVIDAS = ["/loja", "/carrinho", "/checkout", "/seminovos", "/comparar"] as const;

function errosDeConsole(page: import("@playwright/test").Page) {
  const erros: string[] = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  page.on("pageerror", (erro) => erros.push(erro.message));
  return erros;
}

test.describe("JB assistência — jornada pública atual", () => {
  test("home comunica o problema, a confiança e os dois atendentes", async ({ page }) => {
    const erros = errosDeConsole(page);
    const resposta = await page.goto("/");

    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("parou?");
    await expect(page.getByText("Todas as marcas", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Orçamento antes da troca", { exact: true }).first()).toBeVisible();

    const jeferson = page.locator('a[data-whatsapp="abertura"]');
    const jackson = page.locator('a[data-whatsapp="abertura-segundo"]');
    await expect(jeferson).toBeVisible();
    await expect(jackson).toBeVisible();
    await expect(jeferson).toContainText("Jeferson");
    await expect(jackson).toContainText("Jackson");
    await expect(jeferson).toHaveAttribute("href", /5511963417994/);
    await expect(jackson).toHaveAttribute("href", /5511986038421/);

    expect(erros).toEqual([]);
  });

  test("diagnóstico fecha os 3 toques e leva contexto para o WhatsApp", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Autoclave", exact: true }).click();
    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();

    const principal = page.locator('a[data-whatsapp="diagnostico"]');
    const segundo = page.locator('a[data-whatsapp="diagnostico-segundo"]');
    await expect(principal).toBeVisible();
    await expect(segundo).toBeVisible();

    const href = await principal.getAttribute("href");
    expect(decodeURIComponent(href ?? "")).toContain("Autoclave");
    expect(decodeURIComponent(href ?? "")).toContain("Não pressuriza");
    expect(decodeURIComponent(href ?? "")).toContain("parado e não consigo atender");
  });

  for (const [rota, equipamento] of LANDINGS) {
    test(`${rota} é uma landing de assistência funcional`, async ({ page }) => {
      const erros = errosDeConsole(page);
      const resposta = await page.goto(rota);

      expect(resposta?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(equipamento);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/parou\?/i);
      await expect(page.locator('a[data-whatsapp="cabecalho"]')).toBeVisible();
      await expect(page.locator('a[data-whatsapp="cabecalho-segundo"]')).toBeVisible();

      const largura = await page.evaluate(() => ({
        documento: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(largura.documento).toBeLessThanOrEqual(largura.viewport + 2);
      expect(erros).toEqual([]);
    });
  }

  test("mobile mantém conversão disponível depois que a abertura sai da tela", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "comportamento específico de tela pequena");
    await page.goto("/");
    await page.locator("#equipamentos").scrollIntoViewIfNeeded();

    const barra = page.locator(".jb-barra-movel-premium");
    await expect(barra).toHaveAttribute("data-visivel", "true");
    await expect(barra.locator('a[data-whatsapp="barra-movel"]')).toBeVisible();
    await expect(barra.locator('a[data-whatsapp="barra-movel-segundo"]')).toBeVisible();
  });

  for (const rota of REMOVIDAS) {
    test(`${rota} informa remoção definitiva com HTTP 410`, async ({ page }) => {
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(410);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("saiu do ar");
    });
  }

  test("admin sem sessão nunca expõe a área privada", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar/);
  });
});
