/**
 * axe-core na PDP, nas larguras que importam. TEMPORARIO - apagar depois.
 *   node scripts/_axe-pdp.mjs [rota]
 */
import path from "node:path";
import fsSync from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const ROTA = process.argv[2] || "/loja/autoclave-vertical-18l-classe-b";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const LARGURAS = (process.env.LARGURAS || "390,1440").split(",").map(Number);

const nav = await chromium.launch();
let total = 0;

for (const largura of LARGURAS) {
  const comSessao = process.env.SESSAO && fsSync.existsSync(process.env.SESSAO);
  const ctx = await nav.newContext({
    viewport: { width: largura, height: largura < 768 ? 780 : 900 },
    isMobile: largura < 768,
    hasTouch: largura < 768,
    ...(comSessao ? { storageState: process.env.SESSAO } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.addScriptTag({ path: AXE });

  const r = await page.evaluate(async () => {
    // @ts-expect-error axe entra pelo script
    const res = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return res.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      qtd: v.nodes.length,
      alvo: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      resumo: v.help,
    }));
  });

  total += r.length;
  console.log(`--- ${largura}px: ${r.length} violações`);
  for (const v of r) console.log(`    [${v.impacto}] ${v.id} ×${v.qtd} — ${v.resumo}\n      ${v.alvo.join("\n      ")}`);
  await ctx.close();
}

await nav.close();
process.exit(total > 0 ? 1 : 0);
