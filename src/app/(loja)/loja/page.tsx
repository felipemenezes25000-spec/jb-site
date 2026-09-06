import type { Metadata } from "next";

import {
  Vitrine,
  atalhosDeCategorias,
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
