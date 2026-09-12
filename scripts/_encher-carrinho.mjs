/**
 * Enche o carrinho e guarda o estado da sessão, para poder fotografar
 * carrinho e checkout com conteúdo de verdade. TEMPORARIO.
 *   node scripts/_encher-carrinho.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const PRODUTOS = (
  process.env.PRODUTOS ||
  "/loja/autoclave-vertical-18l-classe-b,/loja/seladora-de-embalagens-30cm,/loja/demo-autoclave-horizontal-21l"
).split(",");

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const rota of PRODUTOS) {
  await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  const botao = page.getByRole("button", { name: /Adicionar ao carrinho/ }).first();
  if ((await botao.count()) === 0) {
    console.log(`${rota}: sem botão de adicionar`);
    continue;
  }
  await botao.click();
  await page.waitForTimeout(2500);
  console.log(`${rota}: adicionado`);
}

await page.goto(BASE + "/carrinho", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
const linhas = await page.locator("main li, main tr, main article").count();
console.log("linhas no carrinho:", linhas);

await ctx.storageState({ path: ".shots/sessao-carrinho.json" });
console.log("sessão salva em .shots/sessao-carrinho.json");
await nav.close();
