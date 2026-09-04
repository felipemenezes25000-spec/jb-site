import type { Metadata } from "next";

import { ContatoForm } from "@/components/site/contato-form";
import { PageTitle } from "@/components/site/page-title";
import { nl2brHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.page.findUnique({ where: { slug: "contato" } });
  return { description: page?.seoDescription ?? page?.lead };
}

export default async function ContatoPage() {
  const [page, s] = await Promise.all([
    prisma.page.findUnique({ where: { slug: "contato" } }),
    getSettings(),
  ]);

  return (
    <>
      <PageTitle titulo={page?.title ?? "Contato"} descricao={page?.lead} />

      <section id="about-us" className="container">
        <div className="row">
          <div className="col-sm-6">
            <ContatoForm />
          </div>

          {/* O bloco vem inteiro como HTML porque o conteúdo do MARS traz um
              <h4> dentro do <h3>: o parser do navegador fecha o <h3> antes do
              <h4>, e é assim que o site antigo aparece. Montar em JSX mudaria
              o aninhamento — e, com ele, o tamanho do texto. */}
          <div
            className="col-sm-6"
            dangerouslySetInnerHTML={{
              __html:
                `<h3>${nl2brHtml(s.contato_html)}</h3>` +
                (s.maps_html ? `<div class="responsive-video">${s.maps_html}</div>` : ""),
            }}
          />
        </div>
      </section>
    </>
  );
}
