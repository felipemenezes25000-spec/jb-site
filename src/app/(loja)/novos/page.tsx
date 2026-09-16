import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/novos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Produtos novos" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Produtos novos",
  descricao:
    "Produtos odontológicos novos, com informações técnicas, condições de pagamento e garantia quando informada pelo fabricante.",
  caminho: CAMINHO,
});

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCondicao("novo")]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Por condição"
        titulo="Produtos novos"
        descricao="Produtos novos do catálogo JB, com ficha organizada para comparar modelo, compatibilidade, voltagem, medidas e garantia quando esses dados estiverem cadastrados."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "novo" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />
    </>
  );
}
