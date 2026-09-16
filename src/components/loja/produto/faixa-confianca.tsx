type Props = {
  certificado: boolean;
  garantiaMeses: number | null;
  temFrete: boolean;
  temInstalacao: boolean;
};

/**
 * Faixa de benefícios removida das fichas de produto.
 *
 * Mantemos o componente temporariamente como no-op para preservar a API da PDP
 * e evitar acoplar esta remoção visual a outras alterações da página. Assim,
 * nenhuma ficha em /loja/[slug] renderiza a faixa antiga de compra/garantia/
 * assistência, independentemente da condição ou dos dados do produto.
 */
export function FaixaConfianca(_props: Props) {
  return null;
}
