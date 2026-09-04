/**
 * Compara o HTML renderizado de um trecho do site novo com o do antigo.
 *   node scripts/diff-html.mjs
 */
import { chromium } from "playwright";

const NOVO = process.env.NOVO || "http://localhost:60813";
const ANTIGO = process.env.ANTIGO || "http://localhost:8080";

const browser = await chromium.launch();

async function html(url, seletor, antesDeLer) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(900);
  if (antesDeLer) await antesDeLer(page);
  const out = await page.$$eval(seletor, (els) =>
    els.map((el) => el.innerHTML.replace(/\s+/g, " ").trim()),
  );
  await page.close();
  return out;
}

const abrirPrimeiro = async (page) => {
  await page.click(".panel-title a");
  await page.waitForTimeout(600);
};

const casos = [
  { nome: "soluções · corpo dos painéis", sel: ".panel-body", rotaN: "/solucoes", rotaV: "/solucoes.php", antes: abrirPrimeiro },
  { nome: "contato · bloco de endereço", sel: "#about-us .col-sm-6:last-child h3", rotaN: "/contato", rotaV: "/contato.php" },
  { nome: "home · chamadas", sel: "#services .media-body", rotaN: "/", rotaV: "/index.php" },
  { nome: "empresa · texto", sel: "#about-us .col-sm-6:first-child", rotaN: "/empresa", rotaV: "/empresa.php" },
];

for (const caso of casos) {
  const [n, v] = await Promise.all([
    html(NOVO + caso.rotaN, caso.sel, caso.antes),
    html(ANTIGO + caso.rotaV, caso.sel, caso.antes),
  ]);
  const iguais = JSON.stringify(n) === JSON.stringify(v);
  console.log(`${iguais ? "IGUAL  " : "DIFERE "} ${caso.nome}  (${v.length} → ${n.length} blocos)`);
  if (!iguais) {
    for (let i = 0; i < Math.max(n.length, v.length); i++) {
      if (n[i] !== v[i]) {
        console.log(`   [${i}] antigo: ${String(v[i]).slice(0, 220)}`);
        console.log(`   [${i}] novo  : ${String(n[i]).slice(0, 220)}`);
        break;
      }
    }
  }
}

await browser.close();
