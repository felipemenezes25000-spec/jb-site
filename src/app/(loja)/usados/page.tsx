import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCondicao,
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

const CAMINHO = "/usados";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Equipamentos usados" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos usados",
  descricao:
    "Equipamentos em estado de uso, anunciados unidade a unidade, com as condições descritas na página de cada um.",
  caminho: CAMINHO,
});

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos] = await Promise.all([searchParams, atalhosDeCondicao("usado")]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Por condição"
        titulo="Equipamentos usados"
        descricao="Equipamentos em estado de uso, anunciados unidade a unidade. As marcas de uso e o que a equipe encontrou ficam descritos na página do próprio equipamento, e não em um texto genérico."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "usado" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />
    </>
  );
}
