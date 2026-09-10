import "server-only";

import { calcularFreteTabelaDePedido, type Frete } from "@/lib/frete-core";
import {
  cotacoesMelhorEnvio,
  rotuloDaOpcaoMelhorEnvio,
  statusMelhorEnvio,
  type ItemCotacaoMelhorEnvio,
} from "@/lib/melhor-envio";

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
 * A PDP sempre responde sobre UMA unidade do produto aberto.
 *
 * Esta função é pura de propósito: além de deixar a regra explícita, impede
 * que uma futura refatoração volte a buscar quantidade/itens no carrinho.
 */
export function itemDaPdpParaCotacao(produto: ProdutoParaCotacao): ItemCotacaoMelhorEnvio {
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

function paraFreteMelhorEnvio(
  opcao: Awaited<ReturnType<typeof cotacoesMelhorEnvio>>[number],
): Frete {
  return {
    tipo: "transportadora",
    rotulo: rotuloDaOpcaoMelhorEnvio(opcao),
    valorCents: opcao.priceCents,
    prazoDias: opcao.deliveryDays,
    motivo: "faixa",
    melhorEnvio: {
      companyId: opcao.companyId,
      serviceId: opcao.serviceId,
      companyName: opcao.companyName,
      serviceName: opcao.serviceName,
      packages: opcao.packages,
    },
  };
}

/**
 * Estimativa da ficha do produto, independente do carrinho e de cookie de
 * modalidade já escolhida no checkout.
 *
 * Quando o Melhor Envio está pronto, cota exatamente uma unidade do produto
 * visualizado. Se a dependência externa cair ou o cadastro não tiver medidas
 * suficientes, preservamos o comportamento resiliente da loja e usamos a
 * tabela JB. Isso é estimativa pré-compra; nenhuma escolha de transportadora é
 * gravada aqui.
 */
export async function calcularFreteDaPdp(entrada: {
  cep: string;
  produto: ProdutoParaCotacao;
}): Promise<Frete> {
  const { cep, produto } = entrada;

  if (statusMelhorEnvio().quoteReady) {
    try {
      const opcoes = await cotacoesMelhorEnvio({
        postalCode: cep,
        items: [itemDaPdpParaCotacao(produto)],
      });
      if (opcoes[0]) return paraFreteMelhorEnvio(opcoes[0]);
    } catch (erro) {
      console.error("[frete/pdp] fallback para tabela", erro);
    }
  }

  return calcularFreteTabelaDePedido({
    cep,
    subtotalCents: produto.priceCents,
    produtoIds: [produto.id],
  });
}
