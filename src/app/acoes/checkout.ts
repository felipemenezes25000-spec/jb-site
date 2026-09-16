"use server";

import {
  consultarFrete as consultarFreteBase,
  finalizarCompra as finalizarCompraBase,
  tentarPagamentoNovamente as tentarPagamentoNovamenteBase,
  type EstadoCheckout,
  type RespostaFrete,
} from "@/app/acoes/checkout-base";
import { ErroFreteSelecionado } from "@/lib/frete";

export type { EstadoCheckout, RespostaFrete } from "@/app/acoes/checkout-base";

/**
 * A prévia e o fechamento usam a mesma conta no servidor. Quando a modalidade
 * escolhida deixa de existir (ou a API não consegue reconfirmar o preço), a
 * regra de domínio lança `ErroFreteSelecionado`. Aqui ela vira mensagem de UI;
 * redirect e erros não relacionados continuam seguindo o comportamento do
 * checkout original.
 */
export async function consultarFrete(cepBruto: string): Promise<RespostaFrete> {
  try {
    return await consultarFreteBase(cepBruto);
  } catch (erro) {
    if (erro instanceof ErroFreteSelecionado) return { erro: erro.message };
    throw erro;
  }
}

export async function finalizarCompra(
  anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  try {
    return await finalizarCompraBase(anterior, formData);
  } catch (erro) {
    if (erro instanceof ErroFreteSelecionado) {
      return {
        erro: erro.message,
        campo: "cep",
      };
    }
    throw erro;
  }
}

/**
 * Mantém a ação pública de nova tentativa de pagamento sem reexportar o módulo
 * inteiro. Em arquivo `use server`, todo export de runtime precisa ser async.
 */
export async function tentarPagamentoNovamente(
  anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  return tentarPagamentoNovamenteBase(anterior, formData);
}
