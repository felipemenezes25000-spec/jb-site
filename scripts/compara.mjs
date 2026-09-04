/**
 * Compara o site novo com o antigo, lado a lado.
 *   node scripts/compara.mjs
 */
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const NOVO = process.env.NOVO || "http://localhost:60813";
const ANTIGO = process.env.ANTIGO || "http://localhost:8080";
const PAGINAS = [
  { nome: "home", novo: "/", antigo: "/index.php" },
  { nome: "empresa", novo: "/empresa", antigo: "/empresa.php" },
  { nome: "estrutura", novo: "/estrutura", antigo: "/estrutura.php" },
  { nome: "solucoes", novo: "/solucoes", antigo: "/solucoes.php" },
  { nome: "contato", novo: "/contato", antigo: "/contato.php" },
];
const LARGURA = 1280;

fs.mkdirSync(".shots", { recursive: true });
const browser = await chromium.launch();

async function capturar(url, arquivo) {
  const page = await browser.newPage({ viewport: { width: LARGURA, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1400);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.screenshot({ path: arquivo, fullPage: true });
  const alt = await page.evaluate(() => document.body.scrollHeight);
  await page.close();
  return alt;
}

for (const p of PAGINAS) {
  const aNovo = `.shots/_n_${p.nome}.png`;
  const aVelho = `.shots/_v_${p.nome}.png`;
  const hN = await capturar(NOVO + p.novo, aNovo);
  const hV = await capturar(ANTIGO + p.antigo, aVelho);

  const altura = Math.max(hN, hV);
  const fundo = { r: 255, g: 255, b: 255 };
  const rotulo = (texto, cor) =>
    Buffer.from(
      `<svg width="${LARGURA}" height="34"><rect width="100%" height="100%" fill="${cor}"/><text x="14" y="23" font-family="Arial" font-size="15" fill="#fff">${texto}</text></svg>`,
    );

  await sharp({
    create: { width: LARGURA * 2 + 24, height: altura + 34, channels: 3, background: fundo },
  })
    .composite([
      { input: rotulo("ANTIGO — PHP", "#666"), left: 0, top: 0 },
      { input: rotulo("NOVO — Next.js", "#c00"), left: LARGURA + 24, top: 0 },
      { input: await sharp(aVelho).toBuffer(), left: 0, top: 34 },
      { input: await sharp(aNovo).toBuffer(), left: LARGURA + 24, top: 34 },
    ])
    .png()
    .toFile(`.shots/cmp-${p.nome}.png`);

  fs.rmSync(aNovo);
  fs.rmSync(aVelho);
  console.log(`cmp-${p.nome}.png   antigo=${hV}px  novo=${hN}px`);
}

await browser.close();
