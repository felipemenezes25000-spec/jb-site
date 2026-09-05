import { expect, test } from "@playwright/test";

import {
  adicionarAoCarrinho,
  emReais,
  entrarComoEquipe,
  fecharPedidoComPix,
  sufixo,
} from "./apoio";
import { fixtures } from "./fixtures";

/**
 * Painel interno.
 *
 * Herda o que o antigo `scripts/e2e.mjs` provava — entrar, ser recusado com
 * senha errada, ser barrado sem sessão e ver que uma edição no painel muda o
 * site — e acrescenta o que a plataforma passou a ter: o pedido fechado na
 * loja aparecendo na lista de pedidos.
 */

test.describe("Painel da equipe", () => {
  test("sem sessão, qualquer rota do painel manda para a entrada", async ({ page }) => {
    for (const rota of ["/admin", "/admin/pedidos", "/admin/configuracoes"]) {
      await page.goto(rota);
      await page.waitForURL(/\/admin\/entrar/);
      await expect(page.getByRole("heading", { name: "Painel interno" })).toBeVisible();
    }
  });

  test("senha errada é recusada sem dizer o que estava errado", async ({ page }) => {
    const { staff } = fixtures();

    await page.goto("/admin/entrar");
    await page.getByLabel("E-mail").fill(staff.email);
    await page.getByLabel(/^Senha/).fill("essa-nao-e-a-senha");
    await page.getByRole("button", { name: "Entrar no painel" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/entrar/);
  });

  test("a equipe entra e vê o painel", async ({ page }) => {
    await entrarComoEquipe(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/admin/pedidos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("o pedido fechado na loja aparece na lista do painel", async ({ page }) => {
    const { produto } = fixtures();

    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero, totalCents } = await fecharPedidoComPix(page, {
      email: `admin.pedido.${sufixo()}@jbteste.local`,
      nome: "Comprador Visto pelo Painel",
    });

    await entrarComoEquipe(page);
    await page.goto(`/admin/pedidos?q=${encodeURIComponent(numero)}`);

    const linha = page.getByText(numero).first();
    await expect(linha).toBeVisible();

    // e o detalhe traz o comprador, o item e o valor recalculado no servidor
    await linha.click();
    await page.waitForURL(/\/admin\/pedidos\/[^/]+$/);

    await expect(page.getByText(numero).first()).toBeVisible();
    await expect(page.getByText("Comprador Visto pelo Painel").first()).toBeVisible();
    await expect(page.getByText(produto.nome).first()).toBeVisible();

    await expect(page.getByText(emReais(totalCents)).first()).toBeVisible();
  });

  test("editar a página institucional no painel muda o site, e dá para desfazer", async ({
    page,
  }) => {
    const marca = `Texto de verificação ${sufixo()}`;

    await entrarComoEquipe(page);
    await page.goto("/admin/conteudo/paginas/sobre");

    const chamada = page.getByLabel("Chamada");
    await expect(chamada).toBeVisible();
    const original = await chamada.inputValue();

    await chamada.fill(marca);
    // confere o campo ANTES de salvar: o editor rico monta depois da hidratação
    // e já derrubou o que tinha sido digitado — sem esta linha, o teste falhava
    // lá na frente, longe da causa
    await expect(chamada).toHaveValue(marca);

    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Página salva.")).toBeVisible({ timeout: 30_000 });

    await page.goto("/sobre");
    await expect(page.getByText(marca)).toBeVisible();

    // devolve o texto original — o teste não pode deixar rastro no conteúdo
    await page.goto("/admin/conteudo/paginas/sobre");
    await page.getByLabel("Chamada").fill(original);
    await expect(page.getByLabel("Chamada")).toHaveValue(original);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Página salva.")).toBeVisible({ timeout: 30_000 });

    /**
     * Recarrega a cada tentativa, em vez de olhar o DOM de uma busca só.
     *
     * `goto` traz a página uma vez; se a revalidação ainda não tinha chegado
     * naquele instante, o `toHaveCount` ficava observando um HTML velho que
     * nunca mudaria — e o teste falhava sem que houvesse defeito. A regeneração
     * acontece no PRÓXIMO pedido, então quem tem que repetir é o pedido.
     */
    await expect
      .poll(
        async () => {
          await page.goto("/sobre");
          return page.getByText(marca).count();
        },
        { timeout: 30_000, message: "o texto de verificação não saiu de /sobre" },
      )
      .toBe(0);
  });
});

test.describe("Formulário de contato", () => {
  test("grava o contato e ele aparece no painel", async ({ page }) => {
    const marca = sufixo();
    const nome = `Visitante de Teste ${marca}`;

    await page.goto("/contato");
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("textbox", { name: "E-mail" }).fill(`contato.${marca}@jbteste.local`);
    await page.getByLabel("Telefone").fill("(11) 90000-0000");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page
      .getByLabel("Mensagem")
      .fill("Mensagem enviada pela suíte automatizada para conferir o cadastro de contato.");

    await page.getByRole("button", { name: /Enviar/ }).click();
    await expect(page.getByText("Mensagem enviada")).toBeVisible({ timeout: 30_000 });

    await entrarComoEquipe(page);
    await page.goto(`/admin/leads?q=${encodeURIComponent(nome)}`);
    await expect(page.getByText(nome).first()).toBeVisible();
  });

  test("a isca escondida derruba o envio sem avisar o robô", async ({ page }) => {
    const marca = sufixo();
    const nome = `Robo de Teste ${marca}`;

    await page.goto("/contato");
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("textbox", { name: "E-mail" }).fill(`robo.${marca}@jbteste.local`);
    await page.getByLabel("Telefone").fill("(11) 90000-0000");
    await page.getByLabel("Mensagem").fill("Mensagem de robô, para conferir a isca do formulário.");

    // A isca é `hidden` e fora da ordem de tabulação: nenhum localizador por
    // papel ou rótulo a alcança, porque para uma pessoa ela não existe. Só
    // resta escrever nela como um robô escreveria — direto no DOM.
    await page
      .locator("#assunto_alternativo")
      .evaluate((campo) => {
        (campo as HTMLInputElement).value = "http://spam.example.com";
      });

    await page.getByRole("button", { name: /Enviar/ }).click();

    // a resposta é a MESMA do envio bom, de propósito
    await expect(page.getByText("Mensagem enviada")).toBeVisible({ timeout: 30_000 });

    // mas nada foi gravado
    await entrarComoEquipe(page);
    await page.goto(`/admin/leads?q=${encodeURIComponent(nome)}`);
    await expect(page.getByText(nome)).toHaveCount(0);
  });
});
