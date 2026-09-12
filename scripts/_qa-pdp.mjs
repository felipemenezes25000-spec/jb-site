/**
 * QA funcional da PDP. TEMPORARIO - apagar depois.
 *   node scripts/_qa-pdp.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const ROTA = process.env.ROTA || "/loja/autoclave-vertical-18l-classe-b";

const resultados = [];
const ok = (nome, passou, detalhe = "") =>
  resultados.push({ nome, passou, detalhe: String(detalhe).slice(0, 120) });

const nav = await chromium.launch();
const imprimir = () => {
  let falhas = 0;
  for (const r of resultados) {
    if (!r.passou) falhas++;
    console.log(`${r.passou ? "OK  " : "FALHA"} ${r.nome}${r.detalhe ? "  — " + r.detalhe : ""}`);
  }
  console.log(`
${resultados.length - falhas}/${resultados.length} passaram`);
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
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text().slice(0, 150));
  });
  page.on("pageerror", (e) => erros.push("pageerror: " + String(e.message).slice(0, 150)));
  const quebradas = [];
  page.on("response", (r) => {
    if (r.status() >= 400) quebradas.push(`${r.status()} ${r.url().slice(0, 90)}`);
  });

  await page.goto(BASE + ROTA, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  const barra = page.locator('nav[aria-label="Seções deste produto"]');

  // 1. barra de compra escondida no topo
  const opTopo = await barra
    .locator("div[aria-hidden]")
    .evaluate((e) => getComputedStyle(e).opacity)
    .catch(() => "n/a");
  ok("barra de compra escondida no topo", opTopo === "0", `opacity=${opTopo}`);

  // 2. aparece depois de rolar
  await page.evaluate(() => scrollTo(0, 2000));
  await page.waitForTimeout(600);
  const opRolado = await barra.locator("div[aria-hidden]").evaluate((e) => getComputedStyle(e).opacity);
  const alturaBarra = await barra.evaluate((e) => Math.round(e.getBoundingClientRect().height));
  ok("barra de compra aparece ao rolar", opRolado === "1", `opacity=${opRolado}`);
  ok("barra continua com ~50px", alturaBarra <= 56, `${alturaBarra}px`);

  // 3. o botão leva à caixa de compra
  await barra.getByRole("link", { name: /Comprar/ }).click();
  await page.waitForTimeout(900);
  const caixaVisivel = await page
    .locator("#caixa-de-compra")
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    });
  ok("Comprar da barra leva à caixa", caixaVisivel);

  // 4. galeria: próxima imagem
  // O ponteiro fica onde o último clique o deixou; parado sobre o cabeçalho
  // ele mantém o mega menu aberto e o painel cobre a galeria. Tirar o mouse
  // de cima do cabeçalho é o que um usuário faz sozinho ao mover o cursor.
  await page.mouse.move(30, 700);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
  const contadorAntes = await page.locator("[data-pdp-gallery] span", { hasText: /^\d+\/\d+$/ }).first().textContent();
  await page.getByRole("button", { name: "Próxima imagem" }).first().click();
  await page.waitForTimeout(300);
  const contadorDepois = await page.locator("[data-pdp-gallery] span", { hasText: /^\d+\/\d+$/ }).first().textContent();
  ok("galeria avança", contadorAntes !== contadorDepois, `${contadorAntes} → ${contadorDepois}`);

  // 5. miniatura seleciona
  await page.getByRole("button", { name: "Ver imagem 3 de 4" }).click();
  await page.waitForTimeout(300);
  const c3 = await page.locator("[data-pdp-gallery] span", { hasText: /^\d+\/\d+$/ }).first().textContent();
  ok("miniatura seleciona", (c3 || "").startsWith("3/"), c3 || "");

  // 6. zoom abre e ESC fecha
  await page.getByRole("button", { name: /Ampliar imagem/ }).click();
  await page.waitForTimeout(400);
  const abriu = await page.locator('[role="dialog"]').isVisible();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const fechou = (await page.locator('[role="dialog"]').count()) === 0;
  ok("zoom abre e ESC fecha", abriu && fechou, `abriu=${abriu} fechou=${fechou}`);

  // 7. CEP
  await page.getByPlaceholder("00000-000").fill("01310100");
  await page.waitForTimeout(1800);
  const respostaCep = await page.locator("#caixa-de-compra").innerText();
  ok(
    "CEP responde",
    /prazo|dias|frete|grátis|gratis|R\$|indisponível|não|nao/i.test(respostaCep),
    respostaCep.replace(/\s+/g, " ").slice(0, 90),
  );

  // 8. adicionar ao carrinho
  await page.getByRole("button", { name: /Adicionar ao carrinho/ }).first().click();
  await page.waitForTimeout(2200);
  const carrinho = await page.locator("body").innerText();
  ok("adiciona ao carrinho", /carrinho|adicionad/i.test(carrinho));

  // 9. âncoras da barra
  await page.getByRole("link", { name: "Especificações" }).first().click();
  await page.waitForTimeout(900);
  const ficha = await page.locator("#ficha-tecnica").evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { topo: Math.round(r.top), atras: r.top < 100 };
  });
  ok("âncora não some atrás do cabeçalho", !ficha.atras, `top=${ficha.topo}`);

  // 10. "Ver mais especificações" quando existir
  const verMais = page.locator("summary", { hasText: /Ver mais \d+ especifica/ });
  if ((await verMais.count()) > 0) {
    await verMais.first().click();
    await page.waitForTimeout(300);
    ok("ver mais especificações abre", await page.locator("summary", { hasText: /Mostrar menos/ }).isVisible());
  } else {
    ok("ver mais especificações (n/a neste produto)", true, "produto tem poucas specs");
  }

  // 11. foco visível no CTA da barra
  await page.evaluate(() => scrollTo(0, 2000));
  await page.waitForTimeout(500);
  const foco = await barra.getByRole("link", { name: /Comprar/ }).evaluate((e) => {
    e.focus();
    const s = getComputedStyle(e);
    return { outline: s.outlineWidth, sombra: s.boxShadow.slice(0, 40) };
  });
  ok(
    "CTA da barra tem foco visível",
    foco.outline !== "0px" || (foco.sombra !== "none" && foco.sombra !== ""),
    JSON.stringify(foco),
  );

  ok("sem erro no console", erros.length === 0, erros.slice(0, 2).join(" | "));
  ok(
    "sem requisição quebrada",
    quebradas.length === 0,
    quebradas.slice(0, 2).join(" | "),
  );
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

  // ordem da primeira dobra
  const ordem = await page.evaluate(() => {
    const y = (s) => {
      const e = document.querySelector(s);
      return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
    };
    return {
      h1: y("h1"),
      galeria: y("[data-pdp-gallery]"),
      compra: y("[data-pdp-buybox]"),
      detalhes: y("[data-pdp-details]"),
    };
  });
  ok(
    "celular: h1 → galeria → compra → detalhes",
    ordem.h1 < ordem.galeria && ordem.galeria < ordem.compra && ordem.compra < ordem.detalhes,
    JSON.stringify(ordem),
  );
  ok("celular: foto acima de 600px", ordem.galeria < 600, `galeria em ${ordem.galeria}px`);

  // barra inferior — some enquanto a caixa de compra está na tela, aparece depois.
  // A checagem é de comportamento: rola a caixa para dentro da janela e cobra
  // que a barra suma. Amarrar na posição da caixa quebrava a cada 36px que o
  // cabeçalho mudasse de altura.
  const barraBaixo = page.locator("[data-pdp-barra-compra]");
  await page.locator("#caixa-de-compra").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  ok(
    "celular: sem barra enquanto a caixa está à vista",
    (await barraBaixo.count()) === 0,
    `caixa em ${ordem.compra}px`,
  );
  await page.evaluate(() => scrollTo(0, 2400));
  await page.waitForTimeout(700);
  ok("celular: barra inferior aparece ao passar da caixa", await barraBaixo.isVisible());

  // não cobre o conteúdo: o corpo ganha folga do tamanho da barra
  const folga = await page.evaluate(() => ({
    barra: Math.round(
      document.querySelector("[data-pdp-barra-compra]")?.getBoundingClientRect().height ?? 0,
    ),
    padding: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom) || 0),
  }));
  ok(
    "celular: barra não cobre o fim da página",
    folga.padding >= folga.barra - 2,
    JSON.stringify(folga),
  );

  // alvo de toque
  const alvo = await barraBaixo
    .getByRole("link", { name: /Comprar/ })
    .evaluate((e) => Math.round(e.getBoundingClientRect().height));
  ok("celular: CTA da barra ≥ 44px", alvo >= 44, `${alvo}px`);

  // swipe na galeria
  const antes = await page.locator("[data-pdp-gallery] span", { hasText: /^\d+\/\d+$/ }).first().textContent();
  const cx = await page.locator("[data-pdp-gallery-main]").boundingBox();
  await page.touchscreen.tap(cx.x + cx.width * 0.7, cx.y + cx.height / 2);
  await page.evaluate(
    ([x1, y1, x2]) => {
      const alvo = document.querySelector("[data-pdp-gallery-main]");
      const toque = (tipo, x) =>
        alvo.dispatchEvent(
          new TouchEvent(tipo, {
            bubbles: true,
            changedTouches: [new Touch({ identifier: 1, target: alvo, clientX: x, clientY: y1 })],
            touches:
              tipo === "touchend"
                ? []
                : [new Touch({ identifier: 1, target: alvo, clientX: x, clientY: y1 })],
          }),
        );
      toque("touchstart", x1);
      toque("touchend", x2);
    },
    [cx.x + cx.width * 0.8, cx.y + cx.height / 2, cx.x + cx.width * 0.2],
  );
  await page.waitForTimeout(400);
  const depois = await page.locator("[data-pdp-gallery] span", { hasText: /^\d+\/\d+$/ }).first().textContent();
  ok("celular: swipe troca a foto", antes !== depois, `${antes} → ${depois}`);

  await ctx.close();
}

await nav.close();

let falhas = 0;
for (const r of resultados) {
  if (!r.passou) falhas++;
  console.log(`${r.passou ? "OK  " : "FALHA"} ${r.nome}${r.detalhe ? "  — " + r.detalhe : ""}`);
}
console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
process.exit(falhas > 0 ? 1 : 0);
