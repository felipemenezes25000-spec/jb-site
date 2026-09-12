/**
 * O que cada rota realmente baixa: peso por tipo, imagens mais pesadas,
 * imagens servidas maiores do que aparecem e o elemento de LCP. TEMPORARIO.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const ROTAS = (process.env.ROTAS || "/,/loja,/loja/autoclave-vertical-18l-classe-b,/seminovos").split(",");
const largura = Number(process.env.LARGURA || 1440);

const nav = await chromium.launch();

for (const rota of ROTAS) {
  const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
  const page = await ctx.newPage();
  const recursos = [];

  page.on("response", async (r) => {
    try {
      const tipo = (r.headers()["content-type"] || "").split(";")[0];
      const tamanho = Number(r.headers()["content-length"] || 0);
      recursos.push({ url: r.url(), tipo, tamanho, status: r.status() });
    } catch {
      /* ignora */
    }
  });

  await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);

  const porTipo = new Map();
  for (const r of recursos) {
    const familia = r.tipo.startsWith("image/")
      ? "imagem"
      : r.tipo.includes("javascript")
        ? "js"
        : r.tipo.includes("css")
          ? "css"
          : r.tipo.includes("font")
            ? "fonte"
            : r.tipo.includes("html")
              ? "html"
              : "outro";
    const atual = porTipo.get(familia) ?? { n: 0, bytes: 0 };
    atual.n++;
    atual.bytes += r.tamanho;
    porTipo.set(familia, atual);
  }

  // imagens servidas com resolução muito acima do espaço em que aparecem
  const exageradas = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((i) => i.naturalWidth > 0)
      .map((i) => ({
        w: Math.round(i.getBoundingClientRect().width),
        natural: i.naturalWidth,
        src: (i.currentSrc || i.src).slice(-60),
      }))
      .filter((i) => i.w > 0 && i.natural > i.w * 2.2)
      .slice(0, 5),
  );

  const lcp = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let melhor = null;
        try {
          new PerformanceObserver((lista) => {
            for (const e of lista.getEntries()) melhor = e;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          /* sem suporte */
        }
        setTimeout(() => {
          if (!melhor) return resolve(null);
          const el = melhor.element;
          resolve({
            ms: Math.round(melhor.startTime),
            alvo: el ? el.tagName + (el.getAttribute("src") ? " " + el.getAttribute("src").slice(-40) : "") : "?",
          });
        }, 900);
      }),
  );

  const kb = (b) => (b / 1024).toFixed(0) + "kB";
  const partes = [...porTipo.entries()]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .map(([f, d]) => `${f} ${d.n}×${kb(d.bytes)}`)
    .join("  ");

  console.log(`\n${rota}`);
  console.log(`  ${partes}`);
  if (lcp) console.log(`  LCP ~${lcp.ms}ms  ${lcp.alvo}`);
  if (exageradas.length) {
    console.log(`  imagens servidas grandes demais:`);
    for (const i of exageradas) console.log(`    ${i.natural}px natural para ${i.w}px de espaço — ${i.src}`);
  }
  await ctx.close();
}

await nav.close();
