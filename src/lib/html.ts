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
