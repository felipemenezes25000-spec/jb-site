/**
 * Entra no painel e fotografa as telas.
 *   node scripts/shot-admin.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:60813";
const TELAS = [
  { nome: "admin-login", rota: "/admin/login", semLogin: true },
  { nome: "admin-painel", rota: "/admin" },
  { nome: "admin-paginas", rota: "/admin/paginas" },
  { nome: "admin-pagina-empresa", rota: "/admin/paginas/empresa" },
  { nome: "admin-solucoes", rota: "/admin/solucoes" },
  { nome: "admin-solucao", rota: "/admin/solucoes/bioseguranca" },
  { nome: "admin-banners", rota: "/admin/banners" },
  { nome: "admin-home", rota: "/admin/home" },
  { nome: "admin-cadastros", rota: "/admin/cadastros" },
  { nome: "admin-midia", rota: "/admin/midia" },
  { nome: "admin-config", rota: "/admin/configuracoes" },
  { nome: "admin-usuarios", rota: "/admin/usuarios" },
];

fs.mkdirSync(".shots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// login
const login = await ctx.newPage();
await login.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await login.fill("#campo-email", process.env.ADMIN_EMAIL || "comercial@jbsolucoesodontologicas.com.br");
await login.fill("#campo-senha", process.env.ADMIN_PASSWORD || "");
await login.click('button:has-text("Entrar")');
await login.waitForURL(/\/admin$/, { timeout: 20000 });
console.log("login OK →", login.url());
await login.close();

for (const tela of TELAS) {
  const page = tela.semLogin
    ? await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    : await ctx.newPage();
  const resposta = await page.goto(BASE + tela.rota, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(900);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.screenshot({ path: `.shots/${tela.nome}.png`, fullPage: true });
  console.log(`${tela.nome.padEnd(24)} ${resposta?.status()}  ${page.url().replace(BASE, "")}`);
  await page.close();
}

await browser.close();
