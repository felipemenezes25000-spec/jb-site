import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/recondicionados";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Recondicionados JB" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Recondicionados JB",
  descricao:
    "Produtos recondicionados pela JB, publicados com o que foi reparado, substituído e verificado em cada unidade quando esses registros existirem.",
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
        descricao="Itens que passaram pela bancada da JB e voltaram ao catálogo. Reparos, substituições e observações ficam vinculados à unidade sempre que esses dados estiverem registrados."
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
