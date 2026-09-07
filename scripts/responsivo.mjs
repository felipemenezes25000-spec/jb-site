/**
 * Auditoria de responsividade — mede, não opina.
 *
 * Percorre as rotas nas larguras que importam e mede no navegador de verdade:
 * transbordo horizontal, elemento que passa da viewport, alvo de toque pequeno
 * demais, texto miúdo e imagem sem dimensão (que causa salto de layout).
 *
 * Sai com código 1 quando encontra problema, então serve de portão.
 *
 *   BASE_URL=http://localhost:3400 node scripts/responsivo.mjs
 *
 * Opções:
 *   --so=publico|conta|admin   percorre só um grupo
 *   --largura=390              mede só uma largura
 *   --fotos                    salva a captura de cada problema
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SAIDA = path.join(process.cwd(), ".shots", "responsivo");

const argumentos = process.argv.slice(2);
const grupoPedido = argumentos.find((a) => a.startsWith("--so="))?.slice(5);
const larguraPedida = Number(argumentos.find((a) => a.startsWith("--largura="))?.slice(10) ?? 0);
const comFotos = argumentos.includes("--fotos");

const CLIENTE = { email: "demo@jbteste.local", senha: "demo12345" };
const EQUIPE = { email: "demo.admin@jbteste.local", senha: "demo12345" };

/** As larguras onde o layout costuma quebrar, não uma lista redonda qualquer. */
const LARGURAS = [
  /* 320 é a largura mínima que a WCAG 2.2 exige suportar sem rolagem
     horizontal (1.4.10, reflow). Entrou na fase 7 desta evolução: até então a
     lista começava em 360, e um iPhone SE de primeira geração com fonte
     ampliada cai abaixo disso. */
  { w: 320, h: 720, nome: "320 (mínimo da WCAG)", toque: true },
  { w: 360, h: 780, nome: "360 (celular pequeno)", toque: true },
  { w: 390, h: 844, nome: "390 (celular comum)", toque: true },
  { w: 768, h: 1024, nome: "768 (tablet retrato)", toque: true },
  { w: 1024, h: 768, nome: "1024 (tablet paisagem)", toque: false },
  { w: 1280, h: 900, nome: "1280 (notebook)", toque: false },
  { w: 1440, h: 900, nome: "1440 (desktop)", toque: false },
];

const ROTAS = {
  publico: [
    "/",
    "/loja",
    "/seminovos",
    "/marcas",
    "/busca?q=autoclave",
    "/busca?q=autoclave nao aquece",
    "/central-tecnica",
    "/cases",
    "/depoimentos",
    "/comparar",
    "/simulador-de-custo",
    "/carrinho",
    "/checkout",
    "/assistencia-tecnica",
    "/assistencia-tecnica/solicitar",
    "/planos-de-manutencao",
    "/manutencao-preventiva",
    "/orcamento",
    "/sobre",
    "/estrutura",
    "/contato",
    "/faq",
    "/entrar",
    "/cadastro",
  ],
  conta: [
    "/minha-jb",
    "/minha-jb/pedidos",
    "/minha-jb/equipamentos",
    "/minha-jb/assistencia",
    "/minha-jb/manutencoes",
    "/minha-jb/orcamentos",
    "/minha-jb/documentos",
    "/minha-jb/perfil",
    "/minha-jb/equipamentos/etiquetas",
  ],
  admin: [
    "/admin",
    "/admin/pedidos",
    "/admin/produtos",
    "/admin/estoque",
    "/admin/clientes",
    "/admin/assistencia",
    "/admin/os",
    "/admin/agenda",
    "/admin/configuracoes",
  ],
};

/**
 * Roda dentro da página. Tudo o que é medido aqui é medido no layout real —
 * é a única forma de saber se algo transborda, porque depende de fonte,
 * imagem carregada e quebra de linha.
 */
function medir() {
  const viewport = document.documentElement.clientWidth;
  const achados = [];

  /* --------------------------------------------------- transbordo da página */
  /**
   * Pergunta certa: a página ROLA de lado? E não "qual é o scrollWidth".
   *
   * `documentElement.scrollWidth` mente neste layout: ele soma o conteúdo de
   * roladores internos, então uma tabela larga dentro do seu próprio
   * `overflow-x: auto` fazia o documento reportar 1046px numa viewport de 768
   * — sem que a página rolasse um pixel. Quatorze achados falsos vieram daí.
   *
   * Tentar rolar e ver se andou é o que o dedo do usuário faria.
   */
  const rolagemAnterior = window.scrollX;
  window.scrollTo(9999, window.scrollY);
  const rolouDeFato = Math.round(window.scrollX);
  window.scrollTo(rolagemAnterior, window.scrollY);

  if (rolouDeFato > 1) {
    // acha o culpado AGORA, no mesmo estado de layout que produziu a rolagem —
    // procurar depois, noutra medição, é procurar noutra página
    const se = document.scrollingElement;
    const eb = getComputedStyle(document.body);
    const eh = getComputedStyle(document.documentElement);
    let culpado =
      `[rolador=${se?.tagName} sw=${se?.scrollWidth} cw=${se?.clientWidth} ` +
      `body.w=${Math.round(document.body.getBoundingClientRect().width)} ` +
      `body.ovX=${eb.overflowX} html.ovX=${eh.overflowX}] `;
    let maiorLargura = 0;
    for (const el of document.body.querySelectorAll("*")) {
      const c = el.getBoundingClientRect();
      if (c.right <= viewport + 2) continue;
      let emRolador = false;
      let pai = el.parentElement;
      for (let i = 0; pai && i < 8; i += 1) {
        const ov = getComputedStyle(pai).overflowX;
        if (ov === "auto" || ov === "scroll" || ov === "hidden") {
          emRolador = true;
          break;
        }
        pai = pai.parentElement;
      }
      if (!emRolador && c.width > maiorLargura) {
        maiorLargura = c.width;
        culpado += `${Math.round(c.width)}px até ${Math.round(c.right)}px — ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 55)} [emRolador=${emRolador}]`;
      }
    }

    achados.push({
      tipo: "rolagem-horizontal",
      detalhe: `rola ${rolouDeFato}px numa viewport de ${viewport}px · culpado: ${culpado}`,
      seletor: "documento",
    });
  }

  /** Caminho curto e legível até o elemento, para quem for corrigir achar. */
  const caminho = (el) => {
    const partes = [];
    let atual = el;
    for (let i = 0; atual && i < 4; i += 1) {
      let parte = atual.tagName.toLowerCase();
      if (atual.id) parte += `#${atual.id}`;
      else if (typeof atual.className === "string" && atual.className.trim()) {
        parte += `.${atual.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
      }
      partes.unshift(parte);
      atual = atual.parentElement;
    }
    return partes.join(" > ").slice(0, 160);
  };

  const visivel = (el, caixa) => {
    if (caixa.width === 0 || caixa.height === 0) return false;
    const estilo = getComputedStyle(el);
    return estilo.visibility !== "hidden" && estilo.display !== "none" && estilo.opacity !== "0";
  };

  /**
   * Recortado com `clip-path` ou `clip` é o padrão `sr-only`: existe para
   * leitor de tela e para o teclado, e só ganha corpo quando recebe foco.
   * Link de pular para o conteúdo e botão de busca acessível caem aqui. Não é
   * alvo de toque pequeno — não é alvo de toque nenhum.
   */
  const recortado = (estilo) =>
    (estilo.clipPath && estilo.clipPath !== "none") ||
    (estilo.clip && estilo.clip !== "auto");

  const elementos = Array.from(document.body.querySelectorAll("*"));

  for (const el of elementos) {
    const caixa = el.getBoundingClientRect();
    if (!visivel(el, caixa)) continue;

    /* ------------------------------------------- elemento passando da tela */
    /**
     * Duas saídas legítimas antes de acusar:
     *
     * `pointer-events: none` posicionado fora da tela é como a isca antirrobô
     * se esconde — sair da viewport ali é o objetivo, não o defeito.
     *
     * E conteúdo dentro de um contêiner que rola na horizontal (abas, faixa de
     * categorias) passa da viewport POR DESENHO: o usuário arrasta. O defeito
     * seria a PÁGINA rolar, e isso já é medido em separado, lá em cima.
     */
    const emRoladorHorizontal = (() => {
      let pai = el.parentElement;
      for (let i = 0; pai && i < 6; i += 1) {
        const ov = getComputedStyle(pai).overflowX;
        if (ov === "auto" || ov === "scroll") return true;
        pai = pai.parentElement;
      }
      return false;
    })();

    const semPonteiro = getComputedStyle(el).pointerEvents === "none";

    // 2px de folga: arredondamento de subpixel não é defeito
    if ((caixa.right > viewport + 2 || caixa.left < -2) && !emRoladorHorizontal && !semPonteiro) {
      const pai = el.parentElement;
      const paiTransborda =
        pai && (pai.getBoundingClientRect().right > viewport + 2 || pai.getBoundingClientRect().left < -2);
      // só reporta o elemento mais externo que transborda, senão o relatório
      // vira uma lista de todos os filhos do mesmo problema
      if (!paiTransborda) {
        achados.push({
          tipo: "elemento-fora-da-tela",
          detalhe: `ocupa de ${Math.round(caixa.left)}px a ${Math.round(caixa.right)}px`,
          seletor: caminho(el),
        });
      }
    }

    /* --------------------------------------------------- alvo de toque */
    const estiloEl = getComputedStyle(el);
    const clicavel =
      el.matches("a[href], button, input, select, textarea, [role=button], [role=tab], [role=link]") &&
      !el.hasAttribute("disabled") &&
      // isca antirrobô e enfeite não recebem toque
      estiloEl.pointerEvents !== "none" &&
      !recortado(estiloEl);

    if (clicavel && viewport <= 768) {
      /**
       * O que se toca nem sempre é o que se mede.
       *
       * Um controle escondido com `sr-only` (1x1px) não é alvo pequeno: ele é
       * invisível de propósito, e quem recebe o toque é o rótulo em volta —
       * uma pílula de 44px, um botão estilizado, o link de pular conteúdo que
       * só aparece no foco. Medir o input ali produzia dezenas de achados
       * falsos que escondiam os poucos reais.
       *
       * Então: se o controle está escondido, medimos o rótulo associado (ou o
       * ancestral clicável). Se não existe nenhum, aí sim é defeito de verdade
       * — não há nada para tocar.
       */
      const escondido = caixa.width <= 2 && caixa.height <= 2;

      let alvoReal = el;
      let caixaAlvo = caixa;

      if (escondido || el.type === "checkbox" || el.type === "radio") {
        const rotulo =
          el.closest("label") ||
          (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null) ||
          el.closest("a[href], button, [role=button]");
        if (rotulo) {
          alvoReal = rotulo;
          caixaAlvo = rotulo.getBoundingClientRect();
        }
      }

      const alvo = Math.min(caixaAlvo.width, caixaAlvo.height);

      // link dentro de texto corrido não é botão: exigir 44px ali seria exigir
      // que todo link inline virasse bloco. Cabeçalho entra porque o título de
      // um cartão é texto, não controle.
      const dentroDeTexto =
        el.tagName === "A" &&
        el.parentElement &&
        /^(P|LI|SPAN|TD|DD|DT|H[1-6])$/.test(el.parentElement.tagName);

      /**
       * Link esticado: o `::after` absoluto cobre o cartão inteiro, então quem
       * recebe o toque é o cartão — costuma ter centenas de pixels. Medir o
       * texto do título ali acusaria defeito onde o alvo é enorme.
       */
      const esticado =
        getComputedStyle(el, "::after").position === "absolute" &&
        Boolean(el.closest("article, li, .group"));

      // já reportado por outro elemento do mesmo grupo
      const jaContado = achados.some(
        (a) => a.tipo === "alvo-de-toque-pequeno" && a.seletor === caminho(alvoReal),
      );

      if (alvo > 0 && alvo < 44 && !dentroDeTexto && !esticado && !jaContado) {
        achados.push({
          tipo: "alvo-de-toque-pequeno",
          detalhe: `${Math.round(caixaAlvo.width)}x${Math.round(caixaAlvo.height)}px (mínimo 44)`,
          seletor: caminho(alvoReal),
        });
      }
    }

    /* ------------------------------------------------------- texto miúdo */
    const temTextoProprio = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 3,
    );
    if (temTextoProprio) {
      const estiloTexto = getComputedStyle(el);
      const tamanho = parseFloat(estiloTexto.fontSize);

      /**
       * Rótulo em caixa alta com espaçamento largo é recurso tipográfico, não
       * corpo espremido. "SEMINOVO REVISADO" em 11px versalete lê melhor do
       * que em 14px — é o padrão de sobretítulo. O piso menor vale só para
       * esse caso; texto normal continua cobrado em 12px.
       */
      const ehRotulo =
        estiloTexto.textTransform === "uppercase" && parseFloat(estiloTexto.letterSpacing) > 0.4;
      const piso = ehRotulo ? 10 : 12;

      if (tamanho && tamanho < piso) {
        achados.push({
          tipo: "texto-miudo",
          detalhe: `${tamanho.toFixed(1)}px (piso ${piso})`,
          seletor: caminho(el),
        });
      }
    }
  }

  /* ------------------------------------- imagem sem dimensão declarada */
  for (const img of Array.from(document.images)) {
    const caixa = img.getBoundingClientRect();
    if (caixa.width === 0) continue;
    const estilo = getComputedStyle(img);
    const temDimensao =
      (img.getAttribute("width") && img.getAttribute("height")) ||
      estilo.aspectRatio !== "auto" ||
      (estilo.height !== "auto" && estilo.height !== "");
    if (!temDimensao) {
      achados.push({
        tipo: "imagem-sem-dimensao",
        detalhe: img.currentSrc?.split("/").pop()?.slice(0, 50) ?? "sem src",
        seletor: caminho(img),
      });
    }
  }

  return achados;
}

/* ------------------------------------------------------------------ login */

async function entrar(contexto, rota, email, senha) {
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pagina.getByLabel(/e-?mail/i).first().fill(email, { timeout: 10000 });
    await pagina.getByLabel(/^senha/i).first().fill(senha, { timeout: 10000 });
    await pagina.getByRole("button", { name: /entrar|acessar/i }).first().click({ timeout: 10000 });
    await pagina.waitForURL((u) => !u.pathname.startsWith(rota), { timeout: 45000 });
    await pagina.close();
    return true;
  } catch {
    await pagina.close();
    return false;
  }
}

/* ------------------------------------------------------------------ main */

const larguras = larguraPedida ? LARGURAS.filter((l) => l.w === larguraPedida) : LARGURAS;
const navegador = await chromium.launch();
const problemas = [];
let medidas = 0;

async function percorrer(grupo, rotas, login) {
  if (grupoPedido && grupoPedido !== grupo) return;

  console.log(`\n── ${grupo} ${"─".repeat(Math.max(0, 44 - grupo.length))}`);
  const contexto = await navegador.newContext({ locale: "pt-BR" });

  if (login) {
    const ok = await entrar(contexto, login.rota, login.email, login.senha);
    if (!ok) {
      console.log("  pulando: não foi possível entrar");
      await contexto.close();
      return;
    }
  }

  /**
   * Contexto separado para toque.
   *
   * `setViewportSize` estreita a janela mas mantém o ponteiro fino — e o CSS
   * do projeto usa `pointer-coarse` para crescer o botão pequeno até os 44px
   * no dedo. Medindo com mouse, a regra nunca aplicava e a auditoria acusava
   * alvo pequeno onde o celular mostra 44px. `hasTouch` corrige a medição.
   */
  const contextoToque = await navegador.newContext({
    locale: "pt-BR",
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    storageState: await contexto.storageState(),
  });

  /**
   * Espera o layout assentar — sem `networkidle`.
   *
   * `waitForLoadState("networkidle")` NUNCA dispara contra `next dev`: o HMR
   * mantém um websocket aberto, a rede nunca fica ociosa, e a chamada queima o
   * timeout inteiro. Eram duas por rota e por largura, de 8s cada — 16s de
   * espera pura em cada medição. Com 70 rotas e 5 larguras isso é mais de uma
   * hora só esperando, e foi o que matou o job de responsividade da CI no teto
   * de 45 minutos, com E2E e acessibilidade já verdes.
   *
   * O que interessa para medir layout não é a rede ociosa: é fonte carregada e
   * imagem com dimensão. As duas coisas terminam, e rápido.
   */
  const assentar = async (alvo) => {
    await alvo.waitForLoadState("load", { timeout: 20000 }).catch(() => {});
    await alvo
      .evaluate(async () => {
        await document.fonts?.ready;
        const pendentes = Array.from(document.images).filter((img) => !img.complete);
        if (pendentes.length === 0) return;
        await Promise.race([
          Promise.all(
            pendentes.map(
              (img) =>
                new Promise((pronto) => {
                  img.addEventListener("load", pronto, { once: true });
                  img.addEventListener("error", pronto, { once: true });
                }),
            ),
          ),
          new Promise((pronto) => setTimeout(pronto, 2500)),
        ]);
      })
      .catch(() => {});
  };

  const pagina = await contexto.newPage();
  const paginaToque = await contextoToque.newPage();
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  await paginaToque.emulateMedia({ reducedMotion: "reduce" });

  for (const rota of rotas) {
    const daRota = [];

    for (const tela of larguras) {
      const alvo = tela.toque ? paginaToque : pagina;
      await alvo.setViewportSize({ width: tela.w, height: tela.h });
      try {
        await alvo.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 45000 });
        await assentar(alvo);
        // o indicador do modo de desenvolvimento não é do produto
        /**
         * Congela transição e animação antes de medir.
         *
         * O painel anima o recuo lateral (`transition-[padding] duration-200`)
         * quando a barra fixa entra em telas grandes. Medindo 150ms depois de
         * trocar a largura, a régua pegava o layout no meio do caminho e
         * acusava rolagem de 286px onde, parado, não há nenhuma. `reducedMotion`
         * não resolve: essa transição não está atrás de uma media query.
         */
        await alvo
          .addStyleTag({
            content:
              "nextjs-portal{display:none!important}" +
              "*,*::before,*::after{transition:none!important;animation:none!important}",
          })
          .catch(() => {});
        /**
         * Reaplica a largura DEPOIS de carregar.
         *
         * Trocar a viewport e só então navegar deixava o layout preso a uma
         * medida intermediária: a auditoria acusava rolagem de 286px que um
         * carregamento limpo na mesma largura não reproduz. Reaplicar força um
         * relayout no estado final, que é o que a pessoa vê.
         */
        await alvo.setViewportSize({ width: tela.w, height: tela.h });
        /**
         * Recarrega já na largura final.
         *
         * A aba é reaproveitada entre rotas e larguras, e o layout guardava
         * medida da largura anterior: a auditoria acusava 286px de rolagem
         * onde uma carga limpa na mesma largura mostra zero. Recarregar custa
         * segundos e é a diferença entre medir a página e medir o histórico
         * da aba.
         */
        await alvo.reload({ waitUntil: "domcontentloaded" });
        await assentar(alvo);
        await alvo
          .addStyleTag({
            content:
              "nextjs-portal{display:none!important}" +
              "*,*::before,*::after{transition:none!important;animation:none!important}",
          })
          .catch(() => {});
        await alvo.waitForTimeout(200);

        const achados = await alvo.evaluate(medir);
        medidas += 1;

        /**
         * Rolagem horizontal é reconferida em contexto limpo antes de virar
         * achado.
         *
         * A aba reaproveitada acusava rolagem que uma carga isolada na mesma
         * largura não reproduz — e alarme falso em auditoria é pior que
         * auditoria nenhuma, porque ensina a ignorar o relatório. Custa uma
         * aba a mais só quando há suspeita.
         */
        const suspeita = achados.findIndex((a) => a.tipo === "rolagem-horizontal");
        if (suspeita >= 0) {
          const limpo = await navegador.newContext({
            locale: "pt-BR",
            viewport: { width: tela.w, height: tela.h },
            hasTouch: tela.toque,
            isMobile: tela.toque,
            storageState: await alvo.context().storageState(),
          });
          const conferencia = await limpo.newPage();
          try {
            await conferencia.goto(BASE + rota, { waitUntil: "load", timeout: 45000 });
            await assentar(conferencia);
            const rolouMesmo = await conferencia.evaluate(() => {
              window.scrollTo(9999, 0);
              const x = Math.round(window.scrollX);
              window.scrollTo(0, 0);
              return x;
            });
            if (rolouMesmo <= 1) achados.splice(suspeita, 1);
            else achados[suspeita].detalhe += ` · confirmado em contexto limpo: ${rolouMesmo}px`;
          } catch {
            /* não deu para conferir: mantém o achado, para não esconder problema */
          }
          await conferencia.close();
          await limpo.close();
        }

        if (achados.length) {
          daRota.push({ largura: tela.nome, achados });
          if (comFotos) {
            const destino = path.join(
              SAIDA,
              grupo,
              `${rota.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${tela.w}.png`,
            );
            fs.mkdirSync(path.dirname(destino), { recursive: true });
            await alvo.screenshot({ path: destino, fullPage: true });
          }
        }
      } catch (erro) {
        daRota.push({
          largura: tela.nome,
          achados: [
            { tipo: "nao-abriu", detalhe: String(erro.message).split("\n")[0].slice(0, 90), seletor: rota },
          ],
        });
      }
    }

    if (daRota.length === 0) {
      console.log(`  ok    ${rota}`);
    } else {
      const total = daRota.reduce((s, l) => s + l.achados.length, 0);
      console.log(`  FALHA ${rota}  (${total} em ${daRota.length} largura(s))`);
      problemas.push({ grupo, rota, larguras: daRota });
    }
  }

  await pagina.close();
  await paginaToque.close();
  await contexto.close();
  await contextoToque.close();
}

console.log(`Auditoria de responsividade em ${BASE}`);
console.log(`larguras: ${larguras.map((l) => l.w).join(", ")}`);

await percorrer("publico", ROTAS.publico, null);
await percorrer("conta", ROTAS.conta, { rota: "/entrar", ...CLIENTE });
await percorrer("admin", ROTAS.admin, { rota: "/admin/entrar", ...EQUIPE });

await navegador.close();

/* ---------------------------------------------------------------- resumo */

const porTipo = {};
for (const p of problemas) {
  for (const l of p.larguras) {
    for (const a of l.achados) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1;
  }
}

console.log(`\n${"═".repeat(56)}`);
console.log(`${medidas} medições · ${problemas.length} rota(s) com problema`);

if (Object.keys(porTipo).length) {
  console.log("\npor tipo:");
  for (const [tipo, n] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${tipo}`);
  }

  console.log("\ndetalhe:");
  for (const p of problemas) {
    console.log(`\n  ${p.rota}`);
    for (const l of p.larguras) {
      console.log(`    ${l.largura}`);
      // no máximo 5 por largura: o resto é quase sempre o mesmo defeito repetido
      for (const a of l.achados.slice(0, 5)) {
        console.log(`      · [${a.tipo}] ${a.detalhe}`);
        console.log(`        ${a.seletor}`);
      }
      if (l.achados.length > 5) console.log(`      · … mais ${l.achados.length - 5}`);
    }
  }
} else {
  console.log("\nnenhum problema de responsividade encontrado.");
}

if (comFotos) console.log(`\nfotos em .shots/responsivo/`);

process.exit(problemas.length ? 1 : 0);
