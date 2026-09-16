import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
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
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

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
