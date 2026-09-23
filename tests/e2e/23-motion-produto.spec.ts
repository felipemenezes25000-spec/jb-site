import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// O globalSetup recusa banco remoto. Os dois cadastros são exclusivos deste
// teste e removidos ao final; não dependemos das medidas do catálogo de demo.
const slug = "e2e-exploracao-visual";
const minimo = "e2e-exploracao-sem-dados";
let prisma: PrismaClient;

test.beforeAll(async () => {
  prisma = new PrismaClient();
  await prisma.product.deleteMany({ where: { slug: { in: [slug, minimo] } } });
  const base = { status: "active" as const, condition: "novo" as const, publishedAt: new Date(), priceCents: 123400, trackInventory: false, allowDirectPurchase: true };
  await prisma.product.create({ data: { ...base, slug, sku: "E2E-EXPLORACAO", name: "Equipamento de exploração visual", widthMm: 455, heightMm: 880, depthMm: 520, voltage: "220", infrastructureNotes: ["Tomada exclusiva de 20 A", "20 cm livres atrás"] } });
  await prisma.product.create({ data: { ...base, slug: minimo, sku: "E2E-EXPLORACAO-MINIMO", name: "Produto sem medidas cadastradas", isEquipment: false } });
});

test.afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { in: [slug, minimo] } } });
  await prisma.$disconnect();
});

test("medidas e instalação usam o cadastro e preservam compra e ficha", async ({ page }) => {
  await page.goto(`/loja/${slug}`);
  const explorar = page.getByRole("group", { name: "Explorar equipamento" });
  await expect(explorar.getByRole("button", { name: "Fotos", exact: true })).toHaveAttribute("aria-pressed", "true");
  await explorar.getByRole("button", { name: "Medidas", exact: true }).focus();
  await page.keyboard.press("Enter");
  const medidas = page.locator("[data-exploracao-medidas]");
  await expect(medidas).toBeVisible();
  await expect(medidas.locator("dd")).toHaveText(["45,5 cm", "88 cm", "52 cm"]);
  await expect(medidas).toContainText("Esquema sem escala");
  await expect(page.getByRole("button", { name: "Comprar agora", exact: true })).toBeVisible();

  await explorar.getByRole("button", { name: "Instalação", exact: true }).click();
  const instalacao = page.locator("[data-exploracao-instalacao]");
  await expect(instalacao).toContainText(/220\s*V/);
  await expect(instalacao.getByRole("button", { name: "Requisito anterior" })).toBeDisabled();
  await instalacao.getByRole("button", { name: "Próximo requisito" }).click();
  await expect(instalacao).toContainText("Tomada exclusiva de 20 A");
  await instalacao.getByRole("button", { name: "Próximo requisito" }).click();
  await expect(instalacao).toContainText("20 cm livres atrás");
  await expect(instalacao.getByRole("button", { name: "Próximo requisito" })).toBeDisabled();
  await instalacao.getByRole("button", { name: "Requisito anterior" }).click();
  await expect(instalacao).toContainText("Tomada exclusiva de 20 A");
  await instalacao.getByRole("link", { name: "Conferir requisitos na ficha" }).click();
  await expect(page.locator("#ficha-tecnica")).toBeInViewport();
  await expect(page.locator("#ficha-tecnica")).toContainText("45,5 × 88 × 52 cm");
  await explorar.getByRole("button", { name: "Fotos", exact: true }).click();
  await expect(medidas).toHaveCount(0);
  await expect(instalacao).toHaveCount(0);
});

test("celular com movimento reduzido mantém painéis legíveis e sem animação", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/loja/${slug}`);
  const explorar = page.getByRole("group", { name: "Explorar equipamento" });
  for (const modo of ["Medidas", "Instalação"]) {
    await explorar.getByRole("button", { name: modo, exact: true }).click();
    const ativo = page.locator("[data-exploracao-medidas], [data-exploracao-instalacao]");
    await expect(ativo).toBeVisible();
    const transbordou = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(transbordou).toBe(false);
    const animacoes = await ativo.evaluate((el) => el.getAnimations({ subtree: true }).length);
    expect(animacoes).toBe(0);
  }
});

test("produto sem dados não oferece visualização técnica vazia", async ({ page }) => {
  await page.goto(`/loja/${minimo}`);
  await expect(page.getByRole("heading", { name: "Produto sem medidas cadastradas", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Explorar equipamento" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Comprar agora", exact: true })).toBeVisible();
});
