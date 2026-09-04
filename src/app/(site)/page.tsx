import type { Metadata } from "next";
import Link from "next/link";

import { MainSlider, type SlideView } from "@/components/site/main-slider";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { nl2br, stripTags } from "@/lib/html";

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.page.findUnique({ where: { slug: "index" } });
  return {
    title: page?.seoTitle ?? undefined,
    description: page?.seoDescription ?? page?.lead ?? undefined,
  };
}

export default async function HomePage() {
  const agora = new Date();

  const [s, slides, chamadas] = await Promise.all([
    getSettings(),
    prisma.slide.findMany({
      where: {
        published: true,
        imageId: { not: null },
        OR: [{ endsAt: null }, { endsAt: { gt: agora } }],
      },
      orderBy: { order: "asc" },
      include: { image: true },
    }),
    prisma.highlight.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      include: { image: true },
    }),
  ]);

  const view: SlideView[] = slides
    .filter((slide) => slide.image)
    .map((slide) => ({
      id: slide.id,
      imagem: slide.image!.url,
      titulo: slide.title || null,
      subtitulo: slide.subtitle || null,
      link: slide.href || null,
    }));

  return (
    <>
      <MainSlider slides={view} />

      <section id="master" className="white" style={{ background: "#eee" }}>
        <div className="container">
          <div className="row center">
            <h1 className="desc-master">{stripTags(s.descricao_master)}</h1>
          </div>
        </div>
      </section>

      <section id="services" style={{ background: "#eee" }}>
        <div className="container">
          <div className="row">
            {chamadas.map((item) => {
              const externo = item.target === "_blank";
              const conteudo = (children: React.ReactNode) =>
                item.href ? (
                  externo ? (
                    <a
                      href={item.href}
                      title={item.title}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ) : (
                    <Link href={item.href} title={item.title} target={item.target}>
                      {children}
                    </Link>
                  )
                ) : (
                  <>{children}</>
                );

              return (
                <div key={item.id} className="col-md-4 col-sm-4 col-xs-12">
                  <div className="media">
                    <div className="media-body">
                      {item.image
                        ? conteudo(
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image.url}
                              alt={item.title}
                              className="img-responsive"
                            />,
                          )
                        : null}
                      {conteudo(<h3 className="media-heading">{item.title}</h3>)}
                      <h4>{item.subtitle}</h4>
                      <p>{nl2br(item.body ?? "")}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
