import Link from "next/link";

import { TituloPagina } from "@/components/admin/shell";
import { Etiqueta } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Soluções" };

export default async function SolucoesAdminPage() {
  const solucoes = await prisma.serviceCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { image: true },
  });

  return (
    <>
      <TituloPagina
        titulo="Soluções"
        descricao="Cada item vira um bloco sanfonado na página de Soluções."
        acao={
          <Link
            href="/admin/solucoes/nova"
            className="rounded-md bg-jb-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-jb-600"
          >
            Nova solução
          </Link>
        }
      />

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {solucoes.map((solucao) => (
          <li key={solucao.slug}>
            <Link
              href={`/admin/solucoes/${solucao.slug}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                {solucao.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={solucao.image.url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-400">sem foto</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{solucao.name}</span>
                <span className="block font-mono text-xs text-slate-400">{solucao.slug}</span>
              </span>
              <span className="text-xs text-slate-400">ordem {solucao.order}</span>
              {solucao.published ? (
                <Etiqueta tom="verde">no ar</Etiqueta>
              ) : (
                <Etiqueta tom="cinza">oculta</Etiqueta>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
