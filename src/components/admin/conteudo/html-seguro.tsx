import { cn } from "@/lib/utils";

/* ============================================================================
   HTML de conteúdo — saneamento e exibição

   O editor de texto do painel salva HTML. HTML vindo de um editor é entrada de
   usuário como qualquer outra: antes de gravar, passa por aqui e sai com uma
   lista branca de tags e atributos. `dangerouslySetInnerHTML` só é usado
   depois disso.

   Por que a função mora num componente e não em @/lib: o arquivo de ações
   (`src/app/acoes/admin-conteudo.ts`) é um módulo "use server", onde todo
   export vira uma ação chamável pelo cliente — uma função pura não pode morar
   lá e ser reaproveitada na renderização. Mantendo a implementação aqui existe
   UMA versão da regra, usada na gravação e de novo na exibição: conteúdo
   antigo, importado do site anterior, também é limpo antes de aparecer.

   O que a lista branca deixa passar é exatamente o que o editor produz:
   parágrafo, ênfase, títulos, listas, citação, linha, código, link e imagem.
   Estilo só de alinhamento. Nada de script, iframe, formulário, evento
   (`on*`), `javascript:` nem `data:`.
   ============================================================================ */

type RegraDaTag = {
  /** Atributos aceitos nesta tag. Qualquer outro é descartado. */
  atributos?: readonly string[];
  /** Tag sem fechamento — br, hr, img. */
  vazia?: boolean;
};

const TAGS: Record<string, RegraDaTag> = {
  p: { atributos: ["style"] },
  br: { vazia: true },
  strong: {},
  em: {},
  u: {},
  s: {},
  h2: { atributos: ["style"] },
  h3: { atributos: ["style"] },
  h4: { atributos: ["style"] },
  ul: {},
  ol: {},
  li: {},
  blockquote: {},
  hr: { vazia: true },
  code: {},
  pre: {},
  figure: {},
  figcaption: {},
  a: { atributos: ["href", "title", "target", "rel"] },
  img: { atributos: ["src", "alt", "title", "width", "height"], vazia: true },
};

/**
 * Tags equivalentes, normalizadas na entrada. `h1` vira `h2` porque a página
 * pública já tem um `h1` — o título — e dois competindo quebram a leitura de
 * quem navega por cabeçalho.
 */
const RENOMEAR: Record<string, string> = {
  b: "strong",
  i: "em",
  ins: "u",
  del: "s",
  strike: "s",
  h1: "h2",
  h5: "h4",
  h6: "h4",
};

/** Tags cujo conteúdo também some — não basta tirar a marcação. */
const COM_CONTEUDO_DESCARTADO = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
];

const ESQUEMAS_DE_LINK = /^(https?:|mailto:|tel:)/i;
const ESQUEMA_DE_IMAGEM = /^https?:/i;

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  tab: "\t",
  newline: "\n",
  colon: ":",
};

/**
 * Decodifica entidades ANTES de conferir um endereço. Sem isto,
 * `java&#115;cript:alert(1)` passaria na checagem de esquema e só voltaria a
 * ser `javascript:` dentro do navegador.
 */
function decodificarEntidades(valor: string) {
  return valor
    .replace(/&#x([0-9a-fA-F]{1,6});?/g, (bruto, hex: string) => {
      const codigo = Number.parseInt(hex, 16);
      return Number.isFinite(codigo) && codigo <= 0x10ffff
        ? String.fromCodePoint(codigo)
        : bruto;
    })
    .replace(/&#(\d{1,7});?/g, (bruto, dec: string) => {
      const codigo = Number(dec);
      return Number.isFinite(codigo) && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : bruto;
    })
    .replace(/&([a-zA-Z]+);/g, (bruto, nome: string) => ENTIDADES[nome.toLowerCase()] ?? bruto);
}

/** Tira caracteres de controle e espaços que servem só para disfarçar o esquema. */
function normalizarEndereco(valor: string) {
  // caracteres de controle e espaços só servem para disfarçar o esquema
  return decodificarEntidades(valor).replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
}

function linkSeguro(bruto: string): string | null {
  const limpo = normalizarEndereco(bruto);
  if (!limpo) return null;
  if (limpo.startsWith("//")) return null; // protocolo herdado: fora da lista
  if (limpo.startsWith("#") || limpo.startsWith("/")) return bruto.trim();
  return ESQUEMAS_DE_LINK.test(limpo) ? bruto.trim() : null;
}

function imagemSegura(bruto: string): string | null {
  const limpo = normalizarEndereco(bruto);
  if (!limpo) return null;
  if (limpo.startsWith("//")) return null;
  if (limpo.startsWith("/")) return bruto.trim();
  return ESQUEMA_DE_IMAGEM.test(limpo) ? bruto.trim() : null;
}

function alinhamentoSeguro(bruto: string): string | null {
  const valor = decodificarEntidades(bruto).toLowerCase();
  const achado = /(?:^|;)\s*text-align\s*:\s*(left|right|center|justify)\s*(?:;|$)/.exec(valor);
  return achado ? `text-align: ${achado[1]}` : null;
}

function inteiroSeguro(bruto: string): string | null {
  const digitos = bruto.trim();
  return /^\d{1,5}$/.test(digitos) ? digitos : null;
}

function escaparTexto(texto: string) {
  return texto
    .replace(/&(?!#?[a-zA-Z0-9]{1,8};)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escaparAtributo(valor: string) {
  return valor
    .replace(/&(?!#?[a-zA-Z0-9]{1,8};)/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const ATRIBUTO =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function lerAtributos(bruto: string): Map<string, string> {
  const mapa = new Map<string, string>();
  ATRIBUTO.lastIndex = 0;
  let achado: RegExpExecArray | null;
  while ((achado = ATRIBUTO.exec(bruto)) !== null) {
    const nome = achado[1].toLowerCase();
    const valor = achado[2] ?? achado[3] ?? achado[4] ?? "";
    if (!mapa.has(nome)) mapa.set(nome, valor);
  }
  return mapa;
}

/** Monta os atributos aceitos de uma tag, já escapados. */
function atributosLimpos(tag: string, regra: RegraDaTag, brutos: Map<string, string>) {
  const aceitos = regra.atributos ?? [];
  const saida: string[] = [];
  let alvoEmBranco = false;

  for (const nome of aceitos) {
    const valor = brutos.get(nome);
    if (valor === undefined) continue;

    let final: string | null = null;

    if (nome === "href") final = linkSeguro(valor);
    else if (nome === "src") final = imagemSegura(valor);
    else if (nome === "style") final = alinhamentoSeguro(valor);
    else if (nome === "width" || nome === "height") final = inteiroSeguro(valor);
    else if (nome === "target") final = valor.trim() === "_blank" ? "_blank" : null;
    else if (nome === "rel") final = null; // reescrito abaixo, nunca copiado
    else final = valor.trim() === "" ? null : valor;

    if (final === null) continue;
    if (nome === "target") alvoEmBranco = true;
    saida.push(`${nome}="${escaparAtributo(final)}"`);
  }

  // link que abre em outra aba sem isto entrega window.opener para a outra página
  if (tag === "a" && alvoEmBranco) saida.push('rel="noopener noreferrer"');

  return saida.length > 0 ? ` ${saida.join(" ")}` : "";
}

const TAG_HTML = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

/**
 * Devolve o HTML só com o que está na lista branca.
 *
 * Tag desconhecida perde a marcação mas mantém o texto — despublicar um
 * parágrafo porque ele veio dentro de um `<section>` seria pior do que o
 * problema. Tag de risco (script, iframe, form…) some com conteúdo e tudo.
 */
export function sanitizarHtml(entrada: string | null | undefined): string {
  if (!entrada) return "";

  let bruto = String(entrada);

  // comentários, doctype e instruções de processamento
  bruto = bruto.replace(/<!--[\s\S]*?-->/g, "");
  bruto = bruto.replace(/<![\s\S]*?>/g, "");
  bruto = bruto.replace(/<\?[\s\S]*?(\?>|$)/g, "");

  for (const tag of COM_CONTEUDO_DESCARTADO) {
    bruto = bruto.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    // aberta e nunca fechada: o resto do documento vai junto
    bruto = bruto.replace(new RegExp(`<${tag}\\b[\\s\\S]*$`, "i"), "");
  }

  const saida: string[] = [];
  const pilha: string[] = [];
  let posicao = 0;
  TAG_HTML.lastIndex = 0;

  let achado: RegExpExecArray | null;
  while ((achado = TAG_HTML.exec(bruto)) !== null) {
    if (achado.index > posicao) {
      saida.push(escaparTexto(bruto.slice(posicao, achado.index)));
    }
    posicao = TAG_HTML.lastIndex;

    const fechamento = Boolean(achado[1]);
    const original = achado[2].toLowerCase();
    const nome = RENOMEAR[original] ?? original;
    const regra = TAGS[nome];

    if (!regra) continue; // tag fora da lista: marcação some, conteúdo fica

    if (fechamento) {
      const indice = pilha.lastIndexOf(nome);
      if (indice === -1) continue; // fechamento órfão
      for (let i = pilha.length - 1; i >= indice; i -= 1) saida.push(`</${pilha[i]}>`);
      pilha.length = indice;
      continue;
    }

    const brutos = lerAtributos(achado[3] ?? "");

    // imagem sem endereço aceitável não vira `<img>` vazio: some inteira.
    // link sem endereço aceitável perde a marcação e mantém o texto.
    if (nome === "img" && !imagemSegura(brutos.get("src") ?? "")) continue;
    if (nome === "a" && !linkSeguro(brutos.get("href") ?? "")) continue;

    const atributos = atributosLimpos(nome, regra, brutos);

    if (regra.vazia) {
      saida.push(`<${nome}${atributos} />`);
      continue;
    }

    saida.push(`<${nome}${atributos}>`);
    pilha.push(nome);
  }

  if (posicao < bruto.length) saida.push(escaparTexto(bruto.slice(posicao)));
  for (let i = pilha.length - 1; i >= 0; i -= 1) saida.push(`</${pilha[i]}>`);

  const limpo = saida.join("");
  return textoDoHtml(limpo) === "" && !/<(img|hr|br)\b/i.test(limpo) ? "" : limpo;
}

/** Texto puro do HTML — para contar caracteres, resumir e checar vazio. */
export function textoDoHtml(html: string | null | undefined): string {
  if (!html) return "";
  return decodificarEntidades(String(html).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Um trecho legível do conteúdo, para listagem. */
export function resumoDoHtml(html: string | null | undefined, limite = 140): string {
  const texto = textoDoHtml(html);
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite).replace(/\s+\S*$/, "")}…`;
}

/* ------------------------------------------------------------- exibição */

/**
 * Tipografia do conteúdo rico sem depender de plugin: as regras são aplicadas
 * por seletor de filho, então valem para o HTML que veio do banco.
 */
const TIPOGRAFIA = [
  "text-[0.9375rem] leading-relaxed text-graf-700",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_p]:my-3",
  "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-graf-950",
  "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-graf-900",
  "[&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-graf-900",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1 [&_li]:pl-1",
  "[&_a]:font-medium [&_a]:text-jb-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-jb-800",
  "[&_strong]:font-bold [&_strong]:text-graf-900",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-jb-200 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_hr]:my-6 [&_hr]:border-graf-200",
  "[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_code]:rounded [&_code]:bg-graf-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-graf-200 [&_pre]:bg-graf-50 [&_pre]:p-4 [&_pre]:text-graf-800",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_figcaption]:mt-1 [&_figcaption]:text-xs [&_figcaption]:text-graf-500",
].join(" ");

/** Renderiza o HTML do CMS já saneado. Componente de servidor. */
export function HtmlSeguro({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const limpo = sanitizarHtml(html);
  if (!limpo) return null;

  return (
    <div
      className={cn(TIPOGRAFIA, className)}
      // conteúdo passou por sanitizarHtml logo acima — lista branca de tags,
      // atributos e esquemas de URL
      dangerouslySetInnerHTML={{ __html: limpo }}
    />
  );
}
