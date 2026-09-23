import { chromium } from "playwright";

/**
 * Auditoria responsiva do site de assistência atual.
 *
 * Mede as larguras em que anúncios e navegação real chegam à JB. O portão
 * procura três defeitos que destroem percepção/conversão: página que rola de
 * lado, conteúdo útil cortado por `overflow: clip` e CTA principal pequeno
 * demais para o dedo.
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

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
];

const LARGURAS = [
  { width: 320, height: 720, toque: true },
  { width: 360, height: 780, toque: true },
  { width: 390, height: 844, toque: true },
  { width: 430, height: 932, toque: true },
  { width: 768, height: 1024, toque: true },
  { width: 1024, height: 768, toque: false },
  { width: 1280, height: 900, toque: false },
  { width: 1440, height: 900, toque: false },
  { width: 1920, height: 1080, toque: false },
];

const CONVERSOES = new Set([
  "abertura", "abertura-segundo",
  "diagnostico", "diagnostico-segundo",
  "barra-movel", "barra-movel-segundo",
  "fechamento", "fechamento-segundo",
]);

const navegador = await chromium.launch();
const problemas = [];

try {
  for (const viewport of LARGURAS) {
    const contexto = await navegador.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.toque,
      isMobile: viewport.width < 768,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });

    for (const rota of ROTAS) {
      const pagina = await contexto.newPage();
      try {
        const resposta = await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (!resposta || resposta.status() >= 400) {
          problemas.push({ rota, largura: viewport.width, tipo: "http", detalhe: resposta?.status() ?? null });
          continue;
        }

        const achados = await pagina.evaluate(({ largura, toque, conversoes }) => {
          const itens = [];
          const html = document.documentElement;
          const anterior = window.scrollX;
          window.scrollTo({ left: 99999, top: window.scrollY, behavior: "instant" });
          const deslocamento = Math.round(window.scrollX);
          window.scrollTo({ left: anterior, top: window.scrollY, behavior: "instant" });

          if (deslocamento > 1 || html.scrollWidth > html.clientWidth + 2) {
            itens.push({
              tipo: "overflow-horizontal",
              detalhe: `scrollWidth=${html.scrollWidth}; viewport=${html.clientWidth}; deslocamento=${deslocamento}`,
            });
          }

          const h1 = document.querySelector("h1");
          if (h1) {
            const r = h1.getBoundingClientRect();
            if (r.left < -2 || r.right > largura + 2) {
              itens.push({ tipo: "h1-fora-da-tela", detalhe: `${Math.round(r.left)}..${Math.round(r.right)}` });
            }
          }

          /* `overflow-x: clip` evita scrollbar, mas não transforma um card
             cortado em layout correto. Procura elementos de conteúdo que
             ultrapassam a viewport. Faixas horizontais deliberadas são a
             exceção: nelas o conteúdo fora da tela é justamente a affordance. */
          const HORIZONTAIS_INTENCIONAIS = ".jb-faixa, .jb-hero-provas, .jb-filtros-premium";
          const candidatos = document.querySelectorAll(
            "main :where(h1,h2,h3,p,a,button,input,textarea,select,article,figure,li)",
          );
          let relatados = 0;
          for (const el of candidatos) {
            if (relatados >= 8) break;
            if (el.closest(HORIZONTAIS_INTENCIONAIS)) continue;

            const s = getComputedStyle(el);
            if (s.display === "none" || s.visibility === "hidden") continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;

            /* Elemento absoluto decorativo não entra no seletor acima; ainda
               assim, links/figures podem ter poucos pixels de sombra fora sem
               conteúdo cortado. A tolerância de 3px cobre arredondamento. */
            if (r.left < -3 || r.right > largura + 3) {
              itens.push({
                tipo: "conteudo-cortado",
                detalhe: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}: ${Math.round(r.left)}..${Math.round(r.right)}`,
              });
              relatados += 1;
            }
          }

          if (toque) {
            for (const el of document.querySelectorAll('a[data-whatsapp]')) {
              const posicao = el.getAttribute("data-whatsapp") || "";
              if (!conversoes.includes(posicao)) continue;
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              if (r.width === 0 || r.height === 0 || s.display === "none" || s.visibility === "hidden") continue;
              if (r.width < 44 || r.height < 44) {
                itens.push({
                  tipo: "cta-pequeno",
                  detalhe: `${posicao}: ${Math.round(r.width)}x${Math.round(r.height)}px`,
                });
              }
              if (r.left < -2 || r.right > largura + 2) {
                itens.push({
                  tipo: "cta-fora-da-tela",
                  detalhe: `${posicao}: ${Math.round(r.left)}..${Math.round(r.right)}`,
                });
              }
            }
          }

          return itens;
        }, { largura: viewport.width, toque: viewport.toque, conversoes: [...CONVERSOES] });

        for (const achado of achados) problemas.push({ rota, largura: viewport.width, ...achado });
        process.stdout.write(`✓ ${viewport.width}px ${rota}\n`);
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
  console.error("\nResponsividade: problemas encontrados\n");
  for (const problema of problemas) console.error(JSON.stringify(problema));
  process.exit(1);
}

console.log(`\nResponsividade: ${ROTAS.length} rotas × ${LARGURAS.length} larguras aprovadas.\n`);
