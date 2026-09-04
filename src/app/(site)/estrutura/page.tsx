import type { Metadata } from "next";

import { PaginaInstitucional } from "@/components/site/pagina-institucional";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.page.findUnique({ where: { slug: "estrutura" } });
  return { description: page?.seoDescription ?? page?.lead };
}

export default function EstruturaPage() {
  return <PaginaInstitucional slug="estrutura" />;
}
