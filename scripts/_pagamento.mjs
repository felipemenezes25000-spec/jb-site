/**
 * Percorre o checkout até o fim pagando com CARTÃO e fotografa o desfecho.
 * O provedor `mock` decide pelo valor: 01 recusado, 02 em análise, resto
 * aprovado. Nenhuma cobrança real. TEMPORARIO.
 *   node scripts/_pagamento.mjs <rotulo>
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const rotulo = process.argv[2] || "desfecho";
const saida = ".shots/pagamento";
fs.mkdirSync(saida, { recursive: true });

const carimbo = Date.now().toString().slice(-6);
const CLIENTE = {
  email: `qa.pgto.${carimbo}@jbteste.local`,
  senha: "qa-pagamento-12345",
  nome: "Clínica QA Pagamento",
  cpf: "39053344705",
  telefone: "11987654321",
};

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 90)));

// carrinho com o produto de teste
await page.goto(BASE + "/loja/e2e-equipamento-com-frete", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle").catch(() => {});
await page.getByRole("button", { name: /Adicionar ao carrinho/ }).first().click();
await page.waitForTimeout(2500);

await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

const preencher = async (rot, valor) => {
  const todos = page.getByLabel(rot, { exact: false });
  for (let i = 0; i < (await todos.count()); i++) {
    const campo = todos.nth(i);
    const tipo = await campo.evaluate((e) => (e.tagName === "INPUT" ? e.type : e.tagName.toLowerCase())).catch(() => "");
    if (["radio", "checkbox", "button", "submit", "select"].includes(tipo)) continue;
    if (!(await campo.isVisible().catch(() => false))) continue;
    if (!(await campo.isEditable().catch(() => false))) continue;
    await campo.fill(valor);
    return true;
  }
  return false;
};

const avancar = async () => {
  const b = page.getByRole("button", { name: /^(Continuar|Confirmar pedido|Pagar|Revisar)/ }).first();
  if ((await b.count()) === 0) return false;
  await b.scrollIntoViewIfNeeded();
  await b.click();
  await page.waitForTimeout(2800);
  return true;
};

for (let volta = 1; volta <= 7; volta++) {
  for (const [rot, valor] of [
    ["E-mail", CLIENTE.email],
    ["Crie uma senha", CLIENTE.senha],
    ["Nome completo", CLIENTE.nome],
    ["CPF", CLIENTE.cpf],
    ["Telefone", CLIENTE.telefone],
  ]) {
    await preencher(rot, valor);
  }

  // na etapa de pagamento, escolhe cartão
  const cartao = page.getByText("Cartão de crédito", { exact: false }).first();
  if ((await cartao.count()) > 0 && (await cartao.isVisible().catch(() => false))) {
    await cartao.click();
    await page.waitForTimeout(1200);
  }

  await page.waitForTimeout(600);
  if (!(await avancar())) break;
  if (/pedido|obrigado|confirma/i.test(page.url())) break;
}

await page.waitForTimeout(2500);
const texto = (await page.locator("body").innerText()).replace(/\s+/g, " ");
const achado = texto.match(
  /(recusad[oa][^.]{0,90}|em an[áa]lise[^.]{0,90}|aprovad[oa][^.]{0,90}|aguardando pagamento[^.]{0,70}|tentar novamente[^.]{0,60})/i,
);

console.log(`${rotulo}: URL ${page.url().replace(BASE, "")}`);
console.log(`  na tela: ${achado ? achado[0].slice(0, 120) : "(nenhum termo de desfecho encontrado)"}`);
console.log(`  erros: ${erros.length ? erros[0] : "nenhum"}`);
await page.screenshot({ path: `${saida}/${rotulo}.png` });
await nav.close();
