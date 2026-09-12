/**
 * Percorre o checkout inteiro, passo a passo, fotografando cada etapa.
 * Ambiente de demonstração (PAYMENT_PROVIDER=mock): nenhuma cobrança real.
 * TEMPORARIO.
 *   node scripts/_fluxo-checkout.mjs [largura]
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const largura = Number(process.argv[2] || 1440);
const saida = ".shots/fluxo";
fs.mkdirSync(saida, { recursive: true });

const carimbo = Date.now().toString().slice(-6);
const CLIENTE = {
  email: `qa.checkout.${carimbo}@jbteste.local`,
  senha: "qa-checkout-12345",
  nome: "Clínica QA Checkout",
  cpf: "39053344705",
  telefone: "11987654321",
  cep: "01310100",
  numero: "1000",
};

const nav = await chromium.launch();
const ctx = await nav.newContext({
  viewport: { width: largura, height: largura < 768 ? 780 : 900 },
  isMobile: largura < 768,
  hasTouch: largura < 768,
  storageState: ".shots/sessao-carrinho.json",
});
const page = await ctx.newPage();
const erros = [];
const quebradas = [];
page.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 130)));
page.on("pageerror", (e) => erros.push("pageerror: " + String(e.message).slice(0, 130)));
page.on("response", (r) => r.status() >= 400 && quebradas.push(`${r.status()} ${r.url().replace(BASE, "")}`));

await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForLoadState("networkidle").catch(() => {});
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

const etapaAtual = async () => {
  const t = await page.locator("main").last().innerText().catch(() => "");
  const m = t.match(/ETAPA (\d) DE 5/i);
  if (m) return m[1];
  const ativo = await page
    .locator("[aria-current='step'], [aria-current='true']")
    .first()
    .innerText()
    .catch(() => "");
  return ativo.replace(/\s+/g, " ").slice(0, 24) || "?";
};

const foto = async (nome) => {
  await page.waitForTimeout(700);
  const limpo = String(nome).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60);
  await page.screenshot({ path: `${saida}/${largura}-${limpo}.png` });
};

const preencher = async (rotulo, valor) => {
  const todos = page.getByLabel(rotulo, { exact: false });
  const quantos = await todos.count();
  for (let i = 0; i < quantos; i++) {
    const campo = todos.nth(i);
    // "CPF" também casa com o rádio de tipo de pessoa; só serve campo de texto
    const tipo = await campo.evaluate(
      (e) => (e.tagName === "INPUT" ? e.type : e.tagName.toLowerCase()),
    ).catch(() => "");
    if (["radio", "checkbox", "button", "submit", "select"].includes(tipo)) continue;
    if (!(await campo.isVisible().catch(() => false))) continue;
    if (!(await campo.isEditable().catch(() => false))) continue;
    await campo.fill(valor);
    return true;
  }
  return false;
};

const continuar = async () => {
  const botao = page
    .getByRole("button", { name: /^(Continuar|Ir para|Avançar|Revisar|Confirmar pedido|Pagar)/ })
    .first();
  if ((await botao.count()) === 0) return false;
  await botao.scrollIntoViewIfNeeded();
  await botao.click();
  await page.waitForTimeout(2600);
  return true;
};

const registro = [];
for (let volta = 1; volta <= 8; volta++) {
  const antes = await etapaAtual();
  await foto(`${volta}-etapa${antes}`);

  // preenche o que estiver visível nesta etapa
  const preenchidos = [];
  for (const [rotulo, valor] of [
    ["E-mail", CLIENTE.email],
    ["Crie uma senha", CLIENTE.senha],
    ["Nome completo", CLIENTE.nome],
    ["CPF", CLIENTE.cpf],
    ["Telefone", CLIENTE.telefone],
    ["CEP", CLIENTE.cep],
    ["Número", CLIENTE.numero],
  ]) {
    if (await preencher(rotulo, valor)) preenchidos.push(rotulo);
  }
  if (preenchidos.length) await page.waitForTimeout(1800);

  const avancou = await continuar();
  const depois = await etapaAtual();
  registro.push({ volta, antes, depois, preenchidos, avancou });
  console.log(
    `volta ${volta}: etapa ${antes} → ${depois}  ${avancou ? "" : "(sem botão de avanço) "}${preenchidos.length ? "preencheu: " + preenchidos.join(", ") : ""}`,
  );

  if (!avancou || antes === depois) {
    const alerta = await page
      .locator("[role='alert'], [aria-live]")
      .allInnerTexts()
      .catch(() => []);
    const texto = alerta.join(" | ").replace(/\s+/g, " ").trim();
    if (texto) console.log(`   parou em: ${texto.slice(0, 200)}`);
    if (antes === depois && !texto) console.log("   parou sem mensagem visível");
    break;
  }
  if (/^5/.test(depois)) {
    await foto(`${volta + 1}-etapa5-revisao`);
    break;
  }
}

await page.waitForTimeout(1800);
console.log("\nURL final:", page.url().replace(BASE, ""));
console.log("landmarks <main> na página:", await page.locator("main").count());
console.log("erros de console:", erros.length ? erros.slice(0, 3).join(" | ") : "nenhum");
console.log("requisições 4xx/5xx:", quebradas.length ? quebradas.slice(0, 5).join(" | ") : "nenhuma");
await nav.close();
