import Link from "next/link";

import { TituloPagina } from "@/components/admin/shell";
import { Etiqueta } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Páginas" };

const ROTA_PUBLICA: Record<string, string> = {
  index: "/",
  empresa: "/empresa",
  estrutura: "/estrutura",
  solucoes: "/solucoes",
  contato: "/contato",
};

export default async function PaginasPage() {
  const paginas = await prisma.page.findMany({ orderBy: { slug: "asc" } });

  return (
    <>
      <TituloPagina
        titulo="Páginas"
        descricao="Título, texto de apoio e conteúdo de cada página do site."
      />

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {paginas.map((pagina) => (
          <li key={pagina.slug}>
            <Link
              href={`/admin/paginas/${pagina.slug}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-900">{pagina.title}</span>
              <span className="font-mono text-xs text-slate-400">
                {ROTA_PUBLICA[pagina.slug] ?? `/${pagina.slug}`}
              </span>
              {pagina.editable ? (
                <Etiqueta tom="verde">com conteúdo</Etiqueta>
              ) : (
                <Etiqueta tom="cinza">só título e SEO</Etiqueta>
              )}
              <span className="ml-auto text-xs text-slate-400">
                alterada em {formatDateTime(pagina.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
