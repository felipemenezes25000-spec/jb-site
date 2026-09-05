import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Equipamentos usados",
  description: "Equipamentos em estado de uso, com as condições descritas item a item.",
  alternates: { canonical: "/usados" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  return (
    <Vitrine
      titulo="Equipamentos usados"
      descricao="Equipamentos em estado de uso, com as condições descritas item a item."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Equipamentos usados" },
      ]}
      parametros={await searchParams}
      filtrosFixos={{ condicao: "usado" }}
      travarCondicao
    />
  );
}
