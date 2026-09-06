import { expect, test } from "@playwright/test";

import {
  adicionarAoCarrinho,
  avancarAteRevisao,
  cadastrarCliente,
  fecharPedidoComPix,
  sairDaConta,
  sufixo,
} from "./apoio";
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
 *
 * MUDANÇA DE CONTRATO. Até a fase 3 desta evolução o primeiro teste se chamava
 * "fecha o pedido como convidado": o checkout público aceitava compra sem
 * conta, e o acompanhamento saía por um cookie assinado. Isso deixou de valer
 * — toda compra nova nasce com titular autenticado, e a conta é criada dentro
 * do próprio checkout. O teste foi reescrito para o contrato novo em vez de
 * desligado, e ganhou um par: `sem senha, o checkout não fecha`, que é a
 * prova de que o caminho antigo não existe mais.
 */

test.describe("Checkout e pagamento", () => {
  test("cria a conta dentro do checkout e chega na página do pedido", async ({ page }) => {
    const { produto } = fixtures();
    const { precoUnitarioCents } = await adicionarAoCarrinho(page, { quantidade: 1 });

    const { numero, totalCents } = await fecharPedidoComPix(page, {
      email: `compradora.${sufixo()}@jbteste.local`,
      nome: "Compradora de Teste JB",
      acesso: { modo: "criar", senha: "senhaDeTeste123" },
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

    /* A conta nasceu junto com a compra, e a pessoa já está dentro dela: o
       pedido tem de aparecer na Área da Clínica sem passar por login. É esta
       asserção que separa "criou conta" de "criou conta e amarrou o pedido
       nela". */
    await page.goto("/minha-jb/pedidos");
    await expect(page.getByText(numero).first()).toBeVisible();
  });

  test("sem senha, o checkout não fecha — não existe mais compra de convidado", async ({
    page,
  }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    // a caixa "quero criar minha conta" era o que deixava passar sem conta
    await expect(page.getByLabel("Quero criar minha conta na JB")).toHaveCount(0);

    // e as duas portas são explícitas
    await expect(page.getByRole("radio", { name: /Criar meu acesso/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Já tenho conta/ })).toBeVisible();

    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`sem.senha.${sufixo()}@jbteste.local`);
    await page.getByRole("button", { name: "Continuar" }).click();

    // não avança: a etapa de identificação continua na tela
    await expect(page.getByText("Confira antes de continuar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Identificação" })).toBeVisible();
  });

  test("e-mail já cadastrado não vira conta nova, e a compra não sai sem prova", async ({
    page,
  }) => {
    const cliente = {
      nome: "Titular Existente JB",
      email: `titular.${sufixo()}@jbteste.local`,
      senha: "senhaDeTeste123",
    };
    await cadastrarCliente(page, cliente);
    await sairDaConta(page);

    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    /* Modo "criar" com um e-mail que já existe: a resposta não pode ser uma
       conta nova nem um vínculo com a conta alheia. Digitar um e-mail não
       prova ser dono dele. */
    await page.getByRole("radio", { name: /Criar meu acesso/ }).check();
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(cliente.email);
    await page.getByLabel(/^Crie uma senha/).fill("outraSenhaQualquer1");
    await avancarAteRevisao(page);

    await page.getByRole("button", { name: /^Confirmar pedido/ }).click();

    await expect(page.getByText(/Não foi possível criar a conta com este e-mail/)).toBeVisible({
      timeout: 30_000,
    });
    // continua no checkout: nenhum pedido foi criado
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("cliente existente entra no próprio checkout e o pedido fica na conta dele", async ({
    page,
  }) => {
    const cliente = {
      nome: "Cliente Que Volta JB",
      email: `volta.${sufixo()}@jbteste.local`,
      senha: "senhaDeTeste123",
    };
    await cadastrarCliente(page, cliente);
    await sairDaConta(page);

    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero } = await fecharPedidoComPix(page, {
      email: cliente.email,
      nome: cliente.nome,
      acesso: { modo: "entrar", senha: cliente.senha },
    });

    await page.goto("/minha-jb/pedidos");
    await expect(page.getByText(numero).first()).toBeVisible();
  });

  test("senha errada no checkout não cria pedido nem revela se o e-mail existe", async ({
    page,
  }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    await page.getByRole("radio", { name: /Já tenho conta/ }).check();
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`inexistente.${sufixo()}@jbteste.local`);
    await page.getByLabel(/^Senha/).fill("senhaQualquerErrada");
    await avancarAteRevisao(page);

    await page.getByRole("button", { name: /^Confirmar pedido/ }).click();

    // a mesma frase que uma senha errada de conta existente produziria
    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("aprovar o pagamento simulado deixa o pedido pago", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero } = await fecharPedidoComPix(page, {
      email: `pagador.${sufixo()}@jbteste.local`,
      nome: "Pagador de Teste JB",
      acesso: { modo: "criar", senha: "senhaDeTeste123" },
    });

    const painel = page.getByText("Painel de demonstração");
    await expect(painel, "o provedor de teste precisa oferecer a simulação").toBeVisible();

    await page.getByRole("button", { name: "Simular pagamento aprovado" }).click();

    // fora de produção o título diz, com todas as letras, que nada foi cobrado
    await expect(page.getByText(/^Pagamento confirmado/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Pagamento aprovado", { exact: true }).first()).toBeVisible();

    // simulação some depois de pago — não há mais desfecho para forçar
    await expect(painel).toHaveCount(0);

    // e o estado sobrevive ao recarregamento: quem gravou foi o servidor
    await page.reload();
    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();
    await expect(page.getByText(/^Pagamento confirmado/).first()).toBeVisible();
  });

  test("recusar o pagamento simulado permite gerar nova cobrança", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await fecharPedidoComPix(page, {
      email: `recusado.${sufixo()}@jbteste.local`,
      nome: "Recusado de Teste JB",
      acesso: { modo: "criar", senha: "senhaDeTeste123" },
    });

    await page.getByRole("button", { name: "Simular recusa" }).click();

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

    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(`invalido.${sufixo()}@jbteste.local`);
    await page.getByLabel(/^Crie uma senha/).fill("senhaDeTeste123");
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
