"use client";

import { Cabecalho } from "@/components/loja/cabecalho";

export type PropsCabecalhoVitrine = {
  categorias: { slug: string; name: string; count: number }[];
  condicoes: { slug: string; rotulo: string; total: number }[];
  centralPublicada?: boolean;
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
  desde: string;
  cidade: string;
};

/**
 * A home e o restante da loja usam o mesmo cabeçalho.
 *
 * O cabeçalho exclusivo da home criava duas navegações diferentes para a
 * mesma loja e duplicava comportamento de busca, menu e carrinho. Manter um
 * único componente deixa a entrada do site coerente com catálogo, PDP e
 * checkout e reduz o risco de os dois menus divergirem.
 */
export function CabecalhoVitrine(props: PropsCabecalhoVitrine) {
  return <Cabecalho {...props} />;
}
