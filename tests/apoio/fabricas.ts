import type { Coupon } from "@prisma/client";

import type { CarrinhoCompleto } from "@/lib/carrinho";

/**
 * Montagem de carrinhos para os testes de `calcularTotais`.
 *
 * `calcularTotais` é uma função pura: recebe o carrinho já lido do banco e
 * devolve os totais. Por isso dá para exercitá-la sem Postgres — o que estas
 * fábricas fazem é montar exatamente o formato que o Prisma devolveria, com
 * `include` de produto, serviço e cupom.
 *
 * O `as unknown as` no fim é a única concessão: o tipo gerado pelo Prisma tem
 * dezenas de colunas que a função nem lê (timestamps, descrição, SEO). Montar
 * todas só faria o teste falhar quando o schema ganhasse um campo novo, sem
 * dizer nada sobre a conta de dinheiro que é o objeto do teste.
 */

type EntradaProduto = {
  id?: string;
  nome?: string;
  precoCents: number;
  quantidade?: number;
  estoque?: number;
  controlaEstoque?: boolean;
  unico?: boolean;
  sku?: string;
  slug?: string;
  marca?: string;
  condicao?: string;
  categoriaId?: string | null;
  /** `draft` ou `archived` = produto fora do ar; o carrinho não deve precificar */
  status?: "active" | "draft" | "archived";
  /**
   * Serviços vendidos junto, cobrados por unidade do produto.
   * `precoNoProduto` representa ProductAddon.priceCents, que sobrepõe o preço
   * padrão do serviço — é o valor que a página do produto exibe.
   */
  adicionais?: { nome: string; precoCents: number; precoNoProduto?: number | null }[];
};

type EntradaServico = {
  id?: string;
  nome?: string;
  precoCents: number;
  quantidade?: number;
};

export type EntradaCupom = {
  code?: string;
  kind?: "percentual" | "fixo";
  value: number;
  minSubtotalCents?: number;
  maxUses?: number | null;
  usedCount?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active?: boolean;
  categoryId?: string | null;
  productId?: string | null;
};

export function cupom(entrada: EntradaCupom): Coupon {
  return {
    id: `cupom-${entrada.code ?? "teste"}`,
    code: entrada.code ?? "TESTE",
    kind: entrada.kind ?? "percentual",
    value: entrada.value,
    minSubtotalCents: entrada.minSubtotalCents ?? 0,
    maxUses: entrada.maxUses ?? null,
    maxUsesPerCustomer: null,
    usedCount: entrada.usedCount ?? 0,
    startsAt: entrada.startsAt ?? null,
    endsAt: entrada.endsAt ?? null,
    active: entrada.active ?? true,
    categoryId: entrada.categoryId ?? null,
    productId: entrada.productId ?? null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    updatedAt: new Date("2026-01-01T12:00:00Z"),
  } as Coupon;
}

export function carrinho(opcoes: {
  produtos?: EntradaProduto[];
  servicos?: EntradaServico[];
  cupom?: Coupon | null;
}): CarrinhoCompleto {
  const itens: unknown[] = [];
  let contador = 0;

  for (const entrada of opcoes.produtos ?? []) {
    contador += 1;
    const idItem = `item-${contador}`;
    const produtoId = entrada.id ?? `produto-${contador}`;

    itens.push({
      id: idItem,
      cartId: "carrinho-teste",
      productId: produtoId,
      serviceId: null,
      parentId: null,
      quantity: entrada.quantidade ?? 1,
      createdAt: new Date("2026-01-01T12:00:00Z"),
      updatedAt: new Date("2026-01-01T12:00:00Z"),
      service: null,
      product: {
        id: produtoId,
        name: entrada.nome ?? `Produto ${contador}`,
        slug: entrada.slug ?? `produto-${contador}`,
        sku: entrada.sku ?? `SKU-${contador}`,
        priceCents: entrada.precoCents,
        stock: entrada.estoque ?? 10,
        trackInventory: entrada.controlaEstoque ?? true,
        unique: entrada.unico ?? false,
        condition: entrada.condicao ?? "novo",
        status: entrada.status ?? "active",
        categoryId: entrada.categoriaId ?? null,
        brand: { name: entrada.marca ?? "Marca teste" },
        media: [{ media: { url: `/imagens/${produtoId}.jpg` } }],
        addons: (entrada.adicionais ?? []).map((adicional, i) => ({
          serviceId: `${produtoId}-servico-${i + 1}`,
          priceCents: adicional.precoNoProduto ?? null,
        })),
      },
    });

    for (const [i, adicional] of (entrada.adicionais ?? []).entries()) {
      contador += 1;
      const servicoId = `${produtoId}-servico-${i + 1}`;
      itens.push({
        id: `item-${contador}`,
        cartId: "carrinho-teste",
        productId: null,
        serviceId: servicoId,
        parentId: idItem,
        quantity: 1,
        createdAt: new Date("2026-01-01T12:00:00Z"),
        updatedAt: new Date("2026-01-01T12:00:00Z"),
        product: null,
        service: { id: servicoId, name: adicional.nome, priceCents: adicional.precoCents },
      });
    }
  }

  for (const entrada of opcoes.servicos ?? []) {
    contador += 1;
    const servicoId = entrada.id ?? `servico-avulso-${contador}`;
    itens.push({
      id: `item-${contador}`,
      cartId: "carrinho-teste",
      productId: null,
      serviceId: servicoId,
      parentId: null,
      quantity: entrada.quantidade ?? 1,
      createdAt: new Date("2026-01-01T12:00:00Z"),
      updatedAt: new Date("2026-01-01T12:00:00Z"),
      product: null,
      service: {
        id: servicoId,
        name: entrada.nome ?? `Serviço ${contador}`,
        priceCents: entrada.precoCents,
      },
    });
  }

  return {
    id: "carrinho-teste",
    token: "token-teste",
    customerId: null,
    couponId: opcoes.cupom?.id ?? null,
    coupon: opcoes.cupom ?? null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    updatedAt: new Date("2026-01-01T12:00:00Z"),
    items: itens,
  } as unknown as CarrinhoCompleto;
}
