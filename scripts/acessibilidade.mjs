import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

/**
 * Auditoria de acessibilidade do produto público atual.
 *
 * A loja antiga permanece no histórico do Git, mas não é uma superfície do
 * produto: suas URLs respondem 410. Este gate mede as páginas que a JB
 * oferece hoje — home, sete landings, conteúdo, páginas legais, 404, a página
 * de 410 e o login do painel — e falha em qualquer violação WCAG 2.2 A/AA que
 * o axe encontrar.
 *
 * Mobile (390) e desktop (1440) são auditados separadamente: cabeçalho,
 * navegação e barra fixa mudam de composição conforme a largura, então um
 * único viewport não é evidência suficiente para os dois produtos visuais.
 *
 * Além do axe, o que ele não cobre e o site promete:
 *   · um `h1` só, `main` único e títulos sem pular nível;
 *   · link "Pular para o conteúdo" como primeira parada do Tab, visível;
 *   · foco visível em cada parada do Tab (as 30 primeiras);
 *   · CTAs de WhatsApp com alvo de 44px.
 *
 * Mede com `prefers-reduced-motion: reduce`: contraste e visibilidade são
 * avaliados no estado final, e não no quadro em que uma entrada calhou de
 * estar. A revelação por rolagem é conferida à parte, pelo `responsivo`.
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const fonteAxe = fs.readFileSync(AXE, "utf8");

/** Rota e status esperado. 404 e 410 também são páginas que alguém lê. */
const ROTAS_FIXAS = [
  ["/", 200],
  ["/autoclave", 200],
  ["/compressor", 200],
  ["/cadeira-odontologica", 200],
  ["/bomba-de-vacuo", 200],
  ["/seladora", 200],
  ["/destilador", 200],
  ["/lavadora-ultrassonica", 200],
  ["/central-tecnica", 200],
  ["/cases", 200],
  ["/privacidade", 200],
  ["/termos", 200],
  ["/pagina-que-nao-existe", 404],
  ["/loja", 410],
  ["/admin/entrar", 200],
];

const CENARIOS = [
  { nome: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
  { nome: "desktop", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

/**
 * A primeira publicação de cada índice, quando existe: artigo da Central
 * Técnica e case. Sem conteúdo publicado, o índice sozinho é medido — e o
 * relatório diz que o detalhe ficou sem medição, em vez de calar.
 */
async function rotasDeConteudo(navegador) {
  const pagina = await navegador.newPage();
  const achadas = [];
  try {
    for (const [indice, prefixo] of [
      ["/central-tecnica", "/central-tecnica/"],
      ["/cases", "/cases/"],
    ]) {
      await pagina.goto(BASE + indice, { waitUntil: "domcontentloaded" });
      const href = await pagina
        .locator(`main a[href^="${prefixo}"]`)
        .first()
        .getAttribute("href", { timeout: 3000 })
        .catch(() => null);
      if (href) achadas.push([href, 200]);
      else console.log(`· ${indice}: sem publicação para medir o detalhe`);
    }
  } finally {
    await pagina.close();
  }
  return achadas;
}

async function esperarPagina(pagina) {
  await pagina.waitForLoadState("load");
  /* Página que depende do servidor passa pelo esqueleto do `loading.tsx`, que
     não tem h1: medir ali aprovaria ou reprovaria o esqueleto, não a página. */
  await pagina.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  await pagina.evaluate(() => document.fonts?.ready);
  /* Hidratação e primeiro efeito (status de atendimento, aviso de medição). */
  await pagina.waitForTimeout(250);
}

const navegador = await chromium.launch();
const problemas = [];
let medicoes = 0;

try {
  const ROTAS = [...ROTAS_FIXAS, ...(await rotasDeConteudo(navegador))];

  for (const cenario of CENARIOS) {
    const contexto = await navegador.newContext({
      viewport: { width: cenario.width, height: cenario.height },
      isMobile: cenario.isMobile,
      hasTouch: cenario.hasTouch,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      reducedMotion: "reduce",
    });

    for (const [rota, esperado] of ROTAS) {
      const pagina = await contexto.newPage();
      try {
        const resposta = await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (!resposta || resposta.status() !== esperado) {
          problemas.push({
            rota,
            cenario: cenario.nome,
            tipo: "http",
            detalhe: `HTTP ${resposta?.status() ?? "sem resposta"} (esperado ${esperado})`,
          });
          continue;
        }
        await esperarPagina(pagina);

        await pagina.addScriptTag({ content: fonteAxe });
        const resultado = await pagina.evaluate(async () => {
          const axe = globalThis.axe;
          return axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
            },
          });
        });

        for (const violacao of resultado.violations) {
          problemas.push({
            rota,
            cenario: cenario.nome,
            tipo: violacao.id,
            impacto: violacao.impact,
            detalhe: violacao.help,
            alvos: violacao.nodes.slice(0, 4).map((n) => n.target.join(" ")),
          });
        }

        const estrutura = await pagina.evaluate(() => {
          const achados = [];
          const h1 = document.querySelectorAll("h1");
          if (h1.length !== 1) achados.push(`${h1.length} elementos h1 (esperado 1)`);
          const mains = document.querySelectorAll("main");
          if (mains.length !== 1) achados.push(`${mains.length} elementos main (esperado 1)`);

          let anterior = 0;
          for (const titulo of document.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
            const estilo = getComputedStyle(titulo);
            if (estilo.display === "none" || estilo.visibility === "hidden") continue;
            const nivel = Number(titulo.tagName.slice(1));
            if (anterior && nivel > anterior + 1) {
              achados.push(`título pula de h${anterior} para h${nivel}: "${titulo.textContent.trim().slice(0, 60)}"`);
            }
            anterior = nivel;
          }

          const conversoes = [
            "abertura", "abertura-segundo",
            "diagnostico", "diagnostico-segundo",
            "barra-movel", "barra-movel-segundo",
            "fechamento", "fechamento-segundo",
          ];
          for (const posicao of conversoes) {
            for (const el of document.querySelectorAll(`a[data-whatsapp="${posicao}"]`)) {
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              if (r.width === 0 || r.height === 0 || s.display === "none" || s.visibility === "hidden") continue;
              if (el.closest("[inert]")) continue;
              if (r.height < 44 || r.width < 44) {
                achados.push(`WhatsApp ${posicao}: ${Math.round(r.width)}x${Math.round(r.height)}px`);
              }
            }
          }
          return achados;
        });
        for (const detalhe of estrutura) {
          problemas.push({ rota, cenario: cenario.nome, tipo: "estrutura", detalhe });
        }

        /* Teclado: a primeira parada é o "pular", e toda parada mostra foco. */
        if (esperado === 200 && !rota.startsWith("/admin")) {
          await pagina.evaluate(() => {
            window.scrollTo({ top: 0, behavior: "instant" });
            document.activeElement?.blur?.();
          });
          const paradas = [];
          for (let i = 0; i < 30; i += 1) {
            await pagina.keyboard.press("Tab");
            const parada = await pagina.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body) return null;
              const s = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              const contorno = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
              const sombra = s.boxShadow && s.boxShadow !== "none";
              return {
                rotulo: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 50),
                href: el.getAttribute("href"),
                marcado: contorno || sombra,
                visivel: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight,
              };
            });
            if (!parada) break;
            paradas.push(parada);
          }

          if (paradas[0]?.href !== "#conteudo") {
            problemas.push({
              rota,
              cenario: cenario.nome,
              tipo: "teclado",
              detalhe: `primeira parada do Tab não é "Pular para o conteúdo" (${paradas[0]?.rotulo ?? "nenhuma"})`,
            });
          } else if (!paradas[0].visivel) {
            problemas.push({ rota, cenario: cenario.nome, tipo: "teclado", detalhe: "o link de pular não aparece ao receber foco" });
          }
          for (const parada of paradas) {
            if (!parada.marcado) {
              problemas.push({ rota, cenario: cenario.nome, tipo: "foco-invisivel", detalhe: parada.rotulo });
            }
          }
        }

        medicoes += 1;
        process.stdout.write(`✓ a11y ${cenario.nome} ${rota}\n`);
      } finally {
        await pagina.close();
      }
    }

    await contexto.close();
  }
} finally {
  await navegador.close();
}

if (problemas.length) {
  console.error("\nAcessibilidade: problemas encontrados\n");
  for (const problema of problemas) console.error(JSON.stringify(problema));
  process.exit(1);
}

console.log(`\nAcessibilidade: ${medicoes} medições (WCAG 2.2 A/AA + estrutura + teclado) sem violações.\n`);
