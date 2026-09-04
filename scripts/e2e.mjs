/**
 * Prova que o painel manda no site e que o formulário grava cadastro.
 *   node scripts/e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL || "comercial@jbsolucoesodontologicas.com.br";
const SENHA = process.env.ADMIN_PASSWORD || "";
// permite testar um domínio cujo DNS local ainda não propagou:
//   HOST_RULES="MAP www.exemplo.com.br 76.76.21.241" node scripts/e2e.mjs
const HOST_RULES = process.env.HOST_RULES;
const browser = await chromium.launch(
  HOST_RULES ? { args: [`--host-resolver-rules=${HOST_RULES}`] } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let falhas = 0;

const checar = (nome, ok, detalhe = "") => {
  console.log(`${ok ? "OK    " : "FALHOU"} ${nome}${detalhe ? `  — ${detalhe}` : ""}`);
  if (!ok) falhas++;
};

/* ---------- 1. login ---------- */
const admin = await ctx.newPage();
await admin.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await admin.fill("#campo-email", EMAIL);
await admin.fill("#campo-senha", SENHA);
await admin.click('button:has-text("Entrar")');
await admin.waitForURL(/\/admin$/, { timeout: 20000 });
checar("login no painel", true);

/* ---------- 2. senha errada é recusada ---------- */
const intruso = await (await browser.newContext()).newPage();
await intruso.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await intruso.fill("#campo-email", EMAIL);
await intruso.fill("#campo-senha", "senha-errada");
await intruso.click('button:has-text("Entrar")');
await intruso.waitForTimeout(1500);
checar("senha errada é recusada", intruso.url().includes("/admin/login"));

/* ---------- 3. painel exige sessão ---------- */
const anonimo = await (await browser.newContext()).newPage();
await anonimo.goto(`${BASE}/admin/configuracoes`, { waitUntil: "domcontentloaded" });
await anonimo.waitForTimeout(800);
checar("sem sessão o painel manda para o login", anonimo.url().includes("/admin/login"));

/* ---------- 4. editar no painel muda o site ---------- */
const marca = `verificado-${Date.now()}`;
await admin.goto(`${BASE}/admin/paginas/empresa`, { waitUntil: "domcontentloaded" });
const original = await admin.inputValue("#campo-lead");
await admin.fill("#campo-lead", marca);
await admin.click('button:has-text("Salvar página")');
await admin.waitForTimeout(2500);

const site = await ctx.newPage();
await site.goto(`${BASE}/empresa`, { waitUntil: "domcontentloaded" });
const textoNoSite = await site.textContent("#title p");
checar("edição do painel aparece no site", textoNoSite?.trim() === marca, textoNoSite ?? "");

// devolve o texto original
await admin.goto(`${BASE}/admin/paginas/empresa`, { waitUntil: "domcontentloaded" });
await admin.fill("#campo-lead", original);
await admin.click('button:has-text("Salvar página")');
await admin.waitForTimeout(2000);
await site.goto(`${BASE}/empresa`, { waitUntil: "domcontentloaded" });
checar("texto original restaurado", (await site.textContent("#title p"))?.trim() === original);

/* ---------- 5. formulário de contato grava cadastro ---------- */
const visitante = await (await browser.newContext()).newPage();
await visitante.goto(`${BASE}/contato`, { waitUntil: "domcontentloaded" });
await visitante.waitForTimeout(600);

const codigo = await visitante.evaluate(async () => {
  const svg = await (await fetch("/api/captcha?rand=teste")).text();
  return [...svg.matchAll(/<text[^>]*>([^<])<\/text>/g)].map((m) => m[1]).join("");
});
const nomeTeste = `Teste automático ${Date.now()}`;
await visitante.fill("#nome", nomeTeste);
await visitante.fill("#email", "teste@example.com");
await visitante.fill("#telefone", "(11) 90000-0000");
await visitante.fill("#cidade", "São Paulo");
await visitante.selectOption('select[name="estado"]', "SP");
await visitante.fill("#obs", "Mensagem enviada pelo teste automático.");
await visitante.fill('input[name="captcha"]', codigo);
await visitante.click('input[type="submit"]');
await visitante.waitForTimeout(2500);
const sucesso = await visitante.textContent(".mensagem").catch(() => null);
checar("formulário aceita e confirma", Boolean(sucesso?.includes("sucesso")), sucesso ?? "sem confirmação");

/* ---------- 6. captcha errado é recusado ---------- */
const robo = await (await browser.newContext()).newPage();
await robo.goto(`${BASE}/contato`, { waitUntil: "domcontentloaded" });
await robo.waitForTimeout(700);
await robo.fill("#nome", "Robô");
await robo.fill("#email", "robo@example.com");
await robo.fill("#telefone", "(11) 90000-0000");
await robo.fill("#obs", "Mensagem de teste com captcha errado.");
await robo.fill('input[name="captcha"]', "XXXXX");
await robo.click('input[type="submit"]');
await robo.waitForTimeout(3000);
const recusa = await robo.textContent('p[role="alert"]').catch(() => null);
checar("captcha errado é recusado", Boolean(recusa?.includes("verificação")), recusa ?? "sem alerta");

/* ---------- 7. cadastro aparece no painel ---------- */
await admin.goto(`${BASE}/admin/cadastros`, { waitUntil: "domcontentloaded" });
const conteudo = await admin.textContent("body");
checar("cadastro aparece no painel", Boolean(conteudo?.includes(nomeTeste)));

await browser.close();
console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
