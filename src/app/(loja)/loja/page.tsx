import type { Metadata } from "next";
import { Headphones, PackageCheck, ShieldCheck } from "lucide-react";

import {
  CabecalhoColecao,
  type PontoDeColecao,
} from "@/components/loja/cabecalho-colecao";
import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { Trilha } from "@/components/ui/data";
import { dadosDaColecao } from "@/lib/catalogo";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 */
export const instant = false;

const CAMINHO = "/loja";
const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos odontológicos novos",
  descricao:
    "Equipamentos odontológicos novos, com ficha técnica completa, garantia informada e suporte da JB antes e depois da compra.",
  caminho: CAMINHO,
});

const PONTOS: PontoDeColecao[] = [
  { icone: ShieldCheck, texto: "Ficha técnica objetiva" },
  { icone: PackageCheck, texto: "Coleção só de novos" },
  { icone: Headphones, texto: "Suporte especializado" },
];

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametrosRecebidos, colecao] = await Promise.all([
    searchParams,
    dadosDaColecao("novo"),
  ]);

  /* /loja é a coleção de novos. Mesmo um endereço antigo com
   * `?condicao=seminovo` não mistura as duas jornadas. */
  const parametros = Object.fromEntries(
    Object.entries(parametrosRecebidos).filter(([chave]) => chave !== "condicao"),
  ) as ParametrosVitrine;

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <div className="container-jb pt-5 sm:pt-7 lg:pt-8">
        <Trilha itens={TRILHA} className="mb-3 sm:mb-4" />

        <CabecalhoColecao
          sobretitulo="Catálogo"
          titulo="Equipamentos odontológicos"
          descricao="Equipamentos novos para a rotina da clínica, com ficha técnica clara e suporte JB antes e depois da compra."
          pontos={PONTOS}
          destaque={colecao.destaque}
          categorias={colecao.categorias}
          colecao="novo"
          totalNovos={colecao.totalNovos}
          totalSeminovos={colecao.totalSeminovos}
        />
      </div>

      {/* `variante="colecao"`: a abertura acima já é o cabeçalho da página, e
          a vitrine entra apenas como filtro + lista. */}
      <Vitrine
        titulo="Equipamentos novos"
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "novo" }}
        travarCondicao
        variante="colecao"
      />
    </>
  );
}
