import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * Casos extremos da PDP.
 *
 * O globalSetup já recusa banco remoto antes de qualquer teste da suíte. Este
 * arquivo usa o mesmo Postgres descartável para criar um produto deliberadamente
 * mínimo, visita a ficha e apaga o registro no `finally`. Assim a regressão é
 * exercitada pelo Next + Prisma + navegador reais sem deixar produto de teste
 * no catálogo e sem transformar o fixture principal num catálogo artificial.
 */
test.describe("PDP — casos extremos", () => {
  test("produto mínimo não fabrica accordions nem âncoras sem conteúdo", async ({ page }) => {
    const prisma = new PrismaClient();
    const slug = "e2e-pdp-produto-minimo";
    const sku = "E2E-PDP-MINIMO";

    try {
      // Limpa rastro de uma execução interrompida antes do `finally`.
      await prisma.product.deleteMany({
        where: { OR: [{ slug }, { sku }] },
      });

      const produto = await prisma.product.create({
        data: {
          slug,
          sku,
          name: "Produto mínimo da PDP",
          shortDescription: "",
          description: "",
          status: "active",
          condition: "novo",
          publishedAt: new Date(),
          priceCents: 123_400,
          allowDirectPurchase: true,
          allowQuoteRequest: true,
          // Sem controle de estoque para o pós-compra não ser usado como proxy
          // de equipamento neste caso. O objetivo aqui é ter zero dado técnico.
          trackInventory: false,
          // `isEquipment` nasce `true` no banco, porque o catálogo real da JB é
          // quase todo equipamento. Aqui ele precisa ser desligado à mão: o
          // produto mínimo é justamente o que não gera prontuário, e sem esta
          // linha a seção "Preparo" aparece sozinha — era o que a regra antiga
          // (`condition !== "novo" || trackInventory`) dava de graça.
          isEquipment: false,
          unique: false,
          stock: 0,
          installationPolicy: "nao_informada",
          infrastructureNotes: [],
          boxContents: [],
        },
      });

      await page.goto(`/loja/${produto.slug}`);
      await expect(page.getByRole("heading", { name: produto.name, level: 1 })).toBeVisible();

      // Não há descrição, specs, medidas, peso, regulatório nem documento.
      await expect(page.locator("#sobre")).toHaveCount(0);
      await expect(page.locator("#ficha-tecnica")).toHaveCount(0);

      // Não há infraestrutura, conteúdo da caixa, instalação nem pós-compra.
      await expect(page.locator("#preparo")).toHaveCount(0);

      const navegacao = page.getByRole("navigation", { name: "Seções deste equipamento" });
      if (await navegacao.count()) {
        await expect(navegacao.getByRole("link", { name: "Sobre", exact: true })).toHaveCount(0);
        await expect(navegacao.getByRole("link", { name: "Especificações", exact: true })).toHaveCount(0);
        await expect(navegacao.getByRole("link", { name: "Antes de comprar", exact: true })).toHaveCount(0);

        const destinos = await navegacao
          .locator('a[href^="#"]')
          .evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));
        const ausentes = await page.evaluate(
          (hrefs) => hrefs.filter((href) => !document.querySelector(href as string)),
          destinos,
        );
        expect(ausentes).toEqual([]);
      }

      // Sem categoria e sem relação explícita não existe substituto honesto a
      // preencher automaticamente — a comparação deve simplesmente não nascer.
      await expect(page.locator("#comparacao-rapida")).toHaveCount(0);

      // Ausência de review pública não pode virar nota fictícia na primeira dobra.
      await expect(page.getByRole("link", { name: /avaliaç(ão|ões) verificada/i })).toHaveCount(0);
    } finally {
      await prisma.product.deleteMany({
        where: { OR: [{ slug }, { sku }] },
      });
      await prisma.$disconnect();
    }
  });
});
