import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

const CAMINHO = "/pecas-e-acessorios";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Peças e acessórios" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Peças e acessórios",
  descricao:
    "Peças de reposição e acessórios para equipamentos odontológicos, com a mesma assistência técnica da JB.",
  caminho: CAMINHO,
});

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([
    searchParams,
    atalhosDeSubcategorias("pecas-e-acessorios"),
  ]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Catálogo"
        titulo="Peças e acessórios"
        descricao="Reposição e acessórios para os equipamentos que a JB vende e atende. Não achou a peça? Informe o equipamento, o modelo e, se tiver, o código: a equipe responde com preço e prazo."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ categoria: "pecas-e-acessorios" }}
        atalhos={atalhos}
        rotuloAtalhos="Tipos de peça"
        travarCategoria
      />
    </>
  );
}
