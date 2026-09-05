import { expect, test } from "@playwright/test";

import { adicionarAoCarrinho, fecharPedidoComPix, sufixo } from "./apoio";
import { fixtures } from "./fixtures";

/**
 * Checkout completo com o provedor simulado, e o ciclo do pagamento.
 *
 * O ponto do primeiro teste é a travessia inteira: cinco etapas, um pedido
 * criado, um número na URL e o total do pedido igual ao total do carrinho —
 * porque quem manda no valor é o servidor, não o formulário.
 *
 * O segundo teste fecha o ciclo: o botão de simulação dispara a MESMA rota de
 * webhook que o adquirente chamaria, e o pedido precisa virar pago.
 */

test.describe("Checkout e pagamento", () => {
  test("fecha o pedido como convidado e chega na página do pedido", async ({ page }) => {
    const { produto } = fixtures();
    const { precoUnitarioCents } = await adicionarAoCarrinho(page, { quantidade: 1 });

    const { numero, totalCents } = await fecharPedidoComPix(page, {
      email: `convidado.${sufixo()}@jbteste.local`,
      nome: "Convidada de Teste JB",
    });

    // o total oferecido na revisão é o do carrinho, sem frete
    expect(totalCents).toBe(precoUnitarioCents);

    expect(numero, "o pedido precisa ter número").toMatch(/^JB/i);
    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();
    await expect(page.getByText("Aguardando pagamento", { exact: true }).first()).toBeVisible();

    // o item comprado está no pedido, com o mesmo valor
    await expect(page.getByText(produto.nome).first()).toBeVisible();
    await expect(page.getByText("Valor da cobrança")).toBeVisible();

    // Pix nasce pendente e mostra o código para pagar
    await expect(page.getByText(/Pix/).first()).toBeVisible();

    // o carrinho some depois do pedido: ele deixa de ser a fonte da verdade
    await page.goto("/carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("aprovar o pagamento simulado deixa o pedido pago", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero } = await fecharPedidoComPix(page, {
      email: `pagador.${sufixo()}@jbteste.local`,
      nome: "Pagador de Teste JB",
    });

    const painel = page.getByText("Simulação — não aparece em produção");
    await expect(painel, "o provedor de teste precisa oferecer a simulação").toBeVisible();

    await page.getByRole("button", { name: "Aprovar pagamento" }).click();

    await expect(page.getByText("Pagamento confirmado", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Pagamento aprovado", { exact: true }).first()).toBeVisible();

    // simulação some depois de pago — não há mais desfecho para forçar
    await expect(painel).toHaveCount(0);

    // e o estado sobrevive ao recarregamento: quem gravou foi o servidor
    await page.reload();
    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();
    await expect(page.getByText("Pagamento confirmado", { exact: true })).toBeVisible();
  });

  test("recusar o pagamento simulado permite gerar nova cobrança", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await fecharPedidoComPix(page, {
      email: `recusado.${sufixo()}@jbteste.local`,
      nome: "Recusado de Teste JB",
    });

    await page.getByRole("button", { name: "Recusar" }).click();

    await expect(page.getByText("Pagamento recusado", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Gerar nova cobrança/ })).toBeVisible();
  });

  test("o checkout recusa avançar sem os dados obrigatórios", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    // etapa 0 sem e-mail
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Confira antes de continuar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Identificação" })).toBeVisible();

    await page.getByLabel("E-mail").fill(`invalido.${sufixo()}@jbteste.local`);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Dados do comprador" })).toBeVisible();

    // etapa 1 com CPF que não fecha nos dígitos verificadores
    await page.getByLabel("Nome completo").fill("Comprador de Teste");
    await page.getByLabel("Telefone").fill("(11) 90000-0000");
    await page.getByRole("textbox", { name: "CPF" }).fill("111.111.111-11");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("CPF inválido. Confira os números.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dados do comprador" })).toBeVisible();
  });
});
