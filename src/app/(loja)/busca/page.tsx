import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: true },
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const parametros = await searchParams;
  const termo = typeof parametros.q === "string" ? parametros.q : "";

  return (
    <Vitrine
      titulo={termo ? `Resultados para “${termo}”` : "Busca"}
      descricao={termo ? undefined : "Digite o que procura na busca do topo."}
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Busca" }]}
      parametros={parametros}
    />
  );
}
