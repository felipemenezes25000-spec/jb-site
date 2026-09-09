"use server";

import {
  consultarFrete as consultarFreteBase,
  finalizarCompra as finalizarCompraBase,
  type EstadoCheckout,
  type RespostaFrete,
} from "@/app/acoes/checkout-base";
import { ErroFreteSelecionado } from "@/lib/frete";

export * from "@/app/acoes/checkout-base";

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
        // O checkout leva a pessoa de volta à etapa de entrega e foca o CEP.
        campo: "cep",
      };
    }
    throw erro;
  }
}
