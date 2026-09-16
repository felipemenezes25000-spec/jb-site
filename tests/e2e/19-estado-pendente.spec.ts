import { expect, test } from "@playwright/test";

import { fixtures } from "./fixtures";

/* ============================================================================
   Toda mutação responde em menos de 200 ms

   O defeito mais caro do site não era um botão quebrado: era o silêncio. Cada
   ação aqui é uma ida ao servidor de vários segundos, e nenhuma delas dizia
   que estava acontecendo. A auditoria concluiu que o cupom estava rejeitado,
   que o favorito não salvava e que o carrinho não funcionava — os três
   funcionavam, só demoravam calados. Quem usa o site chega à mesma conclusão,
   clica de novo e duplica, ou desiste.

   `data-pending="true"` é o contrato: o botão o carrega enquanto o servidor
   pensa. Este teste roda com a rede estrangulada de propósito — é nela que a
   falta de resposta aparece.
   ============================================================================ */

test.describe("Estado de carregamento", () => {
  test("o botão do cartão do catálogo avisa que está enviando", async ({ page }) => {
    await page.goto("/loja");

    const botao = page.getByRole("button", { name: /Adicionar .* ao carrinho/ }).first();
    await expect(botao).toBeVisible();

    /* Segura a resposta para o estado pendente poder ser observado — sem isso
       o teste dependeria de o servidor local ser lento o bastante. A Server
       Action vai por POST para a própria URL da página, então o filtro é pelo
       método, não pelo caminho. */
    await page.route("**/*", async (rota) => {
      if (rota.request().method() !== "POST") return rota.fallback();
      await new Promise((resolver) => setTimeout(resolver, 2500));
      return rota.fallback();
    });

    await botao.click();
    await expect(botao).toHaveAttribute("data-pending", "true", { timeout: 2000 });
  });

  test("a caixa de compra avisa qual dos dois botões está enviando", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const adicionar = page.getByRole("button", { name: "Adicionar ao carrinho" });
    await expect(adicionar).toBeVisible();
    await expect(adicionar).toBeEnabled();

    /* Os dois botões da caixa declaram a própria intenção pelo `name`/`value`
       do submitter — e não por um `ref` escrito no clique, que era o desenho
       frágil anterior. */
    await expect(adicionar).toHaveAttribute("name", "destino");
    await expect(adicionar).toHaveAttribute("value", "carrinho");

    const comprar = page.getByRole("button", { name: "Comprar agora" });
    await expect(comprar).toHaveAttribute("value", "checkout");
  });

  test("adicionar pela ficha coloca o item no carrinho", async ({ page }) => {
    await page.goto(`/loja/${fixtures().produto.slug}`);

    const adicionar = page.getByRole("button", { name: "Adicionar ao carrinho" });
    await adicionar.click();

    await expect(page.getByRole("link", { name: /Carrinho com \d+ ite/ })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/carrinho");
    await expect(page.getByRole("heading", { name: "Seu carrinho" })).toBeVisible();
    await expect(page.getByText(fixtures().produto.nome).first()).toBeVisible();
  });
});
