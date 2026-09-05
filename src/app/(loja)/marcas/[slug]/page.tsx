import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ParametrosVitrine>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const marca = await prisma.brand.findUnique({ where: { slug } });
  if (!marca) return {};
  return {
    title: marca.name,
    description: marca.description || `Equipamentos ${marca.name} vendidos e atendidos pela JB.`,
    alternates: { canonical: `/marcas/${marca.slug}` },
  };
}

export default async function MarcaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const marca = await prisma.brand.findUnique({ where: { slug } });
  if (!marca || !marca.published) notFound();

  return (
    <Vitrine
      titulo={marca.name}
      descricao={marca.description || undefined}
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Marcas", href: "/marcas" },
        { rotulo: marca.name },
      ]}
      parametros={await searchParams}
      filtrosFixos={{ marca: marca.slug }}
    />
  );
}
