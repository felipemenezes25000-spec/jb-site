import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { textoDeHtml } from "@/lib/html";
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
    description:
      textoDeHtml(marca.description) ||
      `Equipamentos ${marca.name} vendidos e atendidos pela JB.`,
    alternates: { canonical: `/marcas/${marca.slug}` },
  };
}

export default async function MarcaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const marca = await prisma.brand.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      published: true,
      logo: { select: { url: true, alt: true } },
    },
  });
  if (!marca || !marca.published) notFound();

  return (
    <Vitrine
      titulo={marca.name}
      descricao={textoDeHtml(marca.description) || undefined}
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Marcas", href: "/marcas" },
        { rotulo: marca.name },
      ]}
      caminho={`/marcas/${marca.slug}`}
      parametros={await searchParams}
      filtrosFixos={{ marca: marca.slug }}
      // o nome da marca já é o título da página: a logo entra como decoração
      imagem={marca.logo ? { url: marca.logo.url, alt: "" } : undefined}
      travarMarca
    />
  );
}
