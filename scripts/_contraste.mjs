/** Detalha as falhas de contraste de uma rota autenticada. TEMPORARIO. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const ROTAS = (process.env.ROTAS || "/minha-jb/manutencoes,/minha-jb/pedidos").split(",");
const SESSAO = process.env.SESSAO || ".shots/sessao-cliente.json";

const nav = await chromium.launch();
const vistos = new Map();

for (const rota of ROTAS) {
  const ctx = await nav.newContext({
    viewport: { width: 1440, height: 900 },
    ...(fs.existsSync(SESSAO) ? { storageState: SESSAO } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.addScriptTag({ path: AXE });

  const detalhes = await page.evaluate(async () => {
    const res = await window.axe.run(document, {
      runOnly: { type: "rule", values: ["color-contrast", "definition-list"] },
    });
    return res.violations.flatMap((v) =>
      v.nodes.map((n) => ({
        regra: v.id,
        alvo: n.target.join(" "),
        html: (n.html || "").slice(0, 110),
        motivo: (n.any?.[0]?.message || n.all?.[0]?.message || "").slice(0, 130),
        dados: n.any?.[0]?.data
          ? `fg=${n.any[0].data.fgColor} bg=${n.any[0].data.bgColor} ratio=${n.any[0].data.contrastRatio} exigido=${n.any[0].data.expectedContrastRatio}`
          : "",
      })),
    );
  });

  console.log(`\n### ${rota} — ${detalhes.length}`);
  for (const d of detalhes) {
    const chave = `${d.regra}|${d.dados}|${d.html.slice(0, 50)}`;
    vistos.set(chave, (vistos.get(chave) ?? 0) + 1);
    console.log(`  [${d.regra}] ${d.dados}`);
    console.log(`     ${d.html}`);
  }
  await ctx.close();
}

console.log("\n=== agrupado ===");
for (const [chave, n] of [...vistos.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}×  ${chave.slice(0, 150)}`);
}
await nav.close();
