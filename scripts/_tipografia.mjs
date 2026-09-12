/**
 * Assinatura tipográfica de um conjunto de rotas: quantos elementos visíveis
 * em cada tamanho de fonte. Serve para provar que uma renomeação de classe não
 * mudou nada. TEMPORARIO.
 *   node scripts/_tipografia.mjs > antes.json
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const SESSAO = process.env.SESSAO;
const ROTAS = (
  process.env.ROTAS ||
  "/,/loja,/seminovos,/marcas,/busca?q=autoclave,/comparar,/loja/autoclave-vertical-18l-classe-b,/carrinho,/assistencia-tecnica,/sobre,/faq"
).split(",");
const LARGURAS = (process.env.LARGURAS || "390,1440").split(",").map(Number);

const nav = await chromium.launch();
const assinatura = {};

for (const rota of ROTAS) {
  for (const largura of LARGURAS) {
    const ctx = await nav.newContext({
      viewport: { width: largura, height: largura < 768 ? 780 : 900 },
      isMobile: largura < 768,
      ...(SESSAO && fs.existsSync(SESSAO) ? { storageState: SESSAO } : {}),
    });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      const contagem = await page.evaluate(() => {
        const mapa = {};
        for (const el of document.querySelectorAll("body *")) {
          if (el.children.length > 0) continue;
          const t = (el.textContent || "").trim();
          if (!t) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          const px = Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100;
          mapa[px] = (mapa[px] || 0) + 1;
        }
        return mapa;
      });
      assinatura[`${rota}@${largura}`] = contagem;
    } catch (e) {
      assinatura[`${rota}@${largura}`] = { erro: String(e.message).slice(0, 60) };
    }
    await ctx.close();
  }
}

await nav.close();
console.log(JSON.stringify(assinatura, null, 1));
