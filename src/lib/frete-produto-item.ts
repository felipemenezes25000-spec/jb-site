export type ProdutoParaCotacao = {
  id: string;
  name: string;
  priceCents: number;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
};

/**
 * Contrato puro da PDP com qualquer cotador externo.
 *
 * A ficha sempre pergunta pelo produto que está aberto, uma unidade. Manter
 * esta transformação fora das dependências de rede/cookies deixa a regra
 * testável e impede que carrinho/checkout voltem a vazar para a estimativa.
 */
export function itemDaPdpParaCotacao(produto: ProdutoParaCotacao) {
  return {
    id: produto.id,
    name: produto.name,
    quantity: 1,
    unitPriceCents: produto.priceCents,
    weightGrams: produto.weightGrams,
    widthMm: produto.widthMm,
    heightMm: produto.heightMm,
    depthMm: produto.depthMm,
  };
}
