export const TIPOS_RELACAO_PRODUTO = ["alternativa", "acessorio", "complemento"] as const;

export type TipoRelacaoProduto = (typeof TIPOS_RELACAO_PRODUTO)[number];

export type RelacaoProdutoTipada = {
  targetId: string;
  tipo: TipoRelacaoProduto;
  ordem: number;
};

/**
 * O schema atual de ProductRelation só possui `order`.
 *
 * Para evoluir a UX sem uma migration destrutiva no meio de uma branch ativa,
 * reservamos faixas de ordem por intenção comercial. Relações antigas (0..999)
 * continuam sendo alternativas automaticamente.
 *
 * Depois, uma migration pode materializar `tipo` como enum/coluna sem perda,
 * porque a informação já está determinística aqui.
 */
const FAIXA = 1_000;

const BASE_POR_TIPO: Record<TipoRelacaoProduto, number> = {
  alternativa: 0,
  acessorio: FAIXA,
  complemento: FAIXA * 2,
};

export const ROTULO_TIPO_RELACAO: Record<TipoRelacaoProduto, string> = {
  alternativa: "Alternativa",
  acessorio: "Acessório",
  complemento: "Complemento",
};

export const AJUDA_TIPO_RELACAO: Record<TipoRelacaoProduto, string> = {
  alternativa: "Outro equipamento que pode substituir este na decisão de compra.",
  acessorio: "Item compatível vendido para completar ou repor algo deste equipamento.",
  complemento: "Produto que costuma ser usado junto, mas não substitui o equipamento.",
};

export function codificarOrdemRelacao(tipo: TipoRelacaoProduto, ordemNoGrupo: number) {
  const ordem = Math.max(0, Math.min(FAIXA - 1, Math.trunc(ordemNoGrupo)));
  return BASE_POR_TIPO[tipo] + ordem;
}

export function decodificarOrdemRelacao(order: number): { tipo: TipoRelacaoProduto; ordem: number } {
  const valor = Number.isFinite(order) ? Math.max(0, Math.trunc(order)) : 0;

  if (valor >= BASE_POR_TIPO.complemento) {
    return { tipo: "complemento", ordem: valor - BASE_POR_TIPO.complemento };
  }

  if (valor >= BASE_POR_TIPO.acessorio) {
    return { tipo: "acessorio", ordem: valor - BASE_POR_TIPO.acessorio };
  }

  return { tipo: "alternativa", ordem: valor };
}

export function ordenarRelacoesTipadas(relacoes: RelacaoProdutoTipada[]) {
  const peso: Record<TipoRelacaoProduto, number> = {
    alternativa: 0,
    acessorio: 1,
    complemento: 2,
  };

  return [...relacoes].sort((a, b) => peso[a.tipo] - peso[b.tipo] || a.ordem - b.ordem);
}

/**
 * Escopo para preencher automaticamente as lacunas da comparação.
 *
 * Marca não basta para dizer que dois equipamentos substituem um ao outro: a
 * mesma fabricante pode vender fotopolimerizador, autoclave e compressor. A
 * relação manual continua sendo a fonte mais forte; quando ela não traz duas
 * alternativas, a automação só completa com itens da MESMA categoria.
 *
 * Sem categoria não há fallback automático. Melhor mostrar menos comparação
 * do que preencher uma tabela com um produto apenas porque compartilha marca.
 */
export function categoriaDaAlternativaAutomatica(categoryId: string | null | undefined) {
  const categoria = categoryId?.trim();
  return categoria || null;
}
