import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Vitrine,
  atalhosDeSubcategorias,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { textoDeHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";

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
  return {
    title: categoria.seoTitle ?? categoria.name,
    description: categoria.seoDescription ?? (textoDeHtml(categoria.description) || undefined),
    alternates: { canonical: `/categoria/${categoria.slug}` },
  };
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
  if (!categoria || !categoria.published) notFound();

  const [parametros, atalhos] = await Promise.all([
    searchParams,
    atalhosDeSubcategorias(categoria.slug),
  ]);

  // categoria filha mostra a mãe na trilha — a pessoa sabe de onde veio
  const pai =
    categoria.parent && categoria.parent.published ? categoria.parent : null;

  return (
    <Vitrine
      titulo={categoria.name}
      descricao={textoDeHtml(categoria.description) || undefined}
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        ...(pai ? [{ rotulo: pai.name, href: `/categoria/${pai.slug}` }] : []),
        { rotulo: categoria.name },
      ]}
      caminho={`/categoria/${categoria.slug}`}
      parametros={parametros}
      filtrosFixos={{ categoria: categoria.slug }}
      atalhos={atalhos}
      rotuloAtalhos={`Subcategorias de ${categoria.name}`}
      travarCategoria
    />
  );
}
