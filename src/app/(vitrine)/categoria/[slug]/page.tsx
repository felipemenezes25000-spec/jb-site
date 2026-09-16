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

  const pai = categoria.parent && categoria.parent.published ? categoria.parent : null;

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Loja", href: "/loja" },
    ...(pai ? [{ rotulo: pai.name, href: `/categoria/${pai.slug}` }] : []),
    { rotulo: categoria.name },
  ];

  return (
    <>
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
    </>
  );
}
