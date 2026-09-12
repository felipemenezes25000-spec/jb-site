/** Faz login como cliente demo e guarda a sessão. TEMPORARIO. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const EMAIL = process.env.EMAIL || "demo@jbteste.local";
const SENHA = process.env.SENHA || "demo12345";

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/entrar", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle").catch(() => {});

await page.getByLabel(/E-mail/i).first().fill(EMAIL);
await page.getByLabel(/Senha/i).first().fill(SENHA);
await page.getByRole("button", { name: /Entrar/i }).first().click();
await page.waitForTimeout(3000);

console.log("URL depois do login:", page.url().replace(BASE, ""));
const entrou = !page.url().includes("/entrar");
console.log(entrou ? "sessão aberta" : "NÃO entrou");

if (entrou) {
  await ctx.storageState({ path: ".shots/sessao-cliente.json" });
  console.log("sessão salva em .shots/sessao-cliente.json");
}
await nav.close();
process.exit(entrou ? 0 : 1);
