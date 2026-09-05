import { Fragment, createElement, type ReactNode } from "react";

/** Equivalente ao nl2br() do PHP, mas devolvendo nós de React (sem HTML cru). */
export function nl2br(text: string): ReactNode {
  const linhas = text.split(/\r\n|\r|\n/);
  return linhas.map((linha, i) =>
    createElement(Fragment, { key: i }, linha, i < linhas.length - 1 ? createElement("br") : null),
  );
}

/** Equivalente ao strip_tags() do PHP. */
export function stripTags(html: string) {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * nl2br() do PHP aplicado sobre HTML: insere <br /> antes da quebra e mantém
 * a quebra original. O site antigo chamava nl2br() no bloco de endereço e na
 * descrição de cada solução — sem isso o texto sai todo em um parágrafo só.
 */
export function nl2brHtml(html: string) {
  return html.replace(/(\r\n|\n\r|\n|\r)/g, "<br />$1");
}

/**
 * Entidades nomeadas que aparecem no conteúdo herdado do site antigo. O
 * material veio de um editor que gravava acento como entidade (`C&acirc;mera`)
 * e usava `&bull;` como marcador de lista. Sem traduzir isso, o texto chega ao
 * cliente com o código à mostra.
 */
const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  bull: "•",
  middot: "·",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  deg: "°",
  ordf: "ª",
  ordm: "º",
  reg: "®",
  copy: "©",
  trade: "™",
  euro: "€",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  Agrave: "À", Egrave: "È", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù",
  acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  Acirc: "Â", Ecirc: "Ê", Icirc: "Î", Ocirc: "Ô", Ucirc: "Û",
  atilde: "ã", otilde: "õ", ntilde: "ñ",
  Atilde: "Ã", Otilde: "Õ", Ntilde: "Ñ",
  auml: "ä", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü",
  Auml: "Ä", Euml: "Ë", Iuml: "Ï", Ouml: "Ö", Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
};

/** Traduz `&bull;`, `&acirc;`, `&#233;` e `&#xE9;` para o caractere real. */
function decodificarEntidades(texto: string) {
  return texto.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (bruto, corpo: string) => {
    if (corpo.startsWith("#")) {
      const numero =
        corpo[1] === "x" || corpo[1] === "X"
          ? Number.parseInt(corpo.slice(2), 16)
          : Number.parseInt(corpo.slice(1), 10);
      if (!Number.isFinite(numero) || numero <= 0 || numero > 0x10ffff) return bruto;
      try {
        return String.fromCodePoint(numero);
      } catch {
        return bruto;
      }
    }
    return ENTIDADES[corpo] ?? bruto;
  });
}

/**
 * Texto corrido a partir de um campo que guarda HTML.
 *
 * Descrição de categoria, de marca e de produto foram importadas do site
 * antigo com marcação dentro. Onde a interface mostra esse campo como texto —
 * cartão de catálogo, subtítulo de página, `<meta name="description">` — o
 * HTML precisa virar leitura, não código à mostra.
 *
 * `<br>`, `</p>` e `</li>` viram separador de frase para a lista não colar
 * numa palavra só; o resto some. Devolve string vazia quando não sobra texto,
 * o que deixa o `?` de quem chama esconder o campo inteiro.
 */
export function textoDeHtml(html: string | null | undefined): string {
  if (!html) return "";

  const semMarcacao = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|tr)\s*>/gi, " · ")
    .replace(/<\/li\s*>/gi, " · ")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]*>/g, "");

  return decodificarEntidades(semMarcacao)
    .replace(/[•▪◦]/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/(?:·\s*){2,}/g, "· ")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .trim();
}
