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

    // Escopa as provas ao bloco visível do hero. O cabeçalho desktop tem um
    // link homônimo ("Todas as marcas") que fica oculto no mobile, então
    // `getByText(...).first()` selecionava corretamente o texto errado.
    const provas = page.locator(".jb-hero-provas");
    await expect(provas.getByText("Todas as marcas", { exact: true })).toBeVisible();
    await expect(provas.getByText("Orçamento antes da troca", { exact: true })).toBeVisible();

    const jeferson = page.locator('a[data-whatsapp="abertura"]');
    const jackson = page.locator('a[data-whatsapp="abertura-segundo"]');
    await expect(jeferson).toBeVisible();
    await expect(jackson).toBeVisible();
    await expect(jeferson).toContainText("Jeferson");
    await expect(jackson).toContainText("Jackson");
    await expect(jeferson).toHaveAttribute("href", /5511963417994/);
    await expect(jackson).toHaveAttribute("href", /5511986038421/);

    const largura = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(largura.documento).toBeLessThanOrEqual(largura.viewport + 2);
    expect(erros).toEqual([]);
  });

  test("home e landing publicam canonical e Open Graph próprios", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);

    await page.goto("/autoclave");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/autoclave$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/autoclave\/opengraph-image/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /autoclave/i);
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

      // O cabeçalho é atalho; a conversão real da landing precisa existir na
      // própria abertura para o clique pago não depender de voltar ao topo nem
      // de uma barra fixa. Jeferson e Jackson continuam disponíveis nos dois.
      await expect(page.locator('a[data-whatsapp="abertura"]')).toBeVisible();
      await expect(page.locator('a[data-whatsapp="abertura-segundo"]')).toBeVisible();
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

  test("320px mantém os dois atendentes na mesma linha sem colisão", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-compact", "extremo específico de 320px");
    await page.goto("/");

    const principal = page.locator('a[data-whatsapp="abertura"]');
    const segundo = page.locator('a[data-whatsapp="abertura-segundo"]');
    const [a, b] = await Promise.all([principal.boundingBox(), segundo.boundingBox()]);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(4);
    expect((a?.x ?? 0) + (a?.width ?? 0)).toBeLessThanOrEqual((b?.x ?? 0) + 2);

    const largura = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(largura.documento).toBeLessThanOrEqual(largura.viewport + 2);
  });

  test("1920px usa composição ampla sem transformar o hero em coluna única", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-wide", "extremo específico de 1920px");
    await page.goto("/");

    const copy = page.locator(".jb-hero-copy");
    const diagnostico = page.locator(".jb-diagnostico-stage");
    const [a, b] = await Promise.all([copy.boundingBox(), diagnostico.boundingBox()]);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(b?.x ?? 0).toBeGreaterThan((a?.x ?? 0) + (a?.width ?? 0) * 0.72);
    expect((b?.width ?? 0)).toBeGreaterThan(480);

    const largura = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(largura.documento).toBeLessThanOrEqual(largura.viewport + 2);
  });

  test("mobile preserva a triagem completa quando a abertura sai da tela", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");
    await page.goto("/");

    await page.getByRole("button", { name: "Autoclave", exact: true }).click();
    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Osasco");

    await page.locator("#equipamentos").scrollIntoViewIfNeeded();

    const barra = page.locator(".jb-barra-movel-premium");
    await expect(barra).toHaveAttribute("data-visivel", "true");
    await expect(barra.getByText(/Autoclave: falar com a equipe/i)).toBeVisible();

    const principal = barra.locator('a[data-whatsapp="barra-movel"]');
    const segundo = barra.locator('a[data-whatsapp="barra-movel-segundo"]');
    await expect(principal).toBeVisible();
    await expect(segundo).toBeVisible();
    await expect(principal).toHaveAttribute("data-equipamento", "autoclave");

    const href = decodeURIComponent((await principal.getAttribute("href")) ?? "");
    expect(href).toContain("Autoclave");
    expect(href).toContain("Não pressuriza");
    expect(href).toContain("parado e não consigo atender");
    expect(href).toContain("Osasco");
  });

  test("páginas legais não recebem a barra fixa de conversão", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");

    await page.goto("/privacidade");
    await expect(page.locator(".jb-barra-movel")).toHaveCount(0);

    await page.goto("/termos");
    await expect(page.locator(".jb-barra-movel")).toHaveCount(0);
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
