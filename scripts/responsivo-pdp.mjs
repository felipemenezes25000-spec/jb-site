#!/usr/bin/env node
/**
 * Auditoria focada no cabeçalho da página de produto.
 *
 * A Home e o catálogo já têm o cabeçalho aprovado e não devem herdar o
 * redesign. Este script valida os dois lados do contrato:
 *   1) `/` e `/loja` continuam com o header normal;
 *   2) `/loja/[slug]` ganha o header especial e não quebra de 320 a 2560px.
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 pnpm responsivo:pdp
 *   BASE_URL=https://preview.vercel.app PDP_PATH=/loja/meu-produto pnpm responsivo:pdp
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PDP_INFORMADA = process.env.PDP_PATH || "";

const LARGURAS = [320, 360, 390, 430, 768, 1024, 1280, 1366, 1440, 1600, 1760, 1920, 2560];
const HEADER = 'header[data-jb-premium-header="true"]';
const PDP = "[data-pdp-marketplace]";

function absoluto(caminho) {
  return new URL(caminho, BASE).toString();
}

async function descobrirProduto(page) {
  if (PDP_INFORMADA) return PDP_INFORMADA;

  await page.goto(absoluto("/loja"), { waitUntil: "domcontentloaded" });
  const link = page.locator('main a[href^="/loja/"]').first();
  await link.waitFor({ state: "visible" });
  const href = await link.getAttribute("href");
  if (!href || href === "/loja") {
    throw new Error("Não foi possível descobrir uma ficha de produto a partir de /loja.");
  }
  return href;
}

async function medirRolagemHorizontal(page) {
  return page.evaluate(() => {
    const anterior = window.scrollX;
    window.scrollTo(99999, window.scrollY);
    const deslocou = Math.round(window.scrollX);
    window.scrollTo(anterior, window.scrollY);
    return deslocou;
  });
}

async function medirAlvo(locator) {
  const caixa = await locator.boundingBox();
  if (!caixa) return 0;
  return Math.min(caixa.width, caixa.height);
}

const navegador = await chromium.launch();
const achados = [];

async function novaPagina(viewport) {
  const contexto = await navegador.newContext({ viewport });
  const page = await contexto.newPage();
  return { contexto, page };
}

try {
  const descoberta = await novaPagina({ width: 1440, height: 900 });
  const caminhoProduto = await descobrirProduto(descoberta.page);
  await descoberta.contexto.close();

  console.log(`PDP: ${caminhoProduto}`);

  // ------------------------------------------- Home e catálogo permanecem iguais
  for (const rotaNormal of ["/", "/loja"]) {
    const { contexto, page } = await novaPagina({ width: 1440, height: 900 });
    try {
      await page.goto(absoluto(rotaNormal), { waitUntil: "domcontentloaded" });

      if ((await page.locator(PDP).count()) !== 0) {
        achados.push(`${rotaNormal}: marcador de PDP apareceu fora da ficha de produto.`);
      }

      const busca = page.locator(`${HEADER} .jb-busca-topo`).first();
      if (await busca.isVisible()) {
        const maxWidth = await busca.evaluate((el) => getComputedStyle(el).maxWidth);
        if (maxWidth === "none") {
          achados.push(`${rotaNormal}: regra de largura exclusiva da PDP vazou para o header normal.`);
        }
      }

      const rolou = await medirRolagemHorizontal(page);
      if (rolou > 1) achados.push(`${rotaNormal}: documento rola ${rolou}px na horizontal.`);
    } finally {
      await contexto.close();
    }
  }

  // ----------------------------------------------------------- PDP por tela
  for (const largura of LARGURAS) {
    const altura = largura <= 430 ? 844 : largura <= 768 ? 1024 : 900;
    const { contexto, page } = await novaPagina({ width: largura, height: altura });

    try {
      await page.goto(absoluto(caminhoProduto), { waitUntil: "domcontentloaded" });
      await page.locator(PDP).waitFor({ state: "visible" });

      const header = page.locator(HEADER).first();
      await header.waitFor({ state: "visible" });

      const caixaHeader = await header.boundingBox();
      if (!caixaHeader) {
        achados.push(`${largura}px: header sem caixa mensurável.`);
      } else if (caixaHeader.x < -1 || caixaHeader.x + caixaHeader.width > largura + 1) {
        achados.push(
          `${largura}px: header ocupa ${Math.round(caixaHeader.x)}–${Math.round(caixaHeader.x + caixaHeader.width)}px.`,
        );
      }

      const rolou = await medirRolagemHorizontal(page);
      if (rolou > 1) achados.push(`${largura}px: documento rola ${rolou}px na horizontal.`);

      const buscaDesktop = page.locator(`${HEADER} .jb-busca-topo`).first();
      const menu = page.locator(`${HEADER} button[aria-haspopup="dialog"]`).first();
      const nav = page.locator(`${HEADER} nav[aria-label="Principal"]`).first();

      if (largura < 1024) {
        if (await buscaDesktop.isVisible()) achados.push(`${largura}px: busca desktop deveria estar escondida.`);
        if (!(await menu.isVisible())) achados.push(`${largura}px: botão do menu mobile não está visível.`);

        const controles = [
          page.locator(`${HEADER} button[aria-expanded]:not([aria-haspopup="dialog"])`).first(),
          page.locator(`${HEADER} a[aria-label*="Área da Clínica"]`).first(),
          page.locator(`${HEADER} a[aria-label^="Carrinho"]`).first(),
          menu,
        ];

        for (const controle of controles) {
          if (!(await controle.isVisible())) {
            achados.push(`${largura}px: um controle principal do header desapareceu.`);
            continue;
          }
          const alvo = await medirAlvo(controle);
          if (alvo < 44) achados.push(`${largura}px: alvo de toque principal caiu para ${alvo.toFixed(1)}px.`);
        }
      } else {
        if (!(await buscaDesktop.isVisible())) achados.push(`${largura}px: busca desktop não está visível.`);
        if (!(await nav.isVisible())) achados.push(`${largura}px: navegação principal não está visível.`);
        if (await menu.isVisible()) achados.push(`${largura}px: botão de menu mobile apareceu no desktop.`);
      }

      if (largura >= 1440) {
        const maxWidth = await buscaDesktop.evaluate((el) => getComputedStyle(el).maxWidth);
        if (maxWidth !== "none") achados.push(`${largura}px: busca da PDP voltou a ficar limitada (${maxWidth}).`);
      }

      console.log(`✓ ${largura}px`);
    } catch (erro) {
      achados.push(`${largura}px: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
}

if (achados.length) {
  console.error("\nFalhas no cabeçalho da PDP:\n");
  for (const achado of achados) console.error(`- ${achado}`);
  process.exit(1);
}

console.log("\nCabeçalho da PDP aprovado de 320px a 2560px; Home e catálogo permaneceram isolados.");
