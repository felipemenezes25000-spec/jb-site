"use client";

import { useEffect } from "react";

import { medir } from "@/lib/analytics/cliente";
import { CHAVE_SUBMIT_ASSISTENCIA } from "@/components/assistencia/telemetria-assistencia";

const JANELA_DE_CONFIRMACAO_MS = 2 * 60 * 1000;

/**
 * Confirma a conversão apenas quando o servidor já redirecionou para um
 * protocolo válido. O marcador expira rápido para não transformar uma visita
 * posterior ao acompanhamento em falso `assistance_submit`.
 */
export function ConfirmarConversaoAssistencia() {
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SUBMIT_ASSISTENCIA);
      sessionStorage.removeItem(CHAVE_SUBMIT_ASSISTENCIA);
      if (!bruto) return;

      const quando = Number(bruto);
      if (!Number.isFinite(quando)) return;
      if (Date.now() - quando > JANELA_DE_CONFIRMACAO_MS) return;

      medir("assistance_submit", { resultado: "criado" });
    } catch {
      // Falha de telemetria não interfere no acompanhamento do chamado.
    }
  }, []);

  return null;
}
