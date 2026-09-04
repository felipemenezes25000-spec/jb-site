import type { Metadata } from "next";

import { PageTitle } from "@/components/site/page-title";
import { SolucoesAccordion, type SolucaoView } from "@/components/site/solucoes-accordion";
import { nl2brHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.page.findUnique({ where: { slug: "solucoes" } });
  return { description: page?.seoDescription ?? page?.lead };
}

export default async function SolucoesPage() {
  const [page, categorias] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "solucoes" } }),
    prisma.serviceCategory.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      include: { image: true },
    }),
  ]);

  const solucoes: SolucaoView[] = categorias.map((cat) => ({
    id: cat.slug,
    nome: cat.name,
    descricaoHtml: nl2brHtml(cat.description),
    foto: cat.image?.url ?? null,
  }));

  return (
    <>
      <PageTitle titulo={page?.title ?? "Soluções"} descricao={page?.lead} />

      <section id="about-us" className="container">
        <div className="row">
          <div className="col-sm-12">
            <SolucoesAccordion solucoes={solucoes} />
          </div>
        </div>
      </section>
    </>
  );
}
