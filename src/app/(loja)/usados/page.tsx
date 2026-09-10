import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/usados";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Produtos usados" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Produtos usados",
  descricao:
    "Produtos usados anunciados unidade a unidade, com condição, fotos e informações registradas na página de cada item.",
  caminho: CAMINHO,
});

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCondicao("usado")]);

  return (
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Por condição"
        titulo="Produtos usados"
        descricao="Itens em estado de uso, publicados com as informações disponíveis de cada unidade. Fotos, marcas de uso e observações ficam na própria página do produto, sem transformar uma unidade em regra para o modelo inteiro."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "usado" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />
    </div>
  );
}
