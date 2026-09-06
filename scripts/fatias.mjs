/**
 * Captura uma rota em fatias do tamanho da janela, para leitura visual.
 *   node scripts/fatias.mjs <rota> <nome> [largura] [maxFatias]
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const [rota = "/", nome = "pagina", larguraArg = "1440", maxArg = "8"] = process.argv.slice(2);
const largura = Number(larguraArg);
const max = Number(maxArg);
const base = process.env.BASE_URL || "http://localhost:3000";
const saida = process.env.SAIDA || path.join(process.cwd(), ".shots", "fatias");

fs.mkdirSync(saida, { recursive: true });

const altura = largura >= 1024 ? 900 : 780;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: largura, height: altura },
  deviceScaleFactor: 1,
  isMobile: largura < 768,
  hasTouch: largura < 768,
});
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(base + rota, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForLoadState("networkidle").catch(() => {});
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

await page.evaluate(async () => {
  const passo = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += passo) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 110));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
});

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));

const fatias = Math.min(max, Math.ceil(total / altura));
for (let i = 0; i < fatias; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * altura);
  await page.waitForTimeout(320);
  await page.screenshot({ path: path.join(saida, `${nome}-${largura}-${String(i + 1).padStart(2, "0")}.png`) });
}

console.log(
  JSON.stringify({ rota, largura, altura: total, fatias, overflowX: overflow.scrollW > overflow.clientW, ...overflow }),
);
await browser.close();
