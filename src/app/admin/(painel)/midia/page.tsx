import { MidiaGaleria } from "@/components/admin/midia-galeria";
import { TituloPagina } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Mídia" };

export default async function MidiaPage() {
  const user = await requireUser();

  const arquivos = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { pageCovers: true, pageImages: true, categoryImages: true, highlights: true, slides: true },
      },
    },
  });

  return (
    <>
      <TituloPagina
        titulo="Mídia"
        descricao="Todas as imagens do site. As enviadas aqui ficam disponíveis nos demais formulários."
      />
      <MidiaGaleria
        podeExcluir={user.role === "admin"}
        arquivos={arquivos.map((a) => ({
          id: a.id,
          url: a.url,
          filename: a.filename,
          alt: a.alt,
          width: a.width,
          height: a.height,
          size: a.size,
          usos:
            a._count.pageCovers +
            a._count.pageImages +
            a._count.categoryImages +
            a._count.highlights +
            a._count.slides,
        }))}
      />
    </>
  );
}
