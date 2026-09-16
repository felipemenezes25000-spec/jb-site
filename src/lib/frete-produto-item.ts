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

/**
 * Melhor Envio exige peso e três dimensões positivas. Se o cadastro não tem
 * isso, a PDP usa a tabela JB diretamente em vez de fazer uma chamada que já
 * sabemos que será recusada.
 */
export function itemAptoParaCotacaoExterna(
  item: ReturnType<typeof itemDaPdpParaCotacao>,
) {
  return (
    item.quantity > 0 &&
    (item.weightGrams ?? 0) > 0 &&
    (item.widthMm ?? 0) > 0 &&
    (item.heightMm ?? 0) > 0 &&
    (item.depthMm ?? 0) > 0
  );
}
