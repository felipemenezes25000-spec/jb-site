import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Seminovos revisados pela JB",
  description:
    "Cada unidade passa pela bancada da JB. O checklist de revisão, as fotos reais e as condições ficam registrados na página do equipamento.",
  alternates: { canonical: "/seminovos" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([
    searchParams,
    atalhosDeCondicao("seminovo"),
  ]);

  return (
    <Vitrine
      titulo="Seminovos revisados pela JB"
      descricao="Cada unidade passa pela bancada da JB. O checklist de revisão, as fotos reais e as condições ficam registrados na página do equipamento."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Seminovos revisados pela JB" },
      ]}
      caminho="/seminovos"
      parametros={parametros}
      filtrosFixos={{ condicao: "seminovo" }}
      atalhos={atalhos}
      rotuloAtalhos="Outras condições"
      travarCondicao
    />
  );
}
