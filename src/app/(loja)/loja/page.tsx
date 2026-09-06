import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

const CAMINHO = "/loja";

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos",
  descricao:
    "Equipamentos odontológicos novos, seminovos revisados e recondicionados, com instalação e assistência técnica da JB.",
  caminho: CAMINHO,
});

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCategorias()]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Catálogo"
        titulo="Equipamentos odontológicos"
        descricao="Tudo que a JB vende e atende, no mesmo lugar. A ficha de cada item traz modelo, voltagem, medidas e o que acompanha o equipamento — e a assistência técnica continua com a gente depois da entrega."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        atalhos={atalhos}
        rotuloAtalhos="Categorias do catálogo"
      />
    </>
  );
}
