/* ============================================================================
   Homônimos do catálogo — dois cadastros, um nome só

   O catálogo da JB nasceu de duas cargas: a do site em PHP (`prisma/seed.ts`,
   slugs como `bioseguranca`) e a do protótipo aprovado
   (`prisma/catalogo-demo.json`, slugs como `biosseguranca`), com a carga de
   demonstração de operação por cima (`demo-schuster`). O resultado é visível
   na loja: "Biossegurança" aparece duas vezes na barra de filtros e nos
   atalhos, e "Schuster" aparece duas vezes na parede de marcas — uma com
   equipamentos e outra sob consulta.

   Para quem visita não existe "o cadastro certo": existem duas opções com o
   mesmo nome, e escolher uma esconde metade do que ela promete. Então a loja
   pública passa a tratar cadastros de mesmo nome como uma opção só — mostra
   um rótulo, soma as contagens e, quando a pessoa filtra por ele, filtra por
   todos os cadastros daquele nome.

   Isto NÃO substitui a limpeza do banco, que é o conserto de verdade e está
   em `scripts/unificar-duplicatas.ts`. É a rede de proteção: enquanto os
   registros duplicados existirem, a vitrine não os mostra como escolhas
   diferentes; depois da limpeza, este módulo simplesmente não encontra mais
   nada para juntar.
   ============================================================================ */

/**
 * Chave de comparação de nome: sem acento, sem caixa e sem pontuação.
 *
 * "Biossegurança", "biossegurança" e "Biosseguranca" são a mesma prateleira
 * para quem compra. Grafia diferente do mesmo termo — `Biosegurança` com um
 * "s" — continua sendo outra chave de propósito: juntar por semelhança
 * aproximada esconderia um erro de cadastro em vez de revelá-lo, e a correção
 * de grafia já tem dono em `scripts/conteudo-categorias.ts`.
 */
export function chaveDeNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** O mínimo que uma opção de vitrine precisa ter para ser unificada. */
export type Homonimo = {
  slug: string;
  nome: string;
  /** Quantos equipamentos publicados o cadastro tem. Ausente conta como 0. */
  quantidade?: number;
};

export type Unificado<T extends Homonimo> = T & {
  /** Todos os slugs que este rótulo passou a representar, o canônico incluso. */
  slugs: string[];
};

/**
 * Junta entradas de mesmo nome numa só.
 *
 * O cadastro canônico é o que tem mais equipamentos publicados — é o que a
 * loja de fato usa e o que tem mais a perder num link trocado. Empate mantém
 * a ordem em que a consulta veio, que já é a ordem editorial do painel
 * (`order`, depois `name`).
 *
 * A quantidade resultante é a soma, porque o clique também passa a somar: um
 * rótulo "Biossegurança 2" só é honesto se a lista do outro lado trouxer os
 * dois equipamentos.
 */
export function unificarPorNome<T extends Homonimo>(itens: T[]): Unificado<T>[] {
  const grupos = new Map<string, Unificado<T>>();

  for (const item of itens) {
    const chave = chaveDeNome(item.nome);
    const atual = grupos.get(chave);

    if (!atual) {
      grupos.set(chave, { ...item, slugs: [item.slug] });
      continue;
    }

    const mandaOItem = (item.quantidade ?? 0) > (atual.quantidade ?? 0);
    const slugs = [...atual.slugs, item.slug];

    grupos.set(chave, {
      ...(mandaOItem ? item : atual),
      slugs,
      quantidade: (atual.quantidade ?? 0) + (item.quantidade ?? 0),
    } as Unificado<T>);
  }

  return [...grupos.values()];
}

/**
 * Mapa slug → todos os slugs de mesmo nome.
 *
 * É o que permite ao filtro continuar usando um slug só na URL — endereço
 * curto, compartilhável e estável — enquanto a consulta ao banco abre esse
 * slug em todos os cadastros que carregam aquele nome.
 */
export function mapaDeSinonimos(itens: Homonimo[]): Map<string, string[]> {
  const porChave = new Map<string, string[]>();
  for (const item of itens) {
    const chave = chaveDeNome(item.nome);
    porChave.set(chave, [...(porChave.get(chave) ?? []), item.slug]);
  }

  const mapa = new Map<string, string[]>();
  for (const item of itens) {
    mapa.set(item.slug, porChave.get(chaveDeNome(item.nome)) ?? [item.slug]);
  }
  return mapa;
}
