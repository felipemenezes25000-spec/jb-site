import { chromium } from "playwright";

/**
 * Auditoria responsiva do site de assistência atual.
 *
 * Mede as larguras em que anúncios e navegação real chegam à JB — de 320 a
 * 1920px — e procura os defeitos que destroem percepção e conversão:
 *
 *   · página que rola de lado (rolagem de verdade, lida com `behavior:
 *     "instant"`, porque o `<html>` tem rolagem suave e um `scrollTo` comum
 *     lê 0 na linha seguinte);
 *   · conteúdo que passa da borda da tela mesmo quando `overflow-x: clip`
 *     esconde a barra de rolagem — `scrollWidth === clientWidth` não prova
 *     nada nesse caso;
 *   · conteúdo recortado por um ancestral com `overflow: hidden/clip`;
 *   · texto de interface cortado com reticências;
 *   · `h1` e CTA fora da tela, e a primeira dobra do celular sem os dois
 *     atendentes;
 *   · alvo de toque pequeno: 44px nos CTAs de conversão e 24px (WCAG 2.5.8)
 *     em qualquer controle;
 *   · peça essencial escondida por acidente (título, abertura, rodapé);
 *   · revelação por rolagem que congela antes de chegar a 100% de opacidade
 *     — o defeito do "botão desbotado" de 22/09/2026, que só aparece com
 *     movimento ligado.
 *
 * Faixas horizontais deliberadas (a navegação de equipamentos e as provas da
 * abertura em telas estreitas) declaram `data-rolagem-horizontal`: nelas o
 * item cortado na borda é a pista de que há mais, e não um defeito.
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

/** Páginas de conversão: a primeira dobra do celular precisa ter título e atendentes. */
const CONVERSAO = new Set(ROTAS.slice(0, 8));

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

/** Onde a revelação por rolagem é percorrida com movimento ligado. */
const LARGURAS_DA_REVELACAO = new Set([390, 1440]);

const CONVERSOES = [
  "abertura", "abertura-segundo",
  "diagnostico", "diagnostico-segundo",
  "barra-movel", "barra-movel-segundo",
  "fechamento", "fechamento-segundo",
];

async function esperarPagina(pagina) {
  await pagina.waitForLoadState("load");
  /* Página que depende do servidor passa pelo esqueleto do `loading.tsx`, que
     não tem h1: medir ali aprovaria ou reprovaria o esqueleto, não a página. */
  await pagina.locator("h1").first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  await pagina.evaluate(() => document.fonts?.ready);
  await pagina.waitForTimeout(200);
}

function medirLayout({ largura, altura, toque, conversoes, conversao }) {
  const itens = [];
  const html = document.documentElement;
  const INTENCIONAL = "[data-rolagem-horizontal]";

  const visivel = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nome = (el) =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
      el.getAttribute("data-whatsapp") ? `[${el.getAttribute("data-whatsapp")}]` : ""
    } "${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`;

  /* 1. rolagem lateral real */
  const anterior = window.scrollX;
  window.scrollTo({ left: 99999, top: window.scrollY, behavior: "instant" });
  const deslocamento = Math.round(window.scrollX);
  window.scrollTo({ left: anterior, top: window.scrollY, behavior: "instant" });
  if (deslocamento > 1 || html.scrollWidth > html.clientWidth + 1) {
    itens.push({
      tipo: "overflow-horizontal",
      detalhe: `scrollWidth=${html.scrollWidth}; viewport=${html.clientWidth}; deslocamento=${deslocamento}`,
    });
  }

  /* 2. conteúdo além da borda da tela, com ou sem barra de rolagem */
  const conteudo = document.querySelectorAll(
    "body :where(h1,h2,h3,h4,p,a,button,input,textarea,select,article,figure,li,label,summary,img)",
  );
  let alemDaBorda = 0;
  let recortados = 0;
  let truncados = 0;
  for (const el of conteudo) {
    if (el.closest(INTENCIONAL) || el.closest("[inert]") || el.closest('[aria-hidden="true"]')) continue;
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    if (alemDaBorda < 8 && (r.left < -2 || r.right > largura + 2)) {
      itens.push({ tipo: "conteudo-fora-da-tela", detalhe: `${nome(el)}: ${Math.round(r.left)}..${Math.round(r.right)}` });
      alemDaBorda += 1;
      continue;
    }

    /* 3. recortado por ancestral que esconde o excesso */
    if (recortados < 8 && el.matches("h1,h2,h3,h4,p,a,button,label,summary,input")) {
      for (let pai = el.parentElement; pai && pai !== document.body; pai = pai.parentElement) {
        const s = getComputedStyle(pai);
        const x = s.overflowX;
        if (x === "visible") continue;
        if (x === "auto" || x === "scroll") break; // rola: o conteúdo é alcançável
        const rp = pai.getBoundingClientRect();
        if (r.left < rp.left - 2 || r.right > rp.right + 2) {
          itens.push({
            tipo: "conteudo-recortado",
            detalhe: `${nome(el)} passa de ${pai.tagName.toLowerCase()}.${[...pai.classList].slice(0, 2).join(".")} (${Math.round(r.left)}..${Math.round(r.right)} em ${Math.round(rp.left)}..${Math.round(rp.right)})`,
          });
          recortados += 1;
        }
        break;
      }
    }
  }

  /* 3b. texto recortado: cada trecho de texto contra o ancestral mais próximo
     que esconde o excesso. Pega o que o teste por elemento não vê — um
     `span` cortado dentro de um cartão com `overflow: hidden`, como as provas
     da abertura espremidas em 1024px. */
  const caminhante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let no = caminhante.nextNode(); no && recortados < 8; no = caminhante.nextNode()) {
    if (!no.textContent.trim()) continue;
    const dono = no.parentElement;
    if (!dono || dono.closest(".sr-only, script, style, noscript, template, [inert], [aria-hidden='true']")) continue;
    if (dono.closest(INTENCIONAL) || !visivel(dono)) continue;
    let recorte = null;
    for (let pai = dono; pai && pai !== document.body; pai = pai.parentElement) {
      const x = getComputedStyle(pai).overflowX;
      if (x === "auto" || x === "scroll") break;
      if (x === "hidden" || x === "clip") {
        recorte = pai;
        break;
      }
    }
    if (!recorte || getComputedStyle(dono).textOverflow === "ellipsis") continue;
    const caixa = recorte.getBoundingClientRect();
    const faixa = document.createRange();
    faixa.selectNodeContents(no);
    for (const r of faixa.getClientRects()) {
      if (r.width === 0) continue;
      if (r.left < caixa.left - 1 || r.right > caixa.right + 1) {
        itens.push({
          tipo: "texto-recortado",
          detalhe: `"${no.textContent.trim().slice(0, 40)}" passa de ${recorte.tagName.toLowerCase()}.${[...recorte.classList].slice(0, 2).join(".")} (${Math.round(r.left)}..${Math.round(r.right)} em ${Math.round(caixa.left)}..${Math.round(caixa.right)})`,
        });
        recortados += 1;
        break;
      }
    }
  }

  /* 4. texto de interface cortado com reticências. Mede a largura real do
     texto contra a caixa, em fração de pixel: `scrollWidth` e `clientWidth`
     arredondam para lados opostos e acusavam corte de meio pixel que não
     aparece na tela. */
  for (const el of document.querySelectorAll("body *")) {
    if (truncados >= 8) break;
    const s = getComputedStyle(el);
    if (s.textOverflow !== "ellipsis" || !visivel(el)) continue;
    if (el.closest("[inert]") || el.closest('[aria-hidden="true"]') || el.closest(".sr-only")) continue;
    const faixa = document.createRange();
    faixa.selectNodeContents(el);
    const texto = faixa.getBoundingClientRect().width;
    const caixa = el.getBoundingClientRect().width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    if (texto > caixa + 0.5) {
      itens.push({ tipo: "texto-truncado", detalhe: `${nome(el)} (${texto.toFixed(1)}px em ${caixa.toFixed(1)}px)` });
      truncados += 1;
    }
  }

  /* 5. peças que não podem sumir */
  const h1 = document.querySelector("h1");
  if (!h1 || !visivel(h1)) {
    itens.push({ tipo: "essencial-oculto", detalhe: "h1 ausente ou invisível" });
  } else {
    const r = h1.getBoundingClientRect();
    if (r.left < -2 || r.right > largura + 2) {
      itens.push({ tipo: "h1-fora-da-tela", detalhe: `${Math.round(r.left)}..${Math.round(r.right)}` });
    }
  }
  const rodape = document.querySelector("footer");
  if (!rodape || !visivel(rodape)) itens.push({ tipo: "essencial-oculto", detalhe: "rodapé ausente ou invisível" });

  if (conversao) {
    for (const posicao of ["abertura", "abertura-segundo"]) {
      const cta = document.querySelector(`a[data-whatsapp="${posicao}"]`);
      if (!cta || !visivel(cta)) {
        itens.push({ tipo: "essencial-oculto", detalhe: `CTA ${posicao} ausente ou invisível` });
        continue;
      }
      /* Celular: os dois atendentes na primeira dobra, sem rolar. */
      if (toque && largura < 768) {
        const r = cta.getBoundingClientRect();
        if (r.bottom > altura) {
          itens.push({ tipo: "primeira-dobra", detalhe: `${posicao} termina em ${Math.round(r.bottom)}px (tela de ${altura}px)` });
        }
      }
    }
  }

  /* 6. alvos de toque */
  if (toque) {
    for (const el of document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"]')) {
      /* `.sr-only` sem foco é o "pular para o conteúdo": só aparece — com alvo
         de verdade — quando recebe foco, e isso a auditoria de teclado mede. */
      if (!visivel(el) || el.closest("[inert]") || el.matches(".sr-only")) continue;
      const r = el.getBoundingClientRect();
      const posicao = el.getAttribute("data-whatsapp") || "";
      if (conversoes.includes(posicao)) {
        if (r.width < 44 || r.height < 44) {
          itens.push({ tipo: "cta-pequeno", detalhe: `${posicao}: ${Math.round(r.width)}x${Math.round(r.height)}px` });
        }
        if (r.left < -2 || r.right > largura + 2) {
          itens.push({ tipo: "cta-fora-da-tela", detalhe: `${posicao}: ${Math.round(r.left)}..${Math.round(r.right)}` });
        }
        continue;
      }
      /* Link dentro de frase é exceção da própria WCAG 2.5.8. */
      if (getComputedStyle(el).display === "inline") continue;
      if (r.width < 24 || r.height < 24) {
        itens.push({ tipo: "alvo-pequeno", detalhe: `${nome(el)}: ${Math.round(r.width)}x${Math.round(r.height)}px` });
      }
    }
  }

  return itens;
}

/**
 * Com movimento ligado, rola a página inteira e confere que cada bloco que
 * revela na rolagem chega inteiro (opacidade ~1) quando está no meio da tela.
 */
async function conferirRevelacao(pagina) {
  return pagina.evaluate(async () => {
    const achados = [];
    const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const alturaTotal = document.documentElement.scrollHeight;
    const passo = Math.round(window.innerHeight * 0.5);
    const vistos = new Set();

    for (let y = 0; y <= alturaTotal; y += passo) {
      window.scrollTo({ top: y, behavior: "instant" });
      await esperar(120);
      const meio = window.innerHeight / 2;
      for (const el of document.querySelectorAll(".jb-revela")) {
        if (vistos.has(el)) continue;
        const r = el.getBoundingClientRect();
        /* Bloco que já cruzou a linha do meio da tela: entrou pelo menos meia
           tela, bem além da faixa em que a revelação termina. */
        if (r.height === 0 || r.top > meio || r.bottom < meio) continue;
        const opacidade = Number(getComputedStyle(el).opacity);
        vistos.add(el);
        if (opacidade < 0.98) {
          achados.push(`${el.tagName.toLowerCase()} "${(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}" em ${opacidade.toFixed(2)}`);
        }
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    return achados.slice(0, 6);
  });
}

const navegador = await chromium.launch();
const problemas = [];
let medicoes = 0;

try {
  for (const viewport of LARGURAS) {
    const opcoes = {
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.toque,
      isMobile: viewport.width < 768,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    };
    const contexto = await navegador.newContext({ ...opcoes, reducedMotion: "reduce" });
    const comMovimento = LARGURAS_DA_REVELACAO.has(viewport.width)
      ? await navegador.newContext({ ...opcoes, reducedMotion: "no-preference" })
      : null;

    for (const rota of ROTAS) {
      const pagina = await contexto.newPage();
      try {
        const resposta = await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if (!resposta || resposta.status() >= 400) {
          problemas.push({ rota, largura: viewport.width, tipo: "http", detalhe: resposta?.status() ?? null });
          continue;
        }
        await esperarPagina(pagina);

        const achados = await pagina.evaluate(medirLayout, {
          largura: viewport.width,
          altura: viewport.height,
          toque: viewport.toque,
          conversoes: CONVERSOES,
          conversao: CONVERSAO.has(rota),
        });
        for (const achado of achados) problemas.push({ rota, largura: viewport.width, ...achado });
        medicoes += 1;
      } finally {
        await pagina.close();
      }

      if (comMovimento) {
        const movida = await comMovimento.newPage();
        try {
          await movida.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30_000 });
          await esperarPagina(movida);
          for (const detalhe of await conferirRevelacao(movida)) {
            problemas.push({ rota, largura: viewport.width, tipo: "revelacao-congelada", detalhe });
          }
          medicoes += 1;
        } finally {
          await movida.close();
        }
      }

      process.stdout.write(`✓ ${viewport.width}px ${rota}\n`);
    }

    await contexto.close();
    await comMovimento?.close();
  }
} finally {
  await navegador.close();
}

if (problemas.length) {
  console.error("\nResponsividade: problemas encontrados\n");
  for (const problema of problemas) console.error(JSON.stringify(problema));
  process.exit(1);
}

console.log(`\nResponsividade: ${ROTAS.length} rotas × ${LARGURAS.length} larguras, ${medicoes} medições aprovadas.\n`);
