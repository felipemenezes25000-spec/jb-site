import { prisma } from "@/lib/prisma";

import { MarcasCarousel } from "./marcas-carousel";

const PUBLICADO = { status: "active" } as const;

async function carregar() {
  return prisma.brand.findMany({
    where: { published: true, products: { some: PUBLICADO } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    take: 8,
    select: { slug: true, name: true, logo: { select: { url: true, alt: true } } },
  });
}

export async function SecaoMarcas() {
  const marcas = await carregar();
  if (marcas.length === 0) return null;

  return <MarcasCarousel marcas={marcas} />;
}
