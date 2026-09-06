/**
 * Igual a scripts/fatias.mjs, mas entra antes: captura rota de sessão em fatias
 * do tamanho da janela, para leitura visual.
 *
 *   node scripts/fatias-conta.mjs <rota> <nome> [largura] [maxFatias] [--admin]
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const [rota = "/minha-jb", nome = "conta", larguraArg = "1440", maxArg = "6"] =
  process.argv.slice(2);
const admin = process.argv.includes("--admin");
const largura = Number(larguraArg);
const max = Number(maxArg);
const base = process.env.BASE_URL || "http://localhost:3000";
const saida = process.env.SAIDA || path.join(process.cwd(), ".shots", "fatias");

const CLIENTE = { email: "demo@jbteste.local", senha: "demo12345" };
const EQUIPE = { email: "demo.gestor@jbteste.local", senha: "demo12345" };

fs.mkdirSync(saida, { recursive: true });

const altura = largura >= 1024 ? 900 : 780;
const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: largura, height: altura },
  deviceScaleFactor: 1,
  isMobile: largura < 768,
  hasTouch: largura < 768,
  reducedMotion: "reduce",
});

const login = admin ? EQUIPE : CLIENTE;
const rotaLogin = admin ? "/admin/entrar" : "/entrar";

const p = await contexto.newPage();
await p.goto(base + rotaLogin, { waitUntil: "domcontentloaded", timeout: 90000 });
await p.getByLabel(/e-?mail/i).first().fill(login.email, { timeout: 15000 });
await p.getByLabel(/senha/i).first().fill(login.senha, { timeout: 15000 });
await Promise.all([
  p.waitForLoadState("networkidle").catch(() => {}),
  p.getByRole("button", { name: /entrar|acessar/i }).first().click(),
]);
await p.waitForTimeout(1500);

const pagina = await contexto.newPage();
await pagina.goto(base + rota, { waitUntil: "domcontentloaded", timeout: 90000 });
await pagina.waitForLoadState("networkidle").catch(() => {});
await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });

await pagina.evaluate(async () => {
  const passo = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += passo) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 110));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
});

const total = await pagina.evaluate(() => document.documentElement.scrollHeight);
const medida = await pagina.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  url: location.pathname,
}));

const fatias = Math.min(max, Math.ceil(total / altura));
for (let i = 0; i < fatias; i++) {
  await pagina.evaluate((y) => window.scrollTo(0, y), i * altura);
  await pagina.waitForTimeout(320);
  await pagina.screenshot({
    path: path.join(saida, `${nome}-${largura}-${String(i + 1).padStart(2, "0")}.png`),
  });
}

console.log(
  JSON.stringify({
    rota,
    largura,
    altura: total,
    fatias,
    overflowX: medida.scrollW > medida.clientW,
    ...medida,
  }),
);
await navegador.close();
