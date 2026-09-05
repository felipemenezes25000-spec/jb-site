import { expect, test, type Page } from "@playwright/test";

import { sufixo, TELEFONE_DE_TESTE } from "./apoio";

/**
 * Chamado de assistência aberto sem conta.
 *
 * Duas coisas são provadas aqui: quem não tem cadastro consegue abrir um
 * chamado e recebe um número na hora; e esse número, sozinho, não abre o
 * chamado para outra pessoa — a porta pede a confirmação do contato.
 *
 * O formulário tem uma trava de tempo mínimo (quatro segundos entre abrir e
 * enviar) contra robô. O teste respeita a trava em vez de contorná-la: burlar
 * a defesa faria o teste passar num caminho que ninguém usa.
 */

const TEMPO_MINIMO_DO_FORMULARIO_MS = 4_000;

async function avancar(page: Page, tituloDaProxima: string) {
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: tituloDaProxima })).toBeVisible();
}

test.describe("Assistência técnica", () => {
  test("abre chamado sem login e acompanha pelo número", async ({ page, context }) => {
    const marca = sufixo();
    const email = `chamado.${marca}@jbteste.local`;

    await page.goto("/assistencia-tecnica/solicitar");
    await expect(
      page.getByRole("heading", { name: "Qual equipamento precisa de atendimento?" }),
    ).toBeVisible();

    // O relógio da trava começa quando o servidor renderiza o formulário, ou
    // seja, antes desta linha. Medir a partir daqui erra para o lado seguro:
    // o teste espera um pouco mais do que o necessário, nunca menos.
    const abertoEm = Date.now();

    /* 1. equipamento */
    await page.getByLabel("Marca").fill("Dabi Atlante");
    await page.getByLabel("Modelo").fill("Croma Cristal");
    await avancar(page, "O que está acontecendo?");

    /* 2. problema */
    await page.getByLabel("Sintoma principal").selectOption({ index: 1 });
    await page
      .getByLabel("Descreva o problema")
      .fill(
        "O refletor da cadeira pisca quando o encosto sobe e apaga depois de alguns segundos.",
      );
    await avancar(page, "Fotos do problema");

    /* 3. fotos — opcional e, sem conta, nem há envio */
    await avancar(page, "Onde é o atendimento e com quem falamos?");

    /* 4. local e contato */
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByLabel("Nome de quem acompanha").fill("Responsável de Teste JB");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Telefone").fill(TELEFONE_DE_TESTE);
    await avancar(page, "Confira antes de enviar");

    /* 5. revisão — respeita a trava de tempo antes de enviar */
    const decorrido = Date.now() - abertoEm;
    if (decorrido < TEMPO_MINIMO_DO_FORMULARIO_MS + 500) {
      await page.waitForTimeout(TEMPO_MINIMO_DO_FORMULARIO_MS + 500 - decorrido);
    }

    await page.getByRole("button", { name: "Enviar chamado" }).click();
    await page.waitForURL(/\/chamado\/[A-Z0-9-]+$/i, { timeout: 60_000 });

    const numero = decodeURIComponent(new URL(page.url()).pathname.split("/").pop() ?? "");
    expect(numero, "o chamado precisa ter número").toMatch(/^AT/i);

    // quem acabou de abrir entra direto, sem provar nada
    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();
    await expect(page.getByText(/Urgência:/)).toBeVisible();

    // e o acompanhamento continua valendo depois de recarregar
    await page.reload();
    await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();

    /* ------------------------------------------------------------------ */
    /* Outro navegador: o número sozinho não abre o chamado.               */
    const outra = await context.browser()!.newContext();
    const estranho = await outra.newPage();
    await estranho.goto(`${page.url()}`);

    await expect(
      estranho.getByRole("heading", { name: `Acompanhar o chamado ${numero}` }),
    ).toBeVisible();

    // contato errado é recusado com mensagem que não revela nada
    await estranho.getByLabel("E-mail ou telefone do chamado").fill("outro@example.com");
    await estranho.getByRole("button", { name: "Ver o chamado" }).click();
    await expect(estranho.getByRole("heading", { name: /Acompanhar o chamado/ })).toBeVisible();

    // com o contato certo, abre
    await estranho.getByLabel("E-mail ou telefone do chamado").fill(email);
    await estranho.getByRole("button", { name: "Ver o chamado" }).click();
    await expect(estranho.getByRole("heading", { name: numero, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await outra.close();
  });

  test("recusa avançar sem identificar o equipamento nem descrever o problema", async ({
    page,
  }) => {
    await page.goto("/assistencia-tecnica/solicitar");

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByText("Escolha um equipamento cadastrado ou diga o tipo, a marca ou o modelo."),
    ).toBeVisible();

    await page.getByLabel("Marca").fill("Gnatus");
    await avancar(page, "O que está acontecendo?");

    await page.getByLabel("Descreva o problema").fill("quebrou");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByText("Conte o que está acontecendo com pelo menos 15 caracteres."),
    ).toBeVisible();
  });

  test("número inexistente não confirma nem nega a existência do chamado", async ({ page }) => {
    await page.goto("/chamado/AT-000000");

    await expect(
      page.getByRole("heading", { name: "Acompanhar o chamado AT-000000" }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail ou telefone do chamado")).toBeVisible();
  });
});
