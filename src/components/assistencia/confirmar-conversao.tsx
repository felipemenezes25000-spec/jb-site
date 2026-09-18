"use client";

import { useEffect } from "react";

import { medir } from "@/lib/analytics/cliente";
import { CHAVE_SUBMIT_ASSISTENCIA } from "@/components/assistencia/telemetria-assistencia";

const JANELA_DE_CONFIRMACAO_MS = 2 * 60 * 1000;

type MarcadorSubmit = {
  quando: number;
  metodo?: string;
};

/**
 * Confirma a conversão apenas quando o servidor já redirecionou para um
 * protocolo válido. O marcador expira rápido para não transformar uma visita
 * posterior ao acompanhamento em falso `assistance_submit`.
 *
 * A origem, quando existe, é apenas um rótulo agregado como `sos`; nenhum dado
 * do chamado é lido desta página para analytics.
 */
export function ConfirmarConversaoAssistencia() {
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SUBMIT_ASSISTENCIA);
      sessionStorage.removeItem(CHAVE_SUBMIT_ASSISTENCIA);
      if (!bruto) return;

      let marcador: MarcadorSubmit;
      try {
        const lido = JSON.parse(bruto) as Partial<MarcadorSubmit>;
        marcador = {
          quando: Number(lido.quando),
          metodo: lido.metodo === "sos" ? "sos" : undefined,
        };
      } catch {
        /* Compatibilidade com o marcador antigo, que era apenas o timestamp. */
        marcador = { quando: Number(bruto) };
      }

      if (!Number.isFinite(marcador.quando)) return;
      if (Date.now() - marcador.quando > JANELA_DE_CONFIRMACAO_MS) return;

      medir("assistance_submit", {
        resultado: "criado",
        ...(marcador.metodo ? { metodo: marcador.metodo } : {}),
      });
    } catch {
      // Falha de telemetria não interfere no acompanhamento do chamado.
    }
  }, []);

  return null;
}
