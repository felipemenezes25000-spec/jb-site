import { describe, expect, it } from "vitest";

import { claimsDoCartao, type ProdutoDoCartao } from "@/domain/catalogo/cartao";
import { formatarPreco } from "@/lib/format";

/**
 * Um produto, uma redação.
 *
 * A mesma seladora de R$ 1.480,00 em 12× era anunciada como "12x R$ 123,33" na
 * home, "12x de R$ 123,33 sem juros" na conta e "12× de R$ 123,33 sem juros" no
 * catálogo. Nenhuma errada; o problema é serem três. Quem vai da home para o
 * catálogo lê a mesma oferta com outra redação e não sabe se mudou algo.
 */

const PARCELAMENTO = { max: 12, minimoCents: 5000 };

function produto(parcial: Partial<ProdutoDoCartao> = {}): ProdutoDoCartao {
  return {
    priceCents: 148000,
    compareAtCents: null,
    allowDirectPurchase: true,
    trackInventory: true,
    stock: 10,
    unique: false,
    ...parcial,
  };
}

describe("claimsDoCartao", () => {
  it("escreve a parcela de um jeito só", () => {
    const c = claimsDoCartao(produto(), PARCELAMENTO);
    /* Comparado com `formatarPreco`, não com um literal: a moeda em pt-BR sai
       com espaço NÃO quebrável entre "R$" e o número, e um literal digitado à
       mão traz o espaço comum — o teste falharia pelo caractere invisível, não
       pelo valor. */
    expect(c.preco).toBe(formatarPreco(148000));
    expect(c.pagamento).toBe(`12× de ${formatarPreco(12333)} sem juros`);
  });

  it("diz à vista quando o preço não parcela", () => {
    /* Parcela abaixo do mínimo: o produto é comprável, só não em 12×. */
    const c = claimsDoCartao(produto({ priceCents: 4000 }), PARCELAMENTO);
    expect(c.preco).toBe(formatarPreco(4000));
    expect(c.pagamento).toBe("Pagamento à vista");
  });

  it("usa a mesma frase para sob orçamento nas três telas", () => {
    const semCompra = claimsDoCartao(produto({ allowDirectPurchase: false }), PARCELAMENTO);
    const semPreco = claimsDoCartao(produto({ priceCents: 0 }), PARCELAMENTO);
    expect(semCompra.preco).toBe("Sob orçamento");
    expect(semCompra.pagamento).toBe("Preço e prazo com a equipe JB");
    expect(semPreco.pagamento).toBe(semCompra.pagamento);
    expect(semCompra.chamada).toBe("Pedir orçamento");
  });

  it("chama de 'Ver equipamento' o que dá para comprar", () => {
    expect(claimsDoCartao(produto(), PARCELAMENTO).chamada).toBe("Ver equipamento");
  });

  describe("preço anterior e desconto", () => {
    it("risca o preço e mostra o selo quando há promoção de verdade", () => {
      const c = claimsDoCartao(produto({ compareAtCents: 169000 }), PARCELAMENTO);
      expect(c.precoAnteriorCents).toBe(169000);
      expect(c.descontoPct).toBe(12);
    });

    it("ignora `compareAt` menor ou igual ao preço", () => {
      /* Cadastro errado. Riscar aqui anunciaria desconto negativo. */
      expect(claimsDoCartao(produto({ compareAtCents: 100000 }), PARCELAMENTO).precoAnteriorCents).toBeNull();
      expect(claimsDoCartao(produto({ compareAtCents: 148000 }), PARCELAMENTO).precoAnteriorCents).toBeNull();
    });

    it("engole desconto pequeno demais para mudar decisão", () => {
      const c = claimsDoCartao(produto({ compareAtCents: 152000 }), PARCELAMENTO);
      expect(c.precoAnteriorCents).toBe(152000);
      expect(c.descontoPct).toBe(0);
    });

    it("não anuncia desconto no que não está à venda", () => {
      /* "−15%" ao lado de "Vendido" descreve um negócio que a própria tarja
         acabou de dizer que não existe. */
      const c = claimsDoCartao(produto({ compareAtCents: 169000, stock: 0 }), PARCELAMENTO);
      expect(c.descontoPct).toBe(0);
    });
  });

  describe("a tarja sobre a foto", () => {
    it("separa peça única vendida de produto indisponível", () => {
      expect(claimsDoCartao(produto({ stock: 0, unique: true })).faixaDeEsgotado).toBe("Vendido");
      expect(claimsDoCartao(produto({ stock: 0, unique: false })).faixaDeEsgotado).toBe(
        "Indisponível",
      );
    });

    it("não existe quando há o que comprar", () => {
      expect(claimsDoCartao(produto()).faixaDeEsgotado).toBeNull();
    });

    it("não aparece em produto sem controle de estoque", () => {
      /* `stock: 0` sem `trackInventory` não quer dizer nada: é cadastro que
         não conta unidades, não é prateleira vazia. */
      expect(
        claimsDoCartao(produto({ trackInventory: false, stock: 0 })).faixaDeEsgotado,
      ).toBeNull();
    });
  });

  it("carrega a disponibilidade da mesma regra do resto da loja", () => {
    expect(claimsDoCartao(produto({ stock: 2 })).disponibilidade).toEqual({
      texto: "Últimas 2 unidades",
      tom: "pouco",
    });
  });
});
