import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

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
 * O grupo escolhido é **Categoria**, e não Condição: /loja é a coleção dos
 * novos e trava a condição — ela é o escopo da página, não uma escolha que a
 * pessoa possa desmarcar, então aquele grupo simplesmente não é desenhado
 * ali. O teste pedia por ele e falhava sem que houvesse defeito nenhum na
 * aplicação.
 */

/** O contador do topo da lista, que muda de texto quando há filtro. */
const CONTADOR = /\d+\s+(item|itens)\s+(encontrados?|encontrado|nesta lista)/;

test.describe("Catálogo", () => {
  test("lista equipamentos com preço e link para o produto", async ({ page }) => {
    await page.goto("/loja");

    await expect(page.getByRole("heading", { name: "Equipamentos odontológicos" })).toBeVisible();
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

    // pega a primeira condição oferecida pela própria página, em vez de
    // fixar um rótulo que o catálogo pode não ter. A busca fica dentro do
    // painel: a fileira de fichas de filtro aplicado repete o mesmo nome
    // acessível, e é o painel que representa o estado de cada opção.
    const painel = page.getByRole("complementary", { name: "Filtros do catálogo" });
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

    // ligada, a mesma opção passa a oferecer a remoção
    await expect(
      painel.getByRole("link", { name: `Remover filtro Categoria: ${rotulo}` }),
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
    const primeira = page
      .getByRole("complementary", { name: "Filtros do catálogo" })
      .getByRole("link", { name: /^Filtrar por Categoria: / })
      .first();
    await expect(primeira).toBeVisible();
    const alvo = await primeira.getAttribute("href");
    expect(alvo, "o painel precisa oferecer uma categoria").toBeTruthy();

    await page.goto(alvo!);

    const contador = page.getByText(CONTADOR);
    await expect(contador).toBeVisible();

    // o filtro veio da URL: a opção correspondente precisa estar ligada
    const painel = page.getByRole("complementary", { name: "Filtros do catálogo" });
    const ligadas = painel.getByRole("link", { name: /^Remover filtro / });
    await expect(ligadas).toHaveCount(1);

    // e a barra de filtros aplicados precisa oferecer a limpeza
    const limpar = page.getByRole("link", { name: "Limpar tudo" }).first();
    await expect(limpar).toBeVisible();

    await page.reload();
    await expect(ligadas).toHaveCount(1);

    await limpar.click();
    await page.waitForURL((url) => !url.searchParams.has("categoria"));
    await expect(ligadas).toHaveCount(0);

    await page.goBack();
    await page.waitForURL(/categoria=/);
    await expect(ligadas).toHaveCount(1);
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
