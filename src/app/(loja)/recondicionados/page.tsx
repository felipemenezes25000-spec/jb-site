import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

const CAMINHO = "/recondicionados";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Recondicionados JB" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Recondicionados JB",
  descricao:
    "Equipamentos recuperados na bancada da JB, com o que foi reparado e o que foi substituído registrado unidade por unidade.",
  caminho: CAMINHO,
});

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
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Por condição"
        titulo="Recondicionados JB"
        descricao="Equipamentos que passaram pela bancada da JB e voltaram a funcionar. O que foi reparado e o que foi substituído fica registrado na unidade, peça por peça."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "recondicionado" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />
    </>
  );
}
