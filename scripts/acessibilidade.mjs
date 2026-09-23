import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

/**
 * Auditoria de acessibilidade do produto público atual.
 *
 * A loja antiga permanece no histórico do Git, mas não é uma superfície do
 * produto: suas URLs respondem 410. Este gate mede somente páginas que a JB
 * oferece hoje e falha em qualquer violação WCAG 2.1 A/AA encontrada pelo axe.
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const fonteAxe = fs.readFileSync(AXE, "utf8");

const ROTAS = [
  "/",
  "/autoclave",
  "/compressor",
  "/cadeira-odontologica",
  "/bomba-de-vacuo",
  "/seladora",
  "/destilador",
  "/lavadora-ultrassonica",
  "/central-tecnica",
  "/cases",
  "/privacidade",
  "/termos",
  "/admin/entrar",
];

const navegador = await chromium.launch();
const problemas = [];

try {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  for (const rota of ROTAS) {
    const pagina = await contexto.newPage();
    try {
      const resposta = await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!resposta || resposta.status() >= 400) {
        problemas.push({ rota, tipo: "http", detalhe: `HTTP ${resposta?.status() ?? "sem resposta"}` });
        continue;
      }

      await pagina.addScriptTag({ content: fonteAxe });
      const resultado = await pagina.evaluate(async () => {
        const axe = globalThis.axe;
        return axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        });
      });

      for (const violacao of resultado.violations) {
        problemas.push({
          rota,
          tipo: violacao.id,
          impacto: violacao.impact,
          detalhe: violacao.help,
          alvos: violacao.nodes.slice(0, 4).map((n) => n.target.join(" ")),
        });
      }

      // Garantias que o axe não cobre: foco visível e os CTAs grandes do funil
      // com alvo confortável. Botões compactos de cabeçalho seguem a régua
      // WCAG; aqui cobramos 44px especificamente onde a pessoa converte.
      const extras = await pagina.evaluate(() => {
        const achados = [];
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
            if (r.height < 44 || r.width < 44) {
              achados.push(`WhatsApp ${posicao}: ${Math.round(r.width)}x${Math.round(r.height)}px`);
            }
          }
        }

        const focavel = document.querySelector('a[href]:not([tabindex="-1"]), button:not([disabled])');
        if (focavel) {
          const antes = getComputedStyle(focavel);
          const marcaAntes = `${antes.outlineStyle}|${antes.outlineWidth}|${antes.boxShadow}`;
          focavel.focus({ preventScroll: true });
          const depois = getComputedStyle(focavel);
          const marcaDepois = `${depois.outlineStyle}|${depois.outlineWidth}|${depois.boxShadow}`;
          if (document.activeElement === focavel && marcaAntes === marcaDepois) {
            achados.push("primeiro controle focável não apresenta mudança visual de foco");
          }
        }

        return achados;
      });

      for (const detalhe of extras) problemas.push({ rota, tipo: "medicao-propria", detalhe });
      process.stdout.write(`✓ a11y ${rota}\n`);
    } finally {
      await pagina.close();
    }
  }

  await contexto.close();
} finally {
  await navegador.close();
}

if (problemas.length) {
  console.error("\nAcessibilidade: problemas encontrados\n");
  for (const problema of problemas) console.error(JSON.stringify(problema));
  process.exit(1);
}

console.log(`\nAcessibilidade: ${ROTAS.length} rotas atuais sem violações no gate.\n`);
