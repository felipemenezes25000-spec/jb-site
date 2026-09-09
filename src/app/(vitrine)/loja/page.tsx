import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { dadosDaColecao } from "@/lib/catalogo";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/loja";
const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos odontológicos novos",
  descricao:
    "Equipamentos odontológicos novos, com ficha técnica completa, garantia informada e suporte da JB antes e depois da compra.",
  caminho: CAMINHO,
});

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametrosRecebidos, colecao] = await Promise.all([
    searchParams,
    dadosDaColecao("novo"),
  ]);

  const parametros = Object.fromEntries(
    Object.entries(parametrosRecebidos).filter(([chave]) => chave !== "condicao"),
  ) as ParametrosVitrine;

  const atalhos = [
    ...colecao.categorias.map((categoria) => ({
      rotulo: categoria.nome,
      href: categoria.href,
      quantidade: categoria.quantidade,
    })),
    {
      rotulo: "Seminovos revisados",
      href: "/seminovos",
      quantidade: colecao.totalSeminovos,
    },
    { rotulo: "Todas as marcas", href: "/marcas" },
  ];

  return (
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Marketplace clínico"
        titulo="Equipamentos odontológicos"
        descricao={`${colecao.totalNovos} equipamentos novos com nota fiscal, garantia informada, parcelamento e suporte técnico da JB.`}
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "novo" }}
        atalhos={atalhos}
        rotuloAtalhos="Categorias e atalhos desta coleção"
        travarCondicao
      />
    </div>
  );
}
