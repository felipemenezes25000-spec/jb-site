"use client";

import { Printer } from "lucide-react";

import { Botao } from "@/components/ui/button";

/**
 * Abre a caixa de impressão do navegador.
 *
 * Existe só porque `window.print()` precisa de um evento do cliente. A página
 * de impressão continua funcionando sem JavaScript: quem estiver sem script usa
 * o Ctrl+P do próprio navegador e o resultado é o mesmo — o desenho da folha é
 * feito por CSS, não por este botão.
 */
export function BotaoImprimir({ rotulo = "Imprimir" }: { rotulo?: string }) {
  return (
    <Botao type="button" variante="secundario" tamanho="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {rotulo}
    </Botao>
  );
}
