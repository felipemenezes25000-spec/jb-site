import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Equipamentos",
  description:
    "Equipamentos odontológicos novos, seminovos revisados e recondicionados, com instalação e assistência técnica da JB.",
};

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  return (
    <Vitrine
      titulo="Equipamentos odontológicos"
      descricao="Tudo que a JB vende e atende. Filtre por categoria, marca, condição ou faixa de preço."
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }]}
      parametros={await searchParams}
    />
  );
}
