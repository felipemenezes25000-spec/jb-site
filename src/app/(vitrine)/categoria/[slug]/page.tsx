import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { chaveDeNome } from "@/lib/homonimos";
import { textoDeHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";
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

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ParametrosVitrine>;
};

export async function generateStaticParams() {
  const categorias = await prisma.category.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return categorias.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categoria = await prisma.category.findUnique({ where: { slug } });
  if (!categoria) return {};
  return metadataDePagina({
    titulo: categoria.seoTitle || categoria.name,
    descricao: categoria.seoDescription || textoDeHtml(categoria.description),
    caminho: `/categoria/${categoria.slug}`,
  });
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const categoria = await prisma.category.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      published: true,
      parent: { select: { slug: true, name: true, published: true } },
    },
  });
  if (!categoria) notFound();

  /* Categoria despublicada por unificação continua tendo link antigo, índice
     de busca e favorito apontando para ela. Quando existe uma publicada com o
     mesmo nome — que é o caso das duplicatas que `scripts/unificar-
     duplicatas.ts` junta — o endereço velho leva para ela em vez de bater num
     404. Sem homônima publicada, segue sendo 404, que é a resposta certa para
     uma prateleira que a JB tirou do ar. */
  if (!categoria.published) {
    const publicadas = await prisma.category.findMany({
      where: { published: true },
      select: { slug: true, name: true },
    });
    const herdeira = publicadas.find(
      (outra) => chaveDeNome(outra.name) === chaveDeNome(categoria.name),
    );
    if (herdeira) permanentRedirect(`/categoria/${herdeira.slug}`);
    notFound();
  }

  const [parametros, atalhos] = await Promise.all([
    searchParams,
    atalhosDeSubcategorias(categoria.slug),
  ]);

  // categoria filha mostra a mãe na trilha — a pessoa sabe de onde veio
  const pai =
    categoria.parent && categoria.parent.published ? categoria.parent : null;

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Equipamentos", href: "/loja" },
    ...(pai ? [{ rotulo: pai.name, href: `/categoria/${pai.slug}` }] : []),
    { rotulo: categoria.name },
  ];

  return (
    /* `vitrine` liga o acabamento do painel de filtros e da barra de busca —
       a mesma camada de passagem que /loja e /seminovos usam. */
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(trilha)} />

      <Vitrine
        sobretitulo="Categoria"
        titulo={categoria.name}
        descricao={textoDeHtml(categoria.description) || undefined}
        trilha={trilha}
        caminho={`/categoria/${categoria.slug}`}
        parametros={parametros}
        filtrosFixos={{ categoria: categoria.slug }}
        atalhos={atalhos}
        rotuloAtalhos={`Subcategorias de ${categoria.name}`}
        travarCategoria
      />
    </div>
  );
}
