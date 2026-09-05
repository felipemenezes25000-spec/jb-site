import { expect, test, type Page } from "@playwright/test";

import { CPF_DE_TESTE, TELEFONE_DE_TESTE, emCentavos, emReais, sufixo } from "./apoio";
import { fixtures } from "./fixtures";

/**
 * Frete pelo CEP no checkout.
 *
 * A loja passou a ler a tabela que a JB já cadastrava em /admin/frete. O que
 * este arquivo prova é o par que dá sentido à mudança:
 *
 *  · CEP dentro de uma faixa cadastrada — a tela mostra valor e prazo, e o
 *    total do pedido cresce exatamente esse valor, do resumo até o pedido
 *    gravado;
 *  · CEP fora de toda faixa — a tela diz, com todas as letras, que o frete
 *    será orçado depois e que ele não está no total.
 *
 * O produto e a faixa vêm de `preparar.ts`: o produto tem perfil de frete só
 * dele, para o resultado não depender do perfil padrão que a JB por acaso
 * tenha cadastrado no banco de desenvolvimento.
 */

/* ------------------------------------------------------------------ apoio */

/**
 * Endereços que o ViaCEP devolveria, servidos pelo próprio teste.
 *
 * O `CampoCep` consulta o ViaCEP no navegador. Deixar a consulta sair de
 * verdade tornaria o teste dependente de rede e de um serviço de terceiro —
 * e, pior, a resposta chegando atrasada sobrescreveria o endereço já digitado.
 * O que está sob teste é o frete da JB, não o ViaCEP.
 */
const ENDERECOS: Record<string, Record<string, string>> = {
  "01310100": {
    cep: "01310-100",
    logradouro: "Avenida Paulista",
    complemento: "",
    bairro: "Bela Vista",
    localidade: "São Paulo",
    uf: "SP",
  },
  "90010000": {
    cep: "90010-000",
    logradouro: "Rua dos Andradas",
    complemento: "",
    bairro: "Centro Histórico",
    localidade: "Porto Alegre",
    uf: "RS",
  },
};

async function servirViaCep(page: Page) {
  await page.route(/viacep\.com\.br/, async (rota) => {
    const digitos = rota.request().url().match(/(\d{8})/)?.[1] ?? "";
    const endereco = ENDERECOS[digitos];
    await rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(endereco ?? { erro: true }),
    });
  });
}

/** Coloca no carrinho o produto que tem tabela de frete própria. */
async function adicionarProdutoDeFrete(page: Page) {
  const { frete } = fixtures();

  await page.goto(`/loja/${frete.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: frete.nome })).toBeVisible();
  await expect(page.getByText(emReais(frete.precoCents)).first()).toBeVisible();

  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText(/adicionad/i).first()).toBeVisible();
}

async function continuar(page: Page, tituloDaProxima: string) {
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: tituloDaProxima })).toBeVisible();
}

/** Vai do carrinho até a etapa de entrega, já com o endereço escolhido. */
async function irAteAEntrega(page: Page, email: string) {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Fechar pedido", level: 1 })).toBeVisible();

  await page.getByLabel("E-mail").fill(email);
  await continuar(page, "Dados do comprador");

  await page.getByLabel("Nome completo").fill("Compradora com Entrega");
  await page.getByLabel("Telefone").fill(TELEFONE_DE_TESTE);
  await page.getByRole("textbox", { name: "CPF" }).fill(CPF_DE_TESTE);
  await continuar(page, "Entrega");

  // Retirada não passa por faixa nenhuma; o que está sob teste é a entrega.
  // O clique vai no rótulo, como o de uma pessoa: o `input` é `sr-only` e fica
  // atrás da própria etiqueta que o descreve.
  const opcao = page.getByRole("radio", { name: /Receber no endereço/ });
  if (await opcao.count()) {
    await page.getByText("Receber no endereço").click();
    await expect(opcao).toBeChecked();
  }
}

/** Digita o CEP e espera o endereço chegar, para o formulário ficar completo. */
async function informarCep(page: Page, cep: string) {
  // por papel, e não por rótulo: a opção "Receber no endereço · Frete pelo CEP"
  // também carrega a palavra CEP no nome acessível
  await page.getByRole("textbox", { name: "CEP" }).fill(cep);
  await expect(page.getByLabel("Logradouro")).not.toHaveValue("");
  await page.getByLabel("Número").fill("1000");
}

/** O total que o resumo do pedido está mostrando. */
async function totalDoResumo(page: Page): Promise<number> {
  const linha = page.getByText("Total", { exact: true }).first().locator("xpath=..");
  return emCentavos(await linha.innerText());
}

/* -------------------------------------------------------------------------- */

test.describe("Frete no checkout", () => {
  test("CEP com faixa cadastrada mostra valor e prazo, e o total soma", async ({ page }) => {
    const { frete } = fixtures();
    await servirViaCep(page);
    await adicionarProdutoDeFrete(page);
    await irAteAEntrega(page, `frete.faixa.${sufixo()}@jbteste.local`);

    await informarCep(page, frete.cepComFaixa);

    /* ------------------------------------------- o aviso da etapa de entrega */

    const prazo = `até ${frete.prazoDias} dias úteis`;
    await expect(
      page.getByText(new RegExp(`Frete de .*${emReais(frete.valorCents)}`)),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(frete.nomeDaFaixa).first()).toBeVisible();
    await expect(page.getByText(prazo).first()).toBeVisible();

    /* ------------------------------------------------- e a soma no resumo */

    const esperado = frete.precoCents + frete.valorCents;
    await expect
      .poll(async () => totalDoResumo(page), {
        message: "o resumo do pedido precisa somar o frete ao total",
        timeout: 20_000,
      })
      .toBe(esperado);

    /* ------------------------------------ o mesmo número até o fim da compra */

    await continuar(page, "Pagamento");
    await expect(page.getByRole("radio", { name: /^Pix/ })).toBeChecked();
    await continuar(page, "Revisão");

    await expect(page.getByText("Frete incluído no total")).toBeVisible();

    const finalizar = page.getByRole("button", { name: /^Finalizar/ });
    await expect(finalizar).toBeVisible();
    expect(emCentavos((await finalizar.innerText()).split("—")[1] ?? "")).toBe(esperado);

    await finalizar.click();
    await page.waitForURL(/\/pedido\/[A-Z0-9-]+$/i, { timeout: 60_000 });

    // quem manda no valor é o servidor: o pedido gravado repete a mesma conta
    const linhaFrete = page.getByText("Frete", { exact: true }).first().locator("xpath=..");
    expect(emCentavos(await linhaFrete.innerText())).toBe(frete.valorCents);
    expect(await totalDoResumo(page)).toBe(esperado);
  });

  test("CEP sem faixa avisa que o frete será orçado e não soma nada", async ({ page }) => {
    const { frete } = fixtures();
    await servirViaCep(page);
    await adicionarProdutoDeFrete(page);
    await irAteAEntrega(page, `frete.semfaixa.${sufixo()}@jbteste.local`);

    await informarCep(page, frete.cepSemFaixa);

    await expect(
      page.getByText("O frete deste endereço será orçado depois"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/não entra no total agora/)).toBeVisible();

    // o resumo diz o mesmo, e o total continua sendo só o dos itens
    await expect(page.getByText("a combinar — a JB envia o valor antes de despachar")).toBeVisible();
    await expect
      .poll(async () => totalDoResumo(page), {
        message: "frete por orçar não pode entrar no total",
        timeout: 20_000,
      })
      .toBe(frete.precoCents);

    await continuar(page, "Pagamento");
    await continuar(page, "Revisão");

    await expect(page.getByText("Frete combinado depois")).toBeVisible();
    const finalizar = page.getByRole("button", { name: /^Finalizar/ });
    expect(emCentavos((await finalizar.innerText()).split("—")[1] ?? "")).toBe(frete.precoCents);
  });

  test("o mesmo CEP, trocado na tela, troca o frete sem recarregar", async ({ page }) => {
    const { frete } = fixtures();
    await servirViaCep(page);
    await adicionarProdutoDeFrete(page);
    await irAteAEntrega(page, `frete.troca.${sufixo()}@jbteste.local`);

    await informarCep(page, frete.cepSemFaixa);
    await expect(
      page.getByText("O frete deste endereço será orçado depois"),
    ).toBeVisible({ timeout: 30_000 });

    await informarCep(page, frete.cepComFaixa);
    await expect(
      page.getByText(new RegExp(`Frete de .*${emReais(frete.valorCents)}`)),
    ).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(async () => totalDoResumo(page), { timeout: 20_000 })
      .toBe(frete.precoCents + frete.valorCents);
  });
});
