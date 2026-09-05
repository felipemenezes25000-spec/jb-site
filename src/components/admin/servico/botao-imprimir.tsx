"use client";

import { Printer } from "lucide-react";

import { Botao, type Tamanho, type Variante } from "@/components/ui/button";

/**
 * Dispara a impressão da página atual.
 *
 * A via limpa da OS é uma rota de verdade (`/admin/os/[id]/imprimir`), não um
 * recorte por CSS de uma tela cheia de botões: assim ela pode ser aberta,
 * conferida e salva em PDF pelo próprio diálogo do navegador antes de sair no
 * papel. Este botão só abre esse diálogo.
 */
export function BotaoImprimir({
  rotulo = "Imprimir",
  variante = "secundario",
  tamanho = "md",
}: {
  rotulo?: string;
  variante?: Variante;
  tamanho?: Tamanho;
}) {
  return (
    <Botao
      type="button"
      variante={variante}
      tamanho={tamanho}
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {rotulo}
    </Botao>
  );
}
