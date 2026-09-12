/** Varredura: várias fichas × várias larguras, medindo o essencial. TEMPORARIO. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const ROTAS = (
  process.env.ROTAS ||
  "/loja/autoclave-vertical-18l-classe-b,/loja/motor-de-implante-35ncm,/loja/autoclave-12l-revisada,/loja/e2e-equipamento-com-frete,/loja/demo-autoclave-horizontal-21l"
).split(",");
const LARGURAS = (process.env.LARGURAS || "320,390,768,1024,1440,1920").split(",").map(Number);

const nav = await chromium.launch();
let problemas = 0;

for (const rota of ROTAS) {
  const linhas = [];
  for (const largura of LARGURAS) {
    const ctx = await nav.newContext({
      viewport: { width: largura, height: largura < 768 ? 780 : 900 },
      isMobile: largura < 768,
      hasTouch: largura < 768,
    });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 80)));
    await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

    const m = await page.evaluate(() => {
      const px = (v) => Math.round(parseFloat(v) || 0);
      const y = (s) => {
        const e = document.querySelector(s);
        return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
      };
      const h2 = [...document.querySelectorAll("main h2")].filter((e) => e.offsetParent !== null);
      const containers = [
        ...new Set(
          [...document.querySelectorAll("main .container-jb")]
            .filter((e) => e.offsetParent !== null)
            .map((e) => Math.round(e.getBoundingClientRect().width)),
        ),
      ];
      const rolagemX = (() => {
        const a = scrollX;
        scrollTo(99999, scrollY);
        const d = Math.round(scrollX);
        scrollTo(a, scrollY);
        return d;
      })();
      return {
        pagina: document.body.scrollHeight,
        containers,
        h2: [...new Set(h2.map((e) => px(getComputedStyle(e).fontSize)))].sort((a, b) => a - b),
        h1: px(getComputedStyle(document.querySelector("h1")).fontSize),
        ordem: { h1: y("h1"), gal: y("[data-pdp-gallery]"), buy: y("[data-pdp-buybox]"), det: y("[data-pdp-details]") },
        vendedor: !!document.body.innerText.match(/Vendido e entregue por/),
        rolagemX,
      };
    });

    const problema = [];
    if (m.rolagemX > 0) problema.push(`rolagem-H=${m.rolagemX}`);
    if (m.containers.length > 1) problema.push(`containers=${m.containers}`);
    if (m.h2.length > 1) problema.push(`h2=${m.h2}`);
    if (!m.vendedor) problema.push("sem-vendedor");
    if (largura < 768 && m.ordem.gal !== null && m.ordem.buy !== null && m.ordem.gal > m.ordem.buy)
      problema.push("foto-depois-da-compra");
    if (erros.length) problema.push(`js=${erros[0]}`);
    if (problema.length) problemas++;

    linhas.push(
      `  ${String(largura).padStart(4)}  pag=${String(m.pagina).padStart(5)}  cont=${m.containers}  h1=${m.h1}  h2=${JSON.stringify(m.h2)}  ${problema.length ? "⚠ " + problema.join(" ") : "ok"}`,
    );
    await ctx.close();
  }
  console.log(rota);
  console.log(linhas.join("\n"));
}

await nav.close();
console.log(problemas === 0 ? "\nvarredura limpa" : `\n${problemas} combinações com problema`);
process.exit(problemas > 0 ? 1 : 0);
