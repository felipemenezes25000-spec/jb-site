import { calcularParcelas, formatarPreco } from "@/lib/format";

import { disponibilidadeDoProduto, type Disponibilidade } from "./disponibilidade";

/* ============================================================================
   O que um cartão de produto AFIRMA

   Três cartões desenhavam o mesmo produto — o da home, o do catálogo e o da
   conta — e cada um escrevia as próprias frases a partir das mesmas colunas.
   Para a mesma seladora de R$ 1.480,00 em 12×, no mesmo minuto:

     home     "12x R$ 123,33"
     conta    "12x de R$ 123,33 sem juros"
     catálogo "12× de R$ 123,33 sem juros"

   E quando o produto era sob orçamento:

     home     "A equipe responde com prazo"
     conta    "Preço e prazo com a equipe JB"
     catálogo "Preço e prazo com a equipe JB"

   Nenhuma das seis está errada. O problema é serem seis: quem vai da home
   para o catálogo lê a mesma oferta com outra redação e não tem como saber se
   mudou alguma coisa. É o mesmo defeito que `disponibilidadeDoProduto` já
   fechou para o estoque, uma camada acima.

   Aqui ficam as FRASES. A cor, o tamanho e a moldura continuam sendo decisão
   de quem desenha o cartão — o que o site diz sobre preço, pagamento e
   desconto, não.
   ============================================================================ */

export type ProdutoDoCartao = {
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
};

export type Parcelamento = { max: number; minimoCents: number };

export type ClaimsDoCartao = {
  /** "R$ 1.480,00" ou "Sob orçamento". */
  preco: string;
  /** A linha abaixo do preço: parcela, à vista, ou o que a equipe responde. */
  pagamento: string;
  /** Preço riscado, quando há promoção de verdade. `null` some da tela. */
  precoAnteriorCents: number | null;
  /** Inteiro de 0 a 100. Abaixo de 5 a tela não mostra selo. */
  descontoPct: number;
  /** O rótulo do convite: comprar ou pedir proposta. */
  chamada: string;
  /** A tarja sobre a foto quando não há o que comprar. `null` quando há. */
  faixaDeEsgotado: string | null;
  /** O estado do estoque, já resolvido — a mesma regra de toda a loja. */
  disponibilidade: Disponibilidade;
};

/** Abaixo disto o selo de desconto é ruído: −2% não muda decisão nenhuma. */
const DESCONTO_MINIMO = 5;

export function claimsDoCartao(
  produto: ProdutoDoCartao,
  parcelamento?: Parcelamento,
): ClaimsDoCartao {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;

  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);

  /* Preço riscado só quando o "de" é maior que o "por". Um `compareAtCents`
     menor ou igual é cadastro errado, e desenhar o risco nele anunciaria um
     desconto negativo. */
  const precoAnteriorCents =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;

  /* Sem estoque não há promoção: "−15%" ao lado de "Vendido" descreve um
     negócio que a própria tarja acabou de dizer que não existe. É a mesma
     regra que a caixa de compra da ficha aplica. */
  const descontoPct =
    !semEstoque && precoAnteriorCents
      ? Math.round(((precoAnteriorCents - produto.priceCents) / precoAnteriorCents) * 100)
      : 0;

  return {
    preco: soOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents),
    pagamento: soOrcamento
      ? "Preço e prazo com a equipe JB"
      : parcelas
        ? `${parcelas.parcelas}× de ${formatarPreco(parcelas.valorCents)} sem juros`
        : "Pagamento à vista",
    precoAnteriorCents,
    descontoPct: descontoPct >= DESCONTO_MINIMO ? descontoPct : 0,
    chamada: soOrcamento ? "Pedir orçamento" : "Ver equipamento",
    /* A tarja existia na home e na conta, e não no catálogo — a lista onde
       mais se varre foto era justamente a que não avisava sobre a foto. */
    faixaDeEsgotado: semEstoque ? (produto.unique ? "Vendido" : "Indisponível") : null,
    disponibilidade: disponibilidadeDoProduto(produto),
  };
}
