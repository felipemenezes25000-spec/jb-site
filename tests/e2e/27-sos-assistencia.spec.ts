import { expect, test } from "@playwright/test";

test.describe("SOS Equipamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("entra pela vitrine e chega à triagem já marcado como equipamento parado", async ({
    page,
  }) => {
    await page.goto("/");

    const atalho = page.getByRole("link", {
      name: "SOS Equipamento: abrir atendimento para equipamento odontológico parado",
    });
    await expect(atalho).toBeVisible();
    await atalho.click();

    await expect(page).toHaveURL(/\/sos-equipamento$/);
    await expect(
      page.getByRole("heading", { name: /O equipamento parou\? Comece por aqui\./i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Meu equipamento parou/i }).click();
    await expect(page).toHaveURL(/\/assistencia-tecnica\/solicitar$/);
    await expect(
      page.getByRole("heading", { name: "Qual equipamento precisa de atendimento?" }),
    ).toBeVisible();

    const rascunho = await page.evaluate(() => {
      const bruto = sessionStorage.getItem("jb:chamado:rascunho");
      return bruto ? (JSON.parse(bruto) as { aindaOpera?: string; urgencia?: string }) : {};
    });
    expect(rascunho.aindaOpera).toBe("nao");
    expect(rascunho.urgencia).toBe("parado");

    /* Papel e nome exatos. A home foi aberta antes, e o Next guarda a rota
       anterior oculta no DOM: `getByLabel("Marca")` casava por trecho com a
       seção "Marcas no catálogo" da home e o modo estrito reprovava. */
    await page.getByRole("textbox", { name: "Marca", exact: true }).fill("Equipamento SOS de teste");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "O que está acontecendo?" })).toBeVisible();
    await expect(page.getByText("Urgência: equipamento parado")).toBeVisible();
  });

  test("não disputa atenção dentro das próprias telas de assistência", async ({ page }) => {
    await page.goto("/assistencia-tecnica");

    await expect(
      page.getByRole("link", {
        name: "SOS Equipamento: abrir atendimento para equipamento odontológico parado",
      }),
    ).toHaveCount(0);

    await page.goto("/assistencia-tecnica/solicitar");
    await expect(
      page.getByRole("link", {
        name: "SOS Equipamento: abrir atendimento para equipamento odontológico parado",
      }),
    ).toHaveCount(0);
  });
});

test.describe("Continuidade da assistência", () => {
  test("leva a família escolhida na landing para o formulário sem redigitação", async ({ page }) => {
    await page.goto("/assistencia-tecnica");

    const cartao = page.locator("[data-assistencia-categoria]").first();
    await expect(cartao).toBeVisible();
    const nome = (await cartao.locator("p").first().innerText()).trim();
    expect(nome.length).toBeGreaterThan(0);

    await cartao.click();
    await expect(page).toHaveURL(/\/assistencia-tecnica\/solicitar$/);

    const tipo = page.getByLabel("Tipo de equipamento");
    await expect(tipo).toBeVisible();
    await expect(tipo.locator("option:checked")).toHaveText(nome);
  });
});
