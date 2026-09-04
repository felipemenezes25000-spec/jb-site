import Link from "next/link";
import { notFound } from "next/navigation";

import { PaginaForm } from "@/components/admin/pagina-form";
import { TituloPagina } from "@/components/admin/shell";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const pagina = await prisma.page.findUnique({ where: { slug } });
  return { title: pagina?.title ?? "Página" };
}

export default async function EditarPaginaPage({ params }: Props) {
  const { slug } = await params;

  const [pagina, biblioteca] = await Promise.all([
    prisma.page.findUnique({
      where: { slug },
      include: { gallery: { orderBy: { order: "asc" } } },
    }),
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
  ]);

  if (!pagina) notFound();

  return (
    <>
      <TituloPagina
        titulo={pagina.title}
        descricao={pagina.editable ? "Conteúdo, imagens e SEO." : "Título e SEO desta página."}
        acao={
          <Link href="/admin/paginas" className="text-sm text-slate-500 hover:text-slate-800">
            ← todas as páginas
          </Link>
        }
      />
      <PaginaForm
        pagina={{
          slug: pagina.slug,
          title: pagina.title,
          lead: pagina.lead ?? "",
          body: pagina.body,
          videoId: pagina.videoId ?? "",
          coverId: pagina.coverId,
          seoTitle: pagina.seoTitle ?? "",
          seoDescription: pagina.seoDescription ?? "",
          editable: pagina.editable,
          galeria: pagina.gallery.map((g) => g.mediaId),
        }}
        biblioteca={biblioteca}
      />
    </>
  );
}
