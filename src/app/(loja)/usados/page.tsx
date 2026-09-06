import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

const CAMINHO = "/usados";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Equipamentos usados" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos usados",
  descricao:
    "Equipamentos em estado de uso, anunciados unidade a unidade, com as condições descritas na página de cada um.",
  caminho: CAMINHO,
});

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCondicao("usado")]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Por condição"
        titulo="Equipamentos usados"
        descricao="Equipamentos em estado de uso, anunciados unidade a unidade. As marcas de uso e o que a equipe encontrou ficam descritos na página do próprio equipamento, e não em um texto genérico."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "usado" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />
    </>
  );
}
