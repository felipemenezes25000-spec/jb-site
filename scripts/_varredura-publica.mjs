/**
 * Varredura do site público: axe + rolagem horizontal + console, por rota e
 * por largura. TEMPORARIO.
 *   node scripts/_varredura-publica.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const LARGURAS = (process.env.LARGURAS || "390,1440").split(",").map(Number);

const ROTAS = (
  process.env.ROTAS ||
  [
    "/",
    "/loja",
    "/novos",
    "/seminovos",
    "/usados",
    "/recondicionados",
    "/categoria/biosseguranca",
    "/marcas",
    "/busca?q=autoclave",
    "/comparar",
    "/comparar?p=autoclave-vertical-18l-classe-b&p=autoclave-12l-revisada",
    "/loja/autoclave-vertical-18l-classe-b",
    "/carrinho",
    "/assistencia-tecnica",
    "/manutencao-preventiva",
    "/planos-de-manutencao",
    "/servicos",
    "/orcamento",
    "/sobre",
    "/estrutura",
    "/contato",
    "/faq",
    "/central-tecnica",
    "/simulador-de-custo",
    "/pecas-e-acessorios",
    "/trocas-e-devolucoes",
    "/entrar",
    "/cadastro",
  ].join("|")
).split("|");

const nav = await chromium.launch();
let problemas = 0;
const resumo = [];

for (const rota of ROTAS) {
  const linha = { rota, violacoes: 0, rolagem: 0, erros: 0, http: 0, detalhes: [] };

  for (const largura of LARGURAS) {
    const comSessao = process.env.SESSAO && fs.existsSync(process.env.SESSAO);
    const ctx = await nav.newContext({
      viewport: { width: largura, height: largura < 768 ? 780 : 900 },
      isMobile: largura < 768,
      hasTouch: largura < 768,
      ...(comSessao ? { storageState: process.env.SESSAO } : {}),
    });
    const page = await ctx.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 70)));

    try {
      const resposta = await page.goto(BASE + rota, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      linha.http = resposta?.status() ?? 0;
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.addScriptTag({ path: AXE });

      const violacoes = await page.evaluate(async () => {
        const res = await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        return res.violations.map((v) => `${v.impact}:${v.id}×${v.nodes.length}`);
      });

      const rolagem = await page.evaluate(() => {
        const a = scrollX;
        scrollTo(99999, scrollY);
        const d = Math.round(scrollX);
        scrollTo(a, scrollY);
        return d;
      });

      if (violacoes.length) {
        linha.violacoes += violacoes.length;
        linha.detalhes.push(`${largura}px axe: ${violacoes.join(", ")}`);
      }
      if (rolagem > 0) {
        linha.rolagem = Math.max(linha.rolagem, rolagem);
        linha.detalhes.push(`${largura}px rolagem-H ${rolagem}px`);
      }
      if (erros.length) {
        linha.erros += erros.length;
        linha.detalhes.push(`${largura}px js: ${erros[0]}`);
      }
    } catch (e) {
      linha.detalhes.push(`${largura}px ERRO ${String(e.message).slice(0, 50)}`);
      linha.erros++;
    }
    await ctx.close();
  }

  const ruim = linha.violacoes || linha.rolagem || linha.erros;
  if (ruim) problemas++;
  resumo.push(linha);
  console.log(
    `${ruim ? "⚠" : "ok"} ${rota.padEnd(56)} http=${linha.http} axe=${linha.violacoes} rolagemH=${linha.rolagem} js=${linha.erros}`,
  );
  for (const d of linha.detalhes) console.log(`      ${d}`);
}

await nav.close();
console.log(
  problemas === 0
    ? `\nvarredura pública limpa — ${ROTAS.length} rotas × ${LARGURAS.length} larguras`
    : `\n${problemas} de ${ROTAS.length} rotas com problema`,
);
process.exit(problemas > 0 ? 1 : 0);
