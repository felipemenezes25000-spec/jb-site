import { expect, type Page } from "@playwright/test";

import { fixtures } from "./fixtures";

/* ==========================================================================
   Apoio comum aos testes de ponta a ponta.

   Regra que vale para tudo aqui: localizar por papel e por texto. Classe CSS é
   detalhe de estilo — um teste amarrado a ela quebra numa troca de tema sem
   que nada da aplicação tenha deixado de funcionar.
   ========================================================================== */

/** CPF válido pelos dígitos verificadores, sem vínculo com pessoa real. */
export const CPF_DE_TESTE = "529.982.247-25";
export const TELEFONE_DE_TESTE = "(11) 90000-0000";

/** "R$ 4.890,00" → 489000. É assim que o teste confere dinheiro. */
export function emCentavos(texto: string | null | undefined): number {
  if (!texto) return Number.NaN;
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return Number.NaN;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : Number.NaN;
}

/** 489000 → "4.890,00", que é como o valor aparece na tela. */
export function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Sufixo único por execução, para e-mail de cadastro não colidir. */
export function sufixo() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/* --------------------------------------------------------------- console */

/**
 * Ruído que o servidor de desenvolvimento produz sozinho e que não diz nada
 * sobre a página. Cada linha aqui é uma renúncia consciente — a lista é curta
 * de propósito, para o teste continuar valendo alguma coisa.
 */
const RUIDO_CONHECIDO = [
  "Download the React DevTools",
  "react-devtools",
  "[Fast Refresh]",
  "Slow filesystem detected",
  "was preloaded using link preload but not used",
];

export type VigiaDeConsole = {
  erros: string[];
  falhas: string[];
};

/**
 * Coleta erros de console e respostas 5xx durante a navegação. 404 de recurso
 * estático não entra: em desenvolvimento o Next pede arquivos que só existem
 * depois do build, e barrar isso transformaria o teste num detector de
 * ambiente em vez de um detector de defeito.
 */
export function vigiarConsole(page: Page): VigiaDeConsole {
  const vigia: VigiaDeConsole = { erros: [], falhas: [] };

  page.on("console", (mensagem) => {
    if (mensagem.type() !== "error") return;
    const texto = mensagem.text();
    if (RUIDO_CONHECIDO.some((ruido) => texto.includes(ruido))) return;
    vigia.erros.push(texto);
  });

  page.on("pageerror", (erro) => {
    vigia.erros.push(`exceção não tratada: ${erro.message}`);
  });

  page.on("response", (resposta) => {
    if (resposta.status() >= 500) {
      vigia.falhas.push(`${resposta.status()} ${resposta.url()}`);
    }
  });

  return vigia;
}

/* -------------------------------------------------------------- carrinho */

/**
 * Abre a página do produto e coloca `quantidade` unidades no carrinho.
 * Devolve o preço unitário lido da própria página — o teste compara o total do
 * carrinho com esse número, e não com uma constante escrita no teste.
 */
export async function adicionarAoCarrinho(
  page: Page,
  opcoes: { slug?: string; quantidade?: number } = {},
): Promise<{ precoUnitarioCents: number; nome: string }> {
  const dados = fixtures();
  const slug = opcoes.slug ?? dados.produto.slug;
  const quantidade = opcoes.quantidade ?? 1;

  await page.goto(`/loja/${slug}`);
  const titulo = page.getByRole("heading", { level: 1 });
  await expect(titulo).toBeVisible();
  const nome = (await titulo.innerText()).trim();

  const caixa = page.getByRole("button", { name: "Adicionar ao carrinho" });
  await expect(caixa).toBeVisible();

  // O preço de referência é o do banco, e a página tem de mostrar exatamente
  // ele. Conferir aqui evita que um erro de formatação passe despercebido e
  // depois contamine a conta do carrinho, que compara com este mesmo número.
  const precoUnitarioCents = dados.produto.precoCents;
  await expect(page.getByText(emReais(precoUnitarioCents)).first()).toBeVisible();

  for (let i = 1; i < quantidade; i++) {
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  }
  if (quantidade > 1) {
    await expect(page.getByText(String(quantidade), { exact: true }).first()).toBeVisible();
  }

  await caixa.click();
  // a confirmação chega pelo toast; esperar por ele evita seguir antes da
  // Server Action terminar
  await expect(page.getByText(/adicionad/i).first()).toBeVisible();

  return { precoUnitarioCents, nome };
}

/* -------------------------------------------------------------- checkout */

export type DadosCheckout = {
  email: string;
  nome?: string;
  telefone?: string;
  documento?: string;
  criarConta?: { senha: string };
};

/** Avança uma etapa do checkout e confere que a próxima realmente apareceu. */
async function continuar(page: Page, tituloDaProxima: string) {
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: tituloDaProxima })).toBeVisible();
}

/**
 * Percorre as cinco etapas do checkout com Pix e retirada na JB, e devolve o
 * número do pedido criado. Nada de preço é digitado: o total é o que o
 * servidor recalcular.
 */
export async function fecharPedidoComPix(
  page: Page,
  dados: DadosCheckout,
): Promise<{ numero: string; totalCents: number }> {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Fechar pedido", level: 1 })).toBeVisible();

  /* 0. identificação */
  await expect(page.getByRole("heading", { name: "Identificação" })).toBeVisible();
  await page.getByLabel("E-mail").fill(dados.email);

  if (dados.criarConta) {
    await page.getByLabel("Quero criar minha conta na JB").check();
    await page.getByLabel(/^Senha/).fill(dados.criarConta.senha);
  }
  await continuar(page, "Dados do comprador");

  /* 1. comprador */
  await page.getByLabel("Nome completo").fill(dados.nome ?? "Cliente de Teste JB");
  await page.getByLabel("Telefone").fill(dados.telefone ?? TELEFONE_DE_TESTE);
  await page.getByRole("textbox", { name: "CPF" }).fill(dados.documento ?? CPF_DE_TESTE);
  await continuar(page, "Entrega");

  /* 2. entrega — retirada não pede endereço */
  const retirada = page.getByRole("radio", { name: /Retirar na JB/ });
  if (await retirada.count()) {
    await retirada.check();
  } else {
    await page.getByLabel("CEP").fill("01310-100");
    await page.getByLabel("Logradouro").fill("Avenida Paulista");
    await page.getByLabel("Número").fill("1000");
    await page.getByLabel("Bairro").fill("Bela Vista");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("Estado").selectOption("SP");
  }
  await continuar(page, "Pagamento");

  /* 3. pagamento — Pix é a primeira forma e já vem escolhida */
  await expect(page.getByRole("radio", { name: /^Pix/ })).toBeChecked();
  await continuar(page, "Revisão");

  /* 4. revisão */
  const finalizar = page.getByRole("button", { name: /^Confirmar pedido/ });
  await expect(finalizar).toBeVisible();
  const totalCents = emCentavos((await finalizar.innerText()).split("—")[1] ?? "");

  await finalizar.click();
  await page.waitForURL(/\/pedido\/[A-Z0-9-]+$/i, { timeout: 60_000 });

  const numero = decodeURIComponent(new URL(page.url()).pathname.split("/").pop() ?? "");
  expect(numero).not.toBe("");

  return { numero, totalCents };
}

/* ----------------------------------------------------------------- contas */

/** Cria uma conta de cliente pelo formulário público. */
export async function cadastrarCliente(
  page: Page,
  cliente: { nome: string; email: string; senha: string },
) {
  await page.goto("/cadastro");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByLabel("Nome completo").fill(cliente.nome);
  await page.getByLabel("E-mail").fill(cliente.email);
  await page.getByLabel("Telefone com DDD").fill(TELEFONE_DE_TESTE);
  await page.getByRole("textbox", { name: "CPF" }).fill(CPF_DE_TESTE);
  await page.getByLabel(/^Senha/).fill(cliente.senha);
  await page.getByLabel("Repita a senha").fill(cliente.senha);
  await page.getByLabel(/Li e aceito os/).check();

  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/cadastro"), { timeout: 60_000 });
}

export async function entrarComoCliente(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Senha/).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 60_000 });
}

export async function entrarComoEquipe(page: Page) {
  const { staff } = fixtures();
  await page.goto("/admin/entrar");
  await page.getByLabel("E-mail").fill(staff.email);
  await page.getByLabel(/^Senha/).fill(staff.senha);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
  await expect(page).not.toHaveURL(/\/admin\/entrar/);
}
