"use client";

import {
  idDaOcorrencia,
  limparPayload,
  normalizarRota,
  VERSAO_TAXONOMIA,
  type NomeDeEvento,
  type Payload,
} from "@/lib/analytics/taxonomia";
import { lerConsentimento } from "@/lib/analytics/consentimento";

/* ============================================================================
   O emissor de eventos do navegador

   Uma função, `medir`, e todas as regras dentro dela. Quem chama não decide se
   pode medir, não monta payload solto e não sabe qual é o destino — se
   soubesse, cada tela teria a própria interpretação das regras.

   O que ela garante, em ordem:

     1. **Consentimento.** Sem "aceito", nada sai. Verificado a cada chamada, e
        não uma vez na montagem — quem revoga precisa parar o envio na hora.
     2. **Payload limpo.** `limparPayload` derruba o que não está na lista de
        permissão e o que parece dado pessoal.
     3. **Deduplicação.** O mesmo `id_ocorrencia` não sai duas vezes nesta aba.
        Cobre remontagem, Strict Mode e navegação de volta.
     4. **Destino.** Sem destino configurado, nada é enviado — em
        desenvolvimento o evento vai para o console, onde dá para conferir o
        que teria saído, incluindo o que foi descartado.
   ============================================================================ */

declare global {
  interface Window {
    gtag?: (...argumentos: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Ocorrências já enviadas nesta aba.
 *
 * Um `Set` em memória, e é o suficiente: o que ele evita é a emissão dupla
 * dentro de uma mesma sessão de página — remontagem em Strict Mode, efeito que
 * roda duas vezes, voltar para a página do pedido. Deduplicação entre sessões
 * e entre cliente e servidor não é problema do navegador: ela é feita pelo
 * `id_ocorrencia`, que é derivado da referência de negócio e chega igual dos
 * dois lados.
 */
const jaEnviados = new Set<string>();

export type OpcoesDeMedicao = {
  /**
   * Referência do negócio para deduplicar: número do pedido, id do chamado.
   * Sem ela, o evento é tratado como repetível — uma visualização de página
   * pode acontecer de novo, e deve.
   */
  referencia?: string;
};

/** O evento pode sair daqui? */
export function podeMedir(): boolean {
  return lerConsentimento() === "aceito";
}

/**
 * Emite um evento.
 *
 * Nunca lança. Uma falha de medição não pode derrubar um fluxo de compra ou de
 * assistência — é para isso que existe a ordem "a loja funciona sem analytics".
 */
export function medir(
  evento: NomeDeEvento,
  dados: Record<string, unknown> = {},
  opcoes: OpcoesDeMedicao = {},
): void {
  try {
    if (typeof window === "undefined") return;

    const { payload, descartados } = limparPayload(dados);

    const completo: Payload = {
      ...payload,
      versao: VERSAO_TAXONOMIA,
      origem: "cliente",
      rota: normalizarRota(window.location.pathname),
    };

    if (opcoes.referencia) {
      const id = idDaOcorrencia(evento, opcoes.referencia);
      if (jaEnviados.has(id)) return;
      jaEnviados.add(id);
      completo.id_ocorrencia = id;
    }

    /* Desenvolvimento: mostra o que sairia, inclusive o que foi descartado.
       É a única forma de alguém perceber que estava tentando mandar um CPF
       num campo de busca antes de isso chegar a um provedor. */
    if (process.env.NODE_ENV !== "production") {
      const rotulo = descartados.length ? " (com campos descartados)" : "";
      console.info(`[medir] ${evento}${rotulo}`, completo, descartados);
    }

    if (!podeMedir()) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("event", evento, completo);
  } catch (erro) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[medir] falhou, e o fluxo segue:", erro);
    }
  }
}
