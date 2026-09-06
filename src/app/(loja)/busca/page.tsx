import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

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

export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: true },
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const parametros = await searchParams;
  const bruto = parametros.q;
  const termo = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim() ?? "";

  return (
    <Vitrine
      sobretitulo="Busca"
      titulo={termo ? `Resultados para “${termo}”` : "Buscar no catálogo"}
      descricao={
        termo
          ? undefined
          : "Procure pelo nome do equipamento, pela marca, pelo modelo ou pelo código da peça. Se não aparecer nada, descreva o que a clínica precisa: a equipe responde com preço e prazo."
      }
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Busca" }]}
      caminho="/busca"
      parametros={parametros}
    />
  );
}
