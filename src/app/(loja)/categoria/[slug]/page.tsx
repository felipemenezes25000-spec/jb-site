import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
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
    description: categoria.seoDescription ?? (categoria.description || undefined),
    alternates: { canonical: `/categoria/${categoria.slug}` },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const categoria = await prisma.category.findUnique({ where: { slug } });
  if (!categoria || !categoria.published) notFound();

  return (
    <Vitrine
      titulo={categoria.name}
      descricao={categoria.description || undefined}
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: categoria.name },
      ]}
      parametros={await searchParams}
      filtrosFixos={{ categoria: categoria.slug }}
      travarCategoria
    />
  );
}
