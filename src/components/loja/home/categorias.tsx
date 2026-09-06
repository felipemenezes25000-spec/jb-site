import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { Secao } from "@/components/ui/secao";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Categorias do catálogo

   A home precisa deixar o visitante se localizar rápido. Em vez de seis cards
   altos com parágrafos, as categorias viram uma faixa editorial compacta: foto
   real, nome, contagem quando ela ajuda e uma ação inequívoca. No desktop as
   seis cabem na mesma fileira; no celular continuam legíveis em duas colunas.
   ============================================================================ */

const PUBLICADO = { status: "active" } as const;
const MINIMO_PARA_CONTAR = 4;

async function carregar() {
  return prisma.category.findMany({
    where: {
      published: true,
      parentId: null,
      products: { some: PUBLICADO },
    },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 6,
    select: {
      slug: true,
      name: true,
      icon: true,
      image: { select: { url: true, alt: true } },
      _count: { select: { products: { where: PUBLICADO } } },
      products: {
        where: { ...PUBLICADO, media: { some: {} } },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 1,
        select: {
          media: {
            orderBy: { order: "asc" },
            take: 1,
            select: { alt: true, media: { select: { url: true, alt: true } } },
          },
        },
      },
    },
  });
}

export async function SecaoCategorias() {
  const categorias = await carregar();
  if (categorias.length === 0) return null;

  return (
    <Secao fundo="branco" espaco="lg" className="overflow-hidden">
      <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-graf-500">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Categorias em destaque
          </div>
          <h2 className="mt-3 text-section text-graf-950">Encontre o que sua clínica precisa</h2>
        </div>

        <Link
          href="/loja"
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-graf-800 transition-colors hover:text-jb-700 sm:self-auto"
        >
          Ver todas as categorias
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {categorias.map((categoria) => {
          const fotoProduto = categoria.products[0]?.media[0];
          const total = categoria._count.products;

          return (
            <li key={categoria.slug} className="min-w-0">
              <Link
                href={`/categoria/${categoria.slug}`}
                className="group flex h-full min-h-[15rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-white to-graf-50">
                  {categoria.image ? (
                    <Image
                      src={categoria.image.url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 46vw, (max-width: 1280px) 30vw, 15vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.055]"
                    />
                  ) : fotoProduto ? (
                    <Image
                      src={fotoProduto.media.url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 46vw, (max-width: 1280px) 30vw, 15vw"
                      className="object-contain p-4 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07] sm:p-5"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center text-jb-600/70"
                    >
                      <IconeCategoria nome={categoria.icon} className="size-12" />
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col border-t border-graf-200 p-4 sm:p-4.5">
                  <h3 className="text-base font-extrabold leading-snug text-graf-950 transition-colors group-hover:text-jb-700">
                    {categoria.name}
                  </h3>

                  <div className="mt-auto flex min-w-0 items-end justify-between gap-3 pt-4">
                    <span className="min-w-0 text-xs font-semibold text-graf-500">
                      {total >= MINIMO_PARA_CONTAR ? plural(total, "item", "itens") : "Ver categoria"}
                    </span>
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-graf-200 bg-graf-50 text-graf-800 transition-[background-color,color,transform] duration-200 group-hover:translate-x-0.5 group-hover:border-jb-500 group-hover:bg-jb-500 group-hover:text-white"
                    >
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
