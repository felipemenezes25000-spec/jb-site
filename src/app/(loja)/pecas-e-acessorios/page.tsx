import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/pecas-e-acessorios";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Peças e acessórios" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Peças e acessórios",
  descricao:
    "Peças de reposição e acessórios odontológicos com informações de compatibilidade e suporte da equipe JB.",
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
        descricao="Reposição e acessórios para equipamentos odontológicos. Se a peça não estiver publicada, informe equipamento, modelo e código quando disponível para a equipe confirmar compatibilidade, preço e prazo."
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
