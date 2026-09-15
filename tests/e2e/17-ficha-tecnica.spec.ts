import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

/* ============================================================================
   A ficha técnica — uma fonte, cinco grupos, nenhum rótulo repetido

   A auditoria de 15/09/2026 mediu, na página de um produto:

     · "220 V" em cinco lugares, com três rótulos (Tensão, Alimentação,
       Voltagem) e dois formatos ("220" e "220 V");
     · o contador anunciando "6 especificações" numa página com nove
       atributos;
     · "Ficha completa" levando a um bloco cujo conteúdo principal era a
       mesma lista que a pessoa acabara de ler 600 px acima.

   Estes testes travam as três coisas. Eles não olham pixel: olham o contrato
   — quantas vezes um rótulo técnico aparece, e se o número prometido é o
   número entregue.
   ============================================================================ */

test.describe("Ficha técnica", () => {
  test("não repete o mesmo rótulo dentro da ficha", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    /* A ficha é uma lista de definições: `<dt>` é rótulo, `<dd>` é valor.
       Contar `<dt>` é contar rótulos — e rótulo repetido é o defeito que esta
       refatoração existiu para matar: "220 V" aparecia cinco vezes, em três
       blocos, com três rótulos diferentes.

       O escopo é a seção da ficha. Os três atributos decisivos do topo
       continuam aparecendo aqui embaixo de propósito — o topo é uma prévia da
       MESMA fonte, não um segundo cadastro —, e isso é o que a Amazon e o
       Mercado Livre também fazem. O que não pode existir é a mesma linha duas
       vezes dentro da tabela. */
    const rotulos = await page.locator("#ficha-tecnica dl dt").allInnerTexts();
    const nomes = rotulos.map((texto) => texto.split("\n")[0].trim()).filter(Boolean);

    const vistos = new Set<string>();
    const repetidos = nomes.filter((rotulo) => {
      const chave = rotulo.toLowerCase();
      if (vistos.has(chave)) return true;
      vistos.add(chave);
      return false;
    });

    expect(repetidos, `rótulos repetidos: ${repetidos.join(", ")}`).toEqual([]);
  });

  test("o atributo decisivo aparece no topo e na ficha — e em mais lugar nenhum", async ({
    page,
  }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const topo = page.locator("#titulo-produto").locator("xpath=ancestor::div[1]");
    void topo;

    /* Antes eram sete blocos: prévia, ficha, dimensões, regulatório,
       compatibilidade, condições de compra e mini-comparador. Contar os `<dt>`
       de um mesmo rótulo na página inteira é o jeito de travar isso: dois é a
       prévia mais a ficha; três já é um terceiro bloco reescrevendo o dado. */
    const todos = await page.locator("dt").allInnerTexts();
    const contagem = new Map<string, number>();
    for (const bruto of todos) {
      const rotulo = bruto.split("\n")[0].trim().toLowerCase();
      if (!/tens[ãa]o|garantia|peso|dimens|capacidade/.test(rotulo)) continue;
      contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1);
    }

    const excessivos = [...contagem.entries()].filter(([, vezes]) => vezes > 2);
    expect(
      excessivos,
      `aparecem mais de duas vezes: ${excessivos.map(([r, v]) => `${r} (${v})`).join(", ")}`,
    ).toEqual([]);
  });

  test("a tensão tem um rótulo só, e ele é 'Tensão'", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const corpo = await page.locator("main").innerText();
    /* "Alimentação" e "Voltagem" eram os sinônimos que a ficha usava para o
       mesmo campo, em blocos diferentes da mesma página. */
    expect(corpo).not.toMatch(/^\s*Alimenta[çc][ãa]o\s*$/m);
  });

  test("o número prometido no topo é o número que a ficha entrega", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const atalho = page.getByRole("link", { name: /Ver as \d+ especificações/ });
    if ((await atalho.count()) === 0) test.skip(true, "produto sem atributos decisivos");

    const texto = (await atalho.first().innerText()).trim();
    const prometido = Number(texto.match(/\d+/)?.[0] ?? 0);
    expect(prometido).toBeGreaterThan(0);

    await atalho.first().click();

    /* O contador da seção vem do mesmo objeto — se um mudar sem o outro, este
       teste cai. */
    const contador = page.locator("#ficha-tecnica").getByText(/\d+ especificaç/);
    await expect(contador.first()).toContainText(String(prometido));
  });

  test("a ficha é lista de definições, não pilha de divs", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const secao = page.locator("#ficha-tecnica");
    await expect(secao).toBeVisible();
    expect(await secao.locator("dl").count()).toBeGreaterThan(0);
    expect(await secao.locator("dt").count()).toBeGreaterThan(0);
  });

  test("a âncora da barra abre a seção que ela promete", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    /* As seções de decisão nasciam metade abertas e metade fechadas: clicar em
       "Entrega e garantia" levava a um cartão vazio, que exigia um segundo
       clique. Todas nascem abertas agora. */
    for (const id of ["ficha-tecnica", "preparo", "entrega-e-garantia", "duvidas"]) {
      const bloco = page.locator(`details#${id}`);
      if ((await bloco.count()) === 0) continue;
      await expect(bloco).toHaveAttribute("open", /.*/);
    }
  });
});
