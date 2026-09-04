import { notFound } from "next/navigation";

import { PageTitle } from "@/components/site/page-title";
import { prisma } from "@/lib/prisma";

/**
 * Porte fiel de empresa.php / estrutura.php: texto à esquerda, imagens
 * empilhadas à direita. Sem imagem nem vídeo, o texto ocupa as 12 colunas —
 * exatamente a regra do $col do PHP original.
 */
export async function PaginaInstitucional({ slug }: { slug: string }) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      cover: true,
      gallery: { include: { media: true }, orderBy: { order: "asc" } },
    },
  });

  if (!page) notFound();

  const imagens = [page.cover, ...page.gallery.map((g) => g.media)].filter(
    (m): m is NonNullable<typeof m> => Boolean(m),
  );
  const temMidia = imagens.length > 0 || Boolean(page.videoId);
  const col = temMidia ? 6 : 12;

  return (
    <>
      <PageTitle titulo={page.title} descricao={page.lead} />

      <section id="about-us" className="container">
        <div className="row">
          <div
            className={`col-sm-${col}`}
            dangerouslySetInnerHTML={{ __html: page.body }}
          />

          {temMidia ? (
            <div className="col-sm-6" style={{ marginTop: 20 }}>
              {imagens.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt || page.title}
                  className="img-responsive"
                  style={{ margin: "0 auto 10px auto" }}
                />
              ))}
              {page.videoId ? (
                <>
                  <h4 style={{ marginTop: 30 }}>Vídeo</h4>
                  <div className="responsive-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${page.videoId}`}
                      title="Vídeo"
                      frameBorder={0}
                      allowFullScreen
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="gap" />
      </section>
    </>
  );
}
