import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

const CAMINHO = "/novos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Equipamentos novos" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos novos",
  descricao:
    "Equipamentos de linha, lacrados. A ficha traz modelo, voltagem, medidas e o prazo de garantia informado pelo fabricante.",
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
        titulo="Equipamentos novos"
        descricao="Equipamentos de linha, lacrados, direto para a clínica. A ficha traz modelo, voltagem, medidas e — quando o fabricante informa — o prazo de garantia."
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
