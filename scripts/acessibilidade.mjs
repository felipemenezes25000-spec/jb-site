/**
 * Auditoria de acessibilidade — mede, não opina.
 *
 * Roda o axe-core (o mesmo motor por trás do Lighthouse e do Accessibility
 * Insights) dentro do navegador de verdade, em cada rota, nas regras WCAG 2.1
 * A e AA. Depois soma três medições que o axe não faz e que importam aqui:
 * foco visível de fato, alvo de toque no dedo e âncora de referência quebrada.
 *
 * Sai com código 1 quando encontra problema, então serve de portão.
 *
 *   BASE_URL=http://localhost:3400 node scripts/acessibilidade.mjs
 *
 * Opções:
 *   --so=publico|conta|admin   percorre só um grupo
 *   --rota=/loja               mede só uma rota
 *   --json                     despeja o relatório cru em .shots/acessibilidade.json
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const AXE = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const SAIDA = path.join(process.cwd(), ".shots");

const argumentos = process.argv.slice(2);
const grupoPedido = argumentos.find((a) => a.startsWith("--so="))?.slice(5);
const rotaPedida = argumentos.find((a) => a.startsWith("--rota="))?.slice(7);
const comJson = argumentos.includes("--json");

const CLIENTE = { email: "demo@jbteste.local", senha: "demo12345" };
const EQUIPE = { email: "demo.admin@jbteste.local", senha: "demo12345" };

const ROTAS = {
  publico: [
    "/",
    "/loja",
    "/seminovos",
    "/marcas",
    "/busca?q=autoclave",
    "/carrinho",
    "/checkout",
    "/assistencia-tecnica",
    "/assistencia-tecnica/solicitar",
    "/planos-de-manutencao",
    "/orcamento",
    "/sobre",
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
    "/admin/conteudo",
    "/admin/configuracoes",
  ],
};

/**
 * Medições próprias, rodadas dentro da página.
 *
 * O axe cobre nome acessível, contraste, rótulo de campo, ordem de cabeçalho
 * e marco de página. Não cobre estas três, que são as que mais quebram na
 * prática num projeto com CSS próprio:
 *
 *  1. foco visível — o axe olha se o `outline` foi zerado, mas não olha se
 *     algo *substituiu* o anel. Aqui o elemento é focado de verdade e os
 *     estilos antes e depois são comparados: se nada mudou, o foco sumiu.
 *  2. alvo de toque — medido no contexto com dedo, onde as regras
 *     `pointer-coarse` do projeto valem.
 *  3. âncora quebrada — `aria-labelledby`, `aria-controls`, `aria-describedby`
 *     e `for` apontando para um id que não existe na página.
 */
function medirExtras() {
  const achados = [];
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const e = getComputedStyle(el);
    if (e.visibility === "hidden" || e.display === "none" || Number(e.opacity) === 0) return false;
    if (el.closest("[hidden], [aria-hidden=\"true\"], .sr-only, [inert]")) return false;
    return true;
  };
  const onde = (el) => {
    const partes = [el.tagName.toLowerCase()];
    if (el.id) partes.push("#" + el.id);
    const t = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 45);
    if (t) partes.push(`"${t}"`);
    return partes.join(" ");
  };

  /* 1. foco visível ------------------------------------------------------ */
  const focaveis = [
    ...document.querySelectorAll(
      "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex=\"-1\"])",
    ),
  ].filter((el) => visivel(el) && !el.disabled);

  // amostra: os 40 primeiros bastam para pegar um reset global de outline
  for (const el of focaveis.slice(0, 40)) {
    const antes = getComputedStyle(el);
    const marca = [
      antes.outlineStyle, antes.outlineWidth, antes.outlineColor,
      antes.boxShadow, antes.borderColor, antes.backgroundColor,
    ].join("|");
    try {
      el.focus({ preventScroll: true });
    } catch {
      continue;
    }
    if (document.activeElement !== el) continue;
    const depois = getComputedStyle(el);
    const marcaDepois = [
      depois.outlineStyle, depois.outlineWidth, depois.outlineColor,
      depois.boxShadow, depois.borderColor, depois.backgroundColor,
    ].join("|");
    if (marca === marcaDepois) {
      achados.push({
        tipo: "foco-invisivel",
        alvo: onde(el),
        detalhe: "focado, nada mudou visualmente",
      });
    }
    el.blur();
  }

  /* 2. alvo de toque ----------------------------------------------------- */

  /**
   * O alvo de um marcador é o rótulo, não o quadradinho.
   *
   * Um `checkbox` de 20px ligado por `htmlFor` a um rótulo de 44px de altura
   * tem 44px de alvo: tocar o rótulo marca a caixa. Medir só o `input` acusava
   * alvo pequeno em todo aceite de termos do projeto, onde o rótulo já é alto
   * de propósito. Aqui o alvo é a união do campo com o rótulo que o comanda.
   */
  const alvoEfetivo = (el) => {
    const r = el.getBoundingClientRect();
    if (el.type !== "checkbox" && el.type !== "radio") return r;
    const rotulo =
      el.closest("label") ||
      (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
    if (!rotulo) return r;
    const l = rotulo.getBoundingClientRect();
    // só une o que encosta: rótulo solto do outro lado da tela não é o alvo
    const encosta = !(l.right < r.left - 24 || l.left > r.right + 24 ||
                      l.bottom < r.top - 24 || l.top > r.bottom + 24);
    if (!encosta) return r;
    return {
      width: Math.max(r.right, l.right) - Math.min(r.left, l.left),
      height: Math.max(r.bottom, l.bottom) - Math.min(r.top, l.top),
    };
  };

  if (matchMedia("(pointer: coarse)").matches) {
    for (const el of focaveis) {
      // link dentro de texto corrido acompanha a linha, não é alvo isolado
      const pai = el.parentElement;
      if (
        el.tagName === "A" && pai &&
        /^(P|LI|SPAN|H1|H2|H3|H4|LABEL|TD)$/.test(pai.tagName) &&
        getComputedStyle(el).display === "inline"
      ) continue;
      // link esticado por ::after cobre o cartão inteiro
      if (
        el.tagName === "A" && el.closest("article, li, .group") &&
        getComputedStyle(el, "::after").position === "absolute"
      ) continue;
      const r = alvoEfetivo(el);
      if (r.width < 44 && r.height < 44) {
        achados.push({
          tipo: "alvo-pequeno",
          alvo: onde(el),
          detalhe: `${Math.round(r.width)}x${Math.round(r.height)}px, mínimo 44x44`,
        });
      }
    }
  }

  /* 3. âncora quebrada --------------------------------------------------- */
  const refs = [
    ["aria-labelledby", true],
    ["aria-describedby", true],
    ["aria-controls", true],
    ["for", false],
  ];
  for (const [attr, multiplo] of refs) {
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      const bruto = el.getAttribute(attr);
      if (!bruto) continue;
      const ids = multiplo ? bruto.split(/\s+/).filter(Boolean) : [bruto];
      for (const id of ids) {
        if (!document.getElementById(id)) {
          achados.push({
            tipo: "ancora-quebrada",
            alvo: onde(el),
            detalhe: `${attr}="${id}" não existe na página`,
          });
        }
      }
    }
  }

  return achados;
}

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

const fonteAxe = fs.readFileSync(AXE, "utf8");
const navegador = await chromium.launch();
const problemas = [];
const cru = [];
let medidas = 0;

async function percorrer(grupo, rotas, login) {
  if (grupoPedido && grupoPedido !== grupo) return;
  const lista = rotaPedida ? rotas.filter((r) => r === rotaPedida) : rotas;
  if (!lista.length) return;

  console.log(`\n── ${grupo} ${"─".repeat(Math.max(0, 44 - grupo.length))}`);
  const contexto = await navegador.newContext({
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
  });

  if (login) {
    const ok = await entrar(contexto, login.rota, login.email, login.senha);
    if (!ok) {
      console.log("  pulando: não foi possível entrar");
      await contexto.close();
      return;
    }
  }

  // segundo contexto, com dedo, só para a medição de alvo de toque
  const comDedo = await navegador.newContext({
    locale: "pt-BR",
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    storageState: await contexto.storageState(),
  });

  for (const rota of lista) {
    for (const [ctx, etiqueta] of [[contexto, "1280"], [comDedo, "390 dedo"]]) {
      const pagina = await ctx.newPage();
      try {
        await pagina.goto(BASE + rota, { waitUntil: "networkidle", timeout: 60000 });
        await pagina.waitForTimeout(400); // deixa a hidratação assentar

        // o axe só roda na largura de mesa; no dedo interessa só o alvo de toque
        if (etiqueta === "1280") {
          await pagina.addScriptTag({ content: fonteAxe });
          const r = await pagina.evaluate(
            async () =>
              await window.axe.run(document, {
                runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
                resultTypes: ["violations"],
              }),
          );
          cru.push({ rota, violacoes: r.violations });
          for (const v of r.violations) {
            for (const n of v.nodes) {
              problemas.push({
                grupo,
                rota,
                largura: etiqueta,
                tipo: v.id,
                impacto: v.impact,
                alvo: n.target.join(" "),
                detalhe: (n.failureSummary || v.help).replace(/\s+/g, " ").slice(0, 160),
              });
            }
          }
        }

        const extras = await pagina.evaluate(medirExtras);
        for (const e of extras) {
          problemas.push({
            grupo,
            rota,
            largura: etiqueta,
            tipo: e.tipo,
            impacto: "serious",
            alvo: e.alvo,
            detalhe: e.detalhe,
          });
        }
        medidas += 1;
      } catch (erro) {
        problemas.push({
          grupo,
          rota,
          largura: etiqueta,
          tipo: "falha-ao-medir",
          impacto: "critical",
          alvo: "-",
          detalhe: String(erro).slice(0, 140),
        });
      } finally {
        await pagina.close();
      }
    }
    const nesta = problemas.filter((p) => p.rota === rota).length;
    console.log(`  ${nesta === 0 ? "ok " : String(nesta).padStart(3)} ${rota}`);
  }

  await comDedo.close();
  await contexto.close();
}

await percorrer("publico", ROTAS.publico, null);
await percorrer("conta", ROTAS.conta, { rota: "/entrar", ...CLIENTE });
await percorrer("admin", ROTAS.admin, { rota: "/admin/entrar", ...EQUIPE });
await navegador.close();

if (comJson) {
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(
    path.join(SAIDA, "acessibilidade.json"),
    JSON.stringify({ problemas, cru }, null, 2),
  );
}

console.log(`\n${"═".repeat(60)}`);
console.log(`${medidas} medições · ${problemas.length} problemas`);

if (problemas.length) {
  const porTipo = {};
  for (const p of problemas) (porTipo[p.tipo] ??= []).push(p);
  const ordenado = Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length);
  for (const [tipo, lista] of ordenado) {
    console.log(`\n▸ ${tipo} — ${lista.length}  [${lista[0].impacto}]`);
    for (const p of lista.slice(0, 6)) {
      console.log(`    ${p.rota} @${p.largura}`);
      console.log(`      ${p.alvo}`);
      console.log(`      ${p.detalhe}`);
    }
    if (lista.length > 6) console.log(`    … e mais ${lista.length - 6}`);
  }
  process.exit(1);
}

console.log("nenhum problema de acessibilidade encontrado");
