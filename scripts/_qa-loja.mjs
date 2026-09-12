/**
 * QA funcional do catálogo. TEMPORARIO.
 *   node scripts/_qa-loja.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:52758";
const ROTA = process.env.ROTA || "/loja";

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
  console.log("ERRO NO ROTEIRO:", String(e.message).slice(0, 160).replace(/\s+/g, " "));
  imprimir();
  process.exit(1);
});

/* ---------------------------------------------------------------- desktop */
{
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const erros = [];
  const quebradas = [];
  page.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 120)));
  page.on("pageerror", (e) => erros.push("pageerror: " + String(e.message).slice(0, 120)));
  page.on("response", (r) => r.status() >= 400 && quebradas.push(`${r.status()} ${r.url().slice(-60)}`));

  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  // 1. a lateral aparece e o botão de filtros some
  const lateral = page.getByRole("heading", { name: /^Filtros/ });
  ok("desktop: painel lateral visível", await lateral.isVisible());
  ok(
    "desktop: botão de filtros escondido",
    (await page.getByRole("button", { name: "Abrir filtros" }).count()) === 0 ||
      !(await page.getByRole("button", { name: "Abrir filtros" }).isVisible()),
  );

  // 2. a lateral não entra por baixo do cabeçalho enquanto a grade está à vista.
  // A rolagem é relativa à grade: numa coleção curta (/seminovos tem 3 itens) a
  // seção acaba antes de 1400px, o `sticky` solta — corretamente — e um número
  // fixo acusaria defeito onde não há.
  // Rola até a metade do curso que o `sticky` realmente tem: enquanto o painel
  // couber dentro do que sobra do pai, ele fica preso em `top`; passando disso
  // ele se solta e sobe junto com a página, que é o comportamento correto.
  const curso = await page.evaluate(() => {
    const painel = document.querySelector("[data-painel-filtros]");
    const pai = painel?.parentElement;
    if (!painel || !pai) return 0;
    const alturaPai = pai.getBoundingClientRect().height;
    const alturaPainel = painel.getBoundingClientRect().height;
    const disponivel = alturaPai - alturaPainel;
    if (disponivel <= 40) return 0;
    const topoPai = pai.getBoundingClientRect().top + scrollY;
    scrollTo(0, topoPai + disponivel / 2);
    return Math.round(disponivel);
  });
  await page.waitForTimeout(600);
  const posicao = await page.evaluate(() => {
    const cab = document.querySelector("header").getBoundingClientRect().bottom;
    const alvo = [...document.querySelectorAll("h2")].find((h) => /^Filtros/.test(h.textContent || ""));
    const painel = document.querySelector("[data-painel-filtros]");
    const grade = document.querySelector("[data-grade-marketplace]");
    return {
      cabecalho: Math.round(cab),
      filtros: Math.round(alvo.getBoundingClientRect().top),
      // Só há o que grudar quando a grade é mais alta que a lateral. Numa
      // coleção de 3 ou 4 itens a lateral preenche a célula inteira do grid e
      // rola junto com a página — comportamento certo do `sticky`, não defeito.
      alturaPainel: painel ? Math.round(painel.getBoundingClientRect().height) : 0,
      alturaGrade: grade ? Math.round(grade.getBoundingClientRect().height) : 0,
    };
  });
  if (curso > 0 && posicao.alturaGrade > 0) {
    ok(
      "desktop: 'Filtros' não some atrás do cabeçalho",
      posicao.filtros >= posicao.cabecalho - 1,
      JSON.stringify({ ...posicao, curso }),
    );
  } else {
    ok(
      "desktop: sticky sem curso (coleção curta ou vazia)",
      true,
      `grade=${posicao.alturaGrade}px lateral=${posicao.alturaPainel}px`,
    );
  }

  // 3. marcar uma categoria filtra
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  const antes = Number((await page.locator("body").innerText()).match(/(\d+)\s+it(?:em|ens)/)?.[1] ?? 0);
  // dentro do painel lateral, e nao o chip de atalho do cabecalho (que leva
  // para /categoria/... e e outra pagina)
  const painel = page.locator("[data-painel-filtros]");
  // Em /categoria/... a categoria é o escopo da página e some da lateral
  // (`travarCategoria`), então o alvo é o primeiro filtro que existir ali.
  const vazia = antes === 0;
  const opcao = painel.locator("a[href*='?']").first();
  const rotuloOpcao = (await opcao.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  await opcao.click();
  await page.waitForTimeout(1600);
  const depois = Number((await page.locator("body").innerText()).match(/(\d+)\s+it(?:em|ens)/)?.[1] ?? 0);
  ok(
    vazia ? "desktop: coleção vazia, sem o que filtrar" : "desktop: filtro da lateral reduz a lista",
    vazia ? true : depois > 0 && depois < antes,
    `${rotuloOpcao}: ${antes} → ${depois}`,
  );
  ok("desktop: filtro entra na URL", /[?&](categoria|marca|voltagem|estoque|condicao|preco)/.test(page.url()), page.url().slice(-60));

  // 4. ficha do filtro aplicado aparece e limpa
  const limpar = page.getByRole("link", { name: /^Limpar$/ }).first();
  ok("desktop: 'Limpar' aparece com filtro ativo", await limpar.isVisible());
  await limpar.click();
  await page.waitForTimeout(1500);
  const voltou = Number((await page.locator("body").innerText()).match(/(\d+)\s+it(?:em|ens)/)?.[1] ?? 0);
  ok("desktop: 'Limpar' devolve a lista inteira", voltou === antes, `${voltou} vs ${antes}`);

  // 5. ordenação
  await page.locator("select").first().selectOption({ index: 1 });
  await page.waitForTimeout(1500);
  ok("desktop: ordenação entra na URL", /ordem=/.test(page.url()), page.url().slice(-50));

  // 6. cartão inteiro é clicável e leva à ficha
  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const primeiro = page.locator("article").first();
  await primeiro.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  // 75% da altura: bem abaixo do titulo, em cima do bloco de preco. E o teste
  // do "cartao inteiro clicavel" que substituiu o botao removido.
  const caixa = await primeiro.boundingBox();
  await page.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height * 0.75);
  await page.waitForTimeout(1800);
  ok("desktop: cartão leva à ficha do produto", /\/loja\/[^/]+$/.test(page.url()), page.url().slice(-46));

  // 7. sem CTA vermelho por cartão
  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const vermelhosNaGrade = await page.evaluate(() => {
    const grade = document.querySelector("[data-grade-marketplace]");
    if (!grade) return -1;
    return [...grade.querySelectorAll("*")].filter((e) => {
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      // vermelho de verdade: canal alto, verde e azul baixos. `rgb(247,248,248)`
      // e cinza do placeholder e passava pelo teste antigo.
      const m = s.backgroundColor.match(/rgba?\((\d+), *(\d+), *(\d+)/);
      if (!m) return false;
      const [, vm, vd, az] = m.map(Number);
      return vm > 150 && vd < 90 && az < 90 && r.width > 120 && r.height > 30;
    }).length;
  });
  ok("desktop: nenhum bloco vermelho grande na grade", vermelhosNaGrade === 0, `${vermelhosNaGrade}`);

  ok("desktop: sem erro no console", erros.length === 0, erros.slice(0, 2).join(" | "));
  ok("desktop: sem requisição 4xx", quebradas.length === 0, quebradas.slice(0, 2).join(" | "));
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
  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  ok(
    "celular: painel lateral escondido",
    !(await page
      .getByRole("heading", { name: /^Filtros/ })
      .first()
      .isVisible()
      .catch(() => false)),
  );

  const botao = page.getByRole("button", { name: "Abrir filtros" });
  ok("celular: botão de filtros visível", await botao.isVisible());
  await botao.click();
  await page.waitForTimeout(700);
  const gaveta = page.getByRole("dialog", { name: /Filtros/ });
  ok("celular: gaveta abre", await gaveta.isVisible().catch(() => false));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const fechou = !(await gaveta.isVisible().catch(() => false));
  ok("celular: ESC fecha a gaveta", fechou);

  const colunas = await page.evaluate(() => {
    const g = document.querySelector("[data-grade-marketplace]");
    return g ? getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
  });
  ok("celular: grade em 2 colunas", colunas === 2, `${colunas}`);

  const rolagem = await page.evaluate(() => {
    const a = scrollX;
    scrollTo(99999, scrollY);
    const d = Math.round(scrollX);
    scrollTo(a, scrollY);
    return d;
  });
  ok("celular: sem rolagem horizontal", rolagem === 0, `${rolagem}px`);
  await ctx.close();
}

await nav.close();
process.exit(imprimir() > 0 ? 1 : 0);
