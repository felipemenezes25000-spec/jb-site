/* ============================================================================
   Caça-rótulo-vertical

   Procura o defeito de layout que a ficha técnica teve em 15/09/2026: um
   elemento de texto espremido a quase zero de largura, com o texto descendo
   **uma letra por linha**. Medido lá: `<dt>Requisitos do local</dt>` com 0 px
   de largura e 340 px de altura.

   A causa é sempre a mesma família — uma trilha de grade `auto` (que se
   dimensiona por `max-content`) ao lado de uma `minmax(0,1fr)` (que encolhe
   até zero), ou um flex sem `min-w-0` em quem deveria ceder. Quando o vizinho
   tem texto longo, ele leva a largura inteira e o outro vai a zero.

   O detector não olha CSS: olha geometria. Um elemento com texto cuja caixa é
   mais alta que larga por uma margem absurda só pode estar quebrando por
   caractere. É por isso que ele acha casos que nenhum `grep` acharia.

   Uso:
     node scripts/texto-vertical.mjs                  # localhost:3000
     BASE=http://localhost:61483 node scripts/texto-vertical.mjs
     BASE=https://jb-plataforma.vercel.app node scripts/texto-vertical.mjs
   ============================================================================ */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";

/** Larguras onde a coluna aperta: desktop largo, desktop estreito e tablet. */
const LARGURAS = [1440, 1280, 1024, 768, 390];

const ROTAS = [
  "/",
  /* As fichas de produto vêm primeiro: foi nelas que o defeito apareceu, e é
     onde a coluna é mais estreita (um terço da largura). Uma de cada família,
     porque o que estoura é o VALOR longo, e ele muda por produto. */
  "/loja/autoclave-12l-revisada",
  "/loja/cadeira-equipo-completo-pro",
  "/loja/seladora-de-embalagens-30cm",
  "/loja/compressor-isento-de-oleo-40l",
  "/loja/raio-x-intraoral-parede",
  "/loja",
  "/seminovos",
  "/novos",
  "/usados",
  "/marcas",
  "/comparar?p=autoclave-12l-revisada&p=autoclave-vertical-18l-classe-b&p=cuba-lavadora-ultrassonica-7l",
  "/carrinho",
  "/orcamento",
  "/assistencia-tecnica",
  "/assistencia-tecnica/solicitar",
  "/simulador-de-custo?reparo=2800&seminovo=7490&novo=14980&manutencaoReparo=900&manutencaoSeminovo=600&manutencaoNovo=400&instalacao=1200&parada=800",
  "/busca?q=autoclave",
  "/contato",
  "/faq",
  "/sobre",
  "/estrutura",
  "/entrega",
  "/planos-de-manutencao",
  "/manutencao-preventiva",
];

/**
 * O sinal do defeito.
 *
 * Largura menor que `MAX_LARGURA` com altura maior que `MIN_ALTURA` e texto
 * com mais de três caracteres. Ícone, pastilha de um dígito e barra decorativa
 * não têm texto suficiente para entrar; parágrafo normal nunca fica com 12 px
 * de largura.
 */
const MAX_LARGURA = 26;
const MIN_ALTURA = 56;

const DETECTOR = ({ maxLargura, minAltura }) => {
  const problemas = [];
  const vistos = new Set();

  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 0) continue; // só folhas de texto
    const texto = (el.textContent ?? "").trim();
    if (texto.length < 4) continue;

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // fora da árvore de layout
    if (r.width > maxLargura || r.height < minAltura) continue;

    /* O que ninguém vê não é defeito de layout.

       As iscas anti-robô dos formulários são exatamente isto: `aria-hidden`,
       `left:-9999px` e uma caixa de 1×1 com `overflow:hidden`. O rótulo dentro
       delas mede 14×478px e dispara o detector sem que exista problema algum.
       A regra vale em geral: fora da tela, `hidden` ou `aria-hidden` sai. */
    if (r.right <= 0 || r.bottom <= 0) continue;
    if (el.closest("[hidden], [aria-hidden='true'], [aria-hidden='']")) continue;

    const estilo = getComputedStyle(el);
    if (estilo.visibility === "hidden" || estilo.opacity === "0") continue;

    // caminho curto até a raiz, para dar o endereço do elemento
    const caminho = [];
    let n = el;
    while (n && caminho.length < 4) {
      const classe =
        typeof n.className === "string" && n.className
          ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";
      caminho.push(n.tagName.toLowerCase() + classe);
      n = n.parentElement;
    }

    const chave = caminho.join(">") + texto.slice(0, 20);
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    problemas.push({
      texto: texto.slice(0, 40),
      largura: Math.round(r.width),
      altura: Math.round(r.height),
      onde: caminho.join(" < "),
    });
  }

  return problemas;
};

const navegador = await chromium.launch();
let total = 0;

try {
  for (const largura of LARGURAS) {
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: 900 },
      locale: "pt-BR",
    });
    const pagina = await contexto.newPage();

    for (const rota of ROTAS) {
      try {
        const resposta = await pagina.goto(`${BASE}${rota}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        if (!resposta || resposta.status() >= 400) {
          console.log(`  ! ${largura}px ${rota} → HTTP ${resposta?.status() ?? "?"}`);
          continue;
        }
        await pagina.waitForTimeout(1200);

        const achados = await pagina.evaluate(DETECTOR, {
          maxLargura: MAX_LARGURA,
          minAltura: MIN_ALTURA,
        });

        for (const a of achados) {
          total += 1;
          console.log(
            `\n[${largura}px] ${rota}\n  "${a.texto}"  ${a.largura}×${a.altura}px\n  ${a.onde}`,
          );
        }
      } catch (erro) {
        console.log(`  ! ${largura}px ${rota} → ${erro.message.split("\n")[0]}`);
      }
    }

    await contexto.close();
  }
} finally {
  await navegador.close();
}

console.log(
  total === 0
    ? "\nNenhum texto quebrando por caractere."
    : `\n${total} ocorrência(s) de texto vertical.`,
);
process.exitCode = total === 0 ? 0 : 1;
