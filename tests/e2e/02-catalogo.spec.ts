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


/**
 * Catálogo.
 *
 * O que está sob teste é o contrato "filtro mora na URL": escolher uma opção
 * precisa aparecer na barra de endereço, sobreviver a um recarregamento e
 * voltar ao estado anterior no botão "voltar". Sem isso o resultado deixa de
 * ser compartilhável e o Next perde a renderização no servidor.
 *
 * Cada opção de filtro é um link de verdade — endereço próprio, funciona sem
 * script e anuncia o que faz ("Filtrar por Categoria: Biossegurança" enquanto
 * está desligada, "Remover filtro Categoria: Biossegurança" depois de
 * ligada). É por esse nome acessível que o teste localiza as opções, e é ele
 * que diz se o filtro está aplicado.
 *
 * O grupo escolhido é **Categoria** porque ele existe em toda coleção da loja,
 * inclusive nas que travam a condição (/novos, /seminovos, /usados). /loja não
 * trava mais nada — passou a ser o catálogo inteiro —, mas o teste continua
 * pedindo Categoria para valer igual em qualquer coleção que ele venha a
 * apontar.
 */

/** O contador do topo da lista, que muda de texto quando há filtro. */
const CONTADOR = /\d+\s+(item|itens)\s+(encontrados?|encontrado|nesta lista)/;

test.describe("Catálogo", () => {
  test("lista equipamentos com preço e link para o produto", async ({ page }) => {
    await page.goto("/loja");

    /* /loja é o catálogo inteiro — o título diz isso, e é o mesmo escopo que o
       menu ("Loja") e o rodapé ("Todos os produtos") prometem. */
    await expect(page.getByRole("heading", { name: "Todos os produtos" })).toBeVisible();
    await expect(page.getByText(CONTADOR)).toBeVisible();

    const { produto } = fixtures();
    const link = page.getByRole("link", { name: produto.nome }).first();
    await expect(link).toBeVisible();

    await link.click();
    await page.waitForURL(new RegExp(`/loja/${produto.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: produto.nome })).toBeVisible();
  });

  test("filtrar por categoria escreve o filtro na URL e reduz o resultado", async ({ page }) => {
    await page.goto("/loja");

    const contador = page.getByText(CONTADOR);
    await expect(contador).toBeVisible();
    const totalSemFiltro = Number((await contador.innerText()).match(/\d+/)?.[0] ?? 0);
    expect(totalSemFiltro).toBeGreaterThan(0);

    // A lista completa fica sob demanda em qualquer largura; isso devolve a
    // área horizontal à grade sem perder filtros compartilháveis por URL.
    const painel = await abrirFiltros(page);
    const opcoes = painel.getByRole("link", { name: /^Filtrar por Categoria: / });
    await expect(opcoes.first()).toBeVisible();
    const escolhida = opcoes.first();
    const rotulo = (await escolhida.getAttribute("aria-label"))?.replace(
      "Filtrar por Categoria: ",
      "",
    );
    expect(rotulo, "o painel de filtros precisa oferecer alguma categoria").toBeTruthy();

    await escolhida.click();

    await page.waitForURL(/\?.+=.+/);
    const url = new URL(page.url());
    const chaves = [...url.searchParams.keys()];
    expect(chaves.length, `a URL deveria carregar o filtro: ${url.search}`).toBeGreaterThan(0);

    // ligada, a ficha visível passa a oferecer a remoção
    await expect(
      page.getByRole("link", { name: `Remover filtro Categoria: ${rotulo}` }).first(),
    ).toBeVisible();

    const totalFiltrado = Number((await contador.innerText()).match(/\d+/)?.[0] ?? 0);
    expect(totalFiltrado).toBeGreaterThan(0);
    expect(totalFiltrado).toBeLessThanOrEqual(totalSemFiltro);
  });

  test("a categoria escolhida sobrevive ao recarregamento e ao voltar", async ({ page }) => {
    /* A categoria sai da própria página, e não de uma lista fixa: o catálogo
       de demonstração muda, e um slug escrito à mão aqui vira teste que
       reprova por causa do banco. */
    await page.goto("/loja");
    const painel = await abrirFiltros(page);
    const primeira = painel
      .getByRole("link", { name: /^Filtrar por Categoria: / })
      .first();
    await expect(primeira).toBeVisible();
    const alvo = await primeira.getAttribute("href");
    expect(alvo, "o painel precisa oferecer uma categoria").toBeTruthy();

    await page.goto(alvo!);

    const contador = page.getByText(CONTADOR);
    await expect(contador).toBeVisible();

    // o filtro veio da URL: a opção correspondente precisa estar ligada
    const ligadas = page.getByRole("link", { name: /^Remover filtro Categoria:/ });
    await expect(ligadas.first()).toBeVisible();

    // e a barra de filtros aplicados precisa oferecer a limpeza
    const limpar = page.getByRole("link", { name: "Limpar tudo" }).first();
    await expect(limpar).toBeVisible();

    await page.reload();
    await expect(ligadas.first()).toBeVisible();

    await limpar.click();
    await page.waitForURL((url) => !url.searchParams.has("categoria"));
    await expect(ligadas).toHaveCount(0);

    await page.goBack();
    await page.waitForURL(/categoria=/);
    await expect(ligadas.first()).toBeVisible();
  });

  test("filtro sem resultado mostra o estado vazio com saída útil", async ({ page }) => {
    await page.goto("/loja?preco_min=999999999");

    // o rodapé também oferece "Pedir orçamento"; o que interessa é a saída
    // dentro do conteúdo, ao lado do estado vazio
    const conteudo = page.getByRole("main");
    await expect(conteudo.getByText("Nenhum item com esses filtros")).toBeVisible();
    await expect(conteudo.getByRole("link", { name: "Limpar filtros" })).toBeVisible();
    await expect(conteudo.getByRole("link", { name: "Pedir orçamento" })).toBeVisible();
  });

  test("a ordenação por menor preço também vai para a URL", async ({ page }) => {
    await page.goto("/loja");

    await page.getByLabel("Ordenar resultados").selectOption("menor-preco");
    await page.waitForURL(/ordem=menor-preco/);

    expect(new URL(page.url()).searchParams.get("ordem")).toBe("menor-preco");
  });
});
