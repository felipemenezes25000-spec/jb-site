import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Equipamentos",
  description:
    "Equipamentos odontológicos novos, seminovos revisados e recondicionados, com instalação e assistência técnica da JB.",
  alternates: { canonical: "/loja" },
};

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCategorias()]);

  return (
    <Vitrine
      titulo="Equipamentos odontológicos"
      descricao="Tudo que a JB vende e atende, no mesmo lugar. Filtre por categoria, marca, condição ou faixa de preço — e conte com a nossa assistência técnica depois da compra."
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }]}
      caminho="/loja"
      parametros={parametros}
      atalhos={atalhos}
      rotuloAtalhos="Categorias do catálogo"
    />
  );
}
