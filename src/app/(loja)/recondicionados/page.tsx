import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Recondicionados JB",
  description:
    "Equipamentos recuperados na bancada da JB, com o que foi substituído registrado por unidade.",
  alternates: { canonical: "/recondicionados" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([
    searchParams,
    atalhosDeCondicao("recondicionado"),
  ]);

  return (
    <Vitrine
      titulo="Recondicionados JB"
      descricao="Equipamentos recuperados na bancada da JB, com o que foi substituído registrado por unidade."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Recondicionados JB" },
      ]}
      caminho="/recondicionados"
      parametros={parametros}
      filtrosFixos={{ condicao: "recondicionado" }}
      atalhos={atalhos}
      rotuloAtalhos="Outras condições"
      travarCondicao
    />
  );
}
