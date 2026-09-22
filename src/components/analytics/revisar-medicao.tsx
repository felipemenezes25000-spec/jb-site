"use client";

import { esquecerConsentimento } from "@/lib/analytics/consentimento";

/**
 * "Rever minha escolha" sobre medição, no rodapé.
 *
 * Apaga a resposta dada e o aviso volta a aparecer. Recusar depois de ter
 * aceitado custa um clique aqui e outro no aviso, o mesmo esforço de aceitar.
 */
export function RevisarMedicao({ className }: { className?: string }) {
  return (
    <button type="button" onClick={esquecerConsentimento} className={className}>
      Cookies e medição
    </button>
  );
}
