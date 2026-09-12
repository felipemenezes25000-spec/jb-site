/** Nenhuma página ficou com imagem quebrada depois da limpeza. TEMPORARIO. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const ROTAS = (process.env.ROTAS || "/,/empresa,/loja,/sobre,/estrutura,/contato,/seminovos,/loja/autoclave-vertical-18l-classe-b").split(",");

const nav = await chromium.launch();
let problemas = 0;

for (const rota of ROTAS) {
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 } });
  const quebradas = [];
  const erros = [];
  page.on("response", (r) => {
    if (r.status() >= 400) quebradas.push(`${r.status()} ${r.url().replace(BASE, "")}`);
  });
  page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 90)));

  let status = "?";
  try {
    const resp = await page.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 60000 });
    status = resp ? resp.status() : "sem resposta";
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(async () => {
      const passo = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += passo) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    await page.waitForTimeout(600);
  } catch (e) {
    status = "ERRO " + String(e.message).slice(0, 60);
  }

  const imgs = await page
    .evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src)
        .slice(0, 5),
    )
    .catch(() => []);

  const ruim = quebradas.length || erros.length || imgs.length || String(status).startsWith("ERRO");
  if (ruim) problemas++;
  console.log(
    `${ruim ? "⚠" : "ok"} ${rota.padEnd(42)} http=${String(status).padEnd(4)} imgs-quebradas=${imgs.length} req4xx=${quebradas.length} jsErr=${erros.length}`,
  );
  if (imgs.length) console.log("      " + imgs.join("\n      "));
  if (quebradas.length) console.log("      " + quebradas.slice(0, 4).join("\n      "));
  if (erros.length) console.log("      " + erros.slice(0, 2).join("\n      "));
  await page.close();
}

await nav.close();
console.log(problemas === 0 ? "\ntudo saudável" : `\n${problemas} rota(s) com problema`);
process.exit(problemas > 0 ? 1 : 0);
