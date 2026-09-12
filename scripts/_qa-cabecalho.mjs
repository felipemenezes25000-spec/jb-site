/**
 * O menu do topo: hover, clique, ESC, clique fora, foco e teclado.
 * "Menus NÃO podem ficar presos abertos." TEMPORARIO.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const resultados = [];
const ok = (nome, passou, detalhe = "") =>
  resultados.push({ nome, passou, detalhe: String(detalhe).slice(0, 110) });

const nav = await chromium.launch();
const imprimir = () => {
  let falhas = 0;
  for (const r of resultados) {
    if (!r.passou) falhas++;
    console.log(`${r.passou ? "OK  " : "FALHA"} ${r.nome}${r.detalhe ? "  — " + r.detalhe : ""}`);
  }
  console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
  return falhas;
};
process.on("uncaughtException", (e) => {
  console.log("ERRO:", String(e.message).slice(0, 150).replace(/\s+/g, " "));
  imprimir();
  process.exit(1);
});

const abertos = (page) =>
  page.evaluate(() => document.querySelectorAll("header [aria-expanded='true']").length);

/* ---------------------------------------------------------------- desktop */
{
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/loja", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  ok("estado inicial: nenhum menu aberto", (await abertos(page)) === 0);

  const gatilho = page.getByRole("button", { name: /Manutenção/ }).first();
  await gatilho.hover();
  await page.waitForTimeout(700);
  ok("hover abre o mega menu", (await abertos(page)) === 1, `${await abertos(page)} aberto(s)`);

  await page.mouse.move(700, 700);
  await page.waitForTimeout(900);
  ok("sair com o mouse fecha", (await abertos(page)) === 0, `${await abertos(page)} aberto(s)`);

  // teclado: foco no gatilho e Enter
  await gatilho.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const porTeclado = await abertos(page);
  ok("Enter no gatilho abre", porTeclado === 1, `${porTeclado} aberto(s)`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  ok("ESC fecha", (await abertos(page)) === 0, `${await abertos(page)} aberto(s)`);

  // clique abre e clique fora fecha
  await gatilho.click();
  await page.waitForTimeout(600);
  const porClique = await abertos(page);
  await page.mouse.click(700, 760);
  await page.waitForTimeout(700);
  ok(
    "clique abre e clique fora fecha",
    porClique >= 1 && (await abertos(page)) === 0,
    `abriu=${porClique} depois=${await abertos(page)}`,
  );

  // tabular pelo cabeçalho não deixa nada preso
  await page.evaluate(() => document.querySelector("header a, header button")?.focus());
  for (let i = 0; i < 16; i++) await page.keyboard.press("Tab");
  await page.waitForTimeout(400);
  ok("tabular 16 vezes não prende menu", (await abertos(page)) <= 1, `${await abertos(page)} aberto(s)`);

  // foco visível em todo controle do cabeçalho
  const semFoco = await page.evaluate(() => {
    const alvos = [...document.querySelectorAll("header a[href], header button")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const ruins = [];
    for (const el of alvos) {
      el.focus();
      const s = getComputedStyle(el);
      const temAnel =
        s.outlineWidth !== "0px" ||
        (s.boxShadow && s.boxShadow !== "none") ||
        s.outlineStyle !== "none";
      if (!temAnel) ruins.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 26));
    }
    return ruins;
  });
  ok("todo controle do cabeçalho tem foco visível", semFoco.length === 0, semFoco.slice(0, 4).join(" | "));

  // alvo de toque no rodapé e no cabeçalho
  const pequenos = await page.evaluate(() => {
    const ruins = [];
    for (const el of document.querySelectorAll("header a[href], header button, footer a[href]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 24) ruins.push(((el.textContent || "").trim() || el.tagName).slice(0, 24) + ` ${Math.round(r.height)}px`);
    }
    return ruins;
  });
  ok("nenhum alvo com menos de 24px de altura", pequenos.length === 0, pequenos.slice(0, 4).join(" | "));

  await ctx.close();
}

/* ----------------------------------------------------------------- mobile */
{
  const ctx = await nav.newContext({
    viewport: { width: 390, height: 780 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/loja", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  const menu = page.getByRole("button", { name: /Abrir o menu/i }).first();
  ok("celular: botão de menu existe", (await menu.count()) > 0);
  await menu.click();
  await page.waitForTimeout(700);
  const painel = page.locator("[role=dialog], nav[aria-label*=celular i]").first();
  const abriu = await painel.isVisible().catch(() => false);
  ok("celular: menu abre", abriu);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const fechou = !(await painel.isVisible().catch(() => false));
  ok("celular: ESC fecha o menu", fechou);

  await ctx.close();
}

await nav.close();
process.exit(imprimir() > 0 ? 1 : 0);
