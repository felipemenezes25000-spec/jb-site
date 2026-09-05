import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Equipamentos novos",
  description: "Equipamentos de linha, lacrados, com garantia de fábrica registrada no cadastro de cada item.",
  alternates: { canonical: "/novos" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  return (
    <Vitrine
      titulo="Equipamentos novos"
      descricao="Equipamentos de linha, lacrados, com garantia de fábrica registrada no cadastro de cada item."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Equipamentos novos" },
      ]}
      parametros={await searchParams}
      filtrosFixos={{ condicao: "novo" }}
      travarCondicao
    />
  );
}
