"use client";

import { Printer } from "lucide-react";

import { Botao } from "@/components/ui/button";

/**
 * Abre a caixa de impressão do navegador.
 *
 * Client component por uma linha só, porque `window.print()` não existe no
 * servidor. Sem PDF gerado: a impressão do navegador deixa a pessoa escolher
 * impressora, papel e margem — e a folha foi desenhada para sair certa em A4
 * com a escala em 100%.
 */
export function BotaoImprimir({ rotulo = "Imprimir" }: { rotulo?: string }) {
  return (
    <Botao tamanho="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {rotulo}
    </Botao>
  );
}
