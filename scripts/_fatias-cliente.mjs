/** Fatias de uma rota da Área da Clínica, com a sessão salva. TEMPORARIO.
 *   node scripts/_fatias-cliente.mjs <rota> <nome> [largura] [maxFatias]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [rota = "/minha-jb", nome = "conta", larguraArg = "1440", maxArg = "4"] =
  process.argv.slice(2);
const largura = Number(larguraArg);
const max = Number(maxArg);
const BASE = process.env.BASE_URL || "http://localhost:52758";
const saida = process.env.SAIDA || path.join(process.cwd(), ".shots", "conta");
fs.mkdirSync(saida, { recursive: true });

const altura = largura >= 1024 ? 900 : 780;
const nav = await chromium.launch();
const ctx = await nav.newContext({
  viewport: { width: largura, height: altura },
  isMobile: largura < 768,
  hasTouch: largura < 768,
  storageState: ".shots/sessao-cliente.json",
});
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 80)));
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForLoadState("networkidle").catch(() => {});
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await page.waitForTimeout(700);

const alturaPagina = await page.evaluate(() => document.body.scrollHeight);
const fatias = Math.min(max, Math.max(1, Math.ceil(alturaPagina / altura)));
for (let i = 0; i < fatias; i++) {
  await page.evaluate((y) => scrollTo(0, y), i * altura);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(saida, `${nome}-${largura}-${String(i + 1).padStart(2, "0")}.png`),
  });
}

const overflowX = await page.evaluate(() => {
  const a = scrollX;
  scrollTo(99999, scrollY);
  const d = Math.round(scrollX);
  scrollTo(a, scrollY);
  return d;
});

console.log(JSON.stringify({ rota, largura, altura: alturaPagina, fatias, overflowX, erros }));
await nav.close();
