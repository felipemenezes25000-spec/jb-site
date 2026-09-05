import { expect, test } from "@playwright/test";

import {
  adicionarAoCarrinho,
  cadastrarCliente,
  entrarComoCliente,
  fecharPedidoComPix,
  sufixo,
} from "./apoio";

/**
 * Conta do cliente, do cadastro ao histórico.
 *
 * O ciclo inteiro num teste só é proposital: cadastrar, comprar, sair, entrar
 * de novo e reencontrar o pedido é a única forma de provar que o pedido ficou
 * amarrado à pessoa, e não à sessão do navegador.
 */

test.describe("Conta do cliente", () => {
  test("cadastra, compra, sai, entra de novo e encontra o pedido", async ({ page }) => {
    const marca = sufixo();
    const cliente = {
      nome: "Cliente de Teste JB",
      email: `cliente.${marca}@jbteste.local`,
      senha: `Senha-${marca}!`,
    };

    /* -------------------------------------------------------- cadastro */
    await cadastrarCliente(page, cliente);
    await expect(page).toHaveURL(/\/minha-jb/);
    await expect(page.getByText(cliente.email)).toBeVisible();

    /* ---------------------------------------------------------- compra */
    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero } = await fecharPedidoComPix(page, {
      email: cliente.email,
      nome: cliente.nome,
    });

    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();

    /* ------------------------------------------------------------ sair */
    await page.goto("/minha-jb");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/minha-jb"));

    // sem sessão, a área privada manda para a entrada
    await page.goto("/minha-jb/pedidos");
    await page.waitForURL(/\/entrar/);

    /* --------------------------------------------------------- reentrar */
    await entrarComoCliente(page, cliente.email, cliente.senha);

    await page.goto("/minha-jb/pedidos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(numero).first()).toBeVisible();

    // e o pedido abre a partir da lista
    await page.getByText(numero).first().click();
    await page.waitForURL(/\/minha-jb\/pedidos\//);
    await expect(page.getByText(numero).first()).toBeVisible();
  });

  test("recusa entrar com senha errada, sem dizer se o e-mail existe", async ({ page }) => {
    const marca = sufixo();
    const cliente = {
      nome: "Cliente Senha Errada",
      email: `senha.${marca}@jbteste.local`,
      senha: `Senha-${marca}!`,
    };
    await cadastrarCliente(page, cliente);

    await page.goto("/minha-jb");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/minha-jb"));

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(cliente.email);
    await page.getByLabel(/^Senha/).fill("senha-que-nao-e-a-dele");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);

    // a mensagem não pode confirmar que o e-mail está cadastrado
    const texto = await alerta.innerText();
    expect(texto.toLowerCase()).not.toContain("não existe");
    expect(texto.toLowerCase()).not.toContain("não encontrado");
  });

  test("recusa cadastro sem aceitar os termos", async ({ page }) => {
    const marca = sufixo();
    await page.goto("/cadastro");

    await page.getByLabel("Nome completo").fill("Sem Aceite de Termos");
    await page.getByLabel("E-mail").fill(`termos.${marca}@jbteste.local`);
    await page.getByLabel("Telefone com DDD").fill("(11) 90000-0000");
    await page.getByRole("textbox", { name: "CPF" }).fill("529.982.247-25");
    await page.getByLabel(/^Senha/).fill("senha-de-teste-123");
    await page.getByLabel("Repita a senha").fill("senha-de-teste-123");

    await page.getByRole("button", { name: "Criar minha conta" }).click();

    await expect(page).toHaveURL(/\/cadastro/);
    await expect(page.getByText(/termos/i).first()).toBeVisible();
  });
});
