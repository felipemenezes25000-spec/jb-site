import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Peças e acessórios",
  description:
    "Peças de reposição e acessórios para equipamentos odontológicos, com a mesma assistência técnica da JB.",
  alternates: { canonical: "/pecas-e-acessorios" },
};

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
    <Vitrine
      titulo="Peças e acessórios"
      descricao="Reposição e acessórios para os equipamentos que a JB vende e atende. Se a peça que você precisa não estiver aqui, peça um orçamento — boa parte é atendida sob consulta."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Peças e acessórios" },
      ]}
      caminho="/pecas-e-acessorios"
      parametros={parametros}
      filtrosFixos={{ categoria: "pecas-e-acessorios" }}
      atalhos={atalhos}
      rotuloAtalhos="Tipos de peça"
      travarCategoria
    />
  );
}
