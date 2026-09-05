import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Equipamentos novos",
  description:
    "Equipamentos de linha, lacrados, com garantia de fábrica registrada no cadastro de cada item.",
  alternates: { canonical: "/novos" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCondicao("novo")]);

  return (
    <Vitrine
      titulo="Equipamentos novos"
      descricao="Equipamentos de linha, lacrados, com garantia de fábrica registrada no cadastro de cada item."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Equipamentos novos" },
      ]}
      caminho="/novos"
      parametros={parametros}
      filtrosFixos={{ condicao: "novo" }}
      atalhos={atalhos}
      rotuloAtalhos="Outras condições"
      travarCondicao
    />
  );
}
