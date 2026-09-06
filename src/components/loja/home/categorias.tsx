import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { Secao } from "@/components/ui/secao";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;
const MINIMO_PARA_CONTAR = 4;

async function carregar() {
  return prisma.category.findMany({
    where: { published: true, parentId: null, products: { some: PUBLICADO } },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 3,
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
    <Secao fundo="branco" espaco="lg" className="overflow-hidden" classNameInterno="max-w-[100rem]">
      <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-jb-600" aria-hidden />
            <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">
              Categorias em destaque
            </span>
          </div>
          <h2 className="max-w-[44rem] text-[clamp(2.4rem,4vw,4.2rem)] font-black leading-[0.98] tracking-[-0.05em] text-graf-950">
            Tudo para a sua clínica, em um só lugar.
          </h2>
        </div>

        <Link
          href="/loja"
          className="group inline-flex min-h-11 items-center gap-2 self-start text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 sm:self-auto"
        >
          Ver todas as categorias
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {categorias.map((categoria, indice) => {
          const fotoProduto = categoria.products[0]?.media[0];
          const total = categoria._count.products;
          const foto = categoria.image
            ? { url: categoria.image.url, alt: categoria.image.alt ?? categoria.name, modo: "cover" as const }
            : fotoProduto
              ? { url: fotoProduto.media.url, alt: fotoProduto.alt ?? fotoProduto.media.alt ?? categoria.name, modo: "contain" as const }
              : null;

          return (
            <li key={categoria.slug} className="min-w-0">
              <Link
                href={`/categoria/${categoria.slug}`}
                className="group flex min-h-[24rem] flex-col overflow-hidden rounded-[1.8rem] border border-jb-100 bg-white shadow-[0_18px_50px_-38px_rgba(120,0,0,0.28)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-jb-300 hover:shadow-[0_24px_60px_-34px_rgba(120,0,0,0.34)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <div className="relative min-h-[16rem] flex-1 overflow-hidden bg-white">
                  {foto ? (
                    <Image
                      src={foto.url}
                      alt={foto.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className={foto.modo === "cover"
                        ? "object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                        : "object-contain p-7 transition-transform duration-700 group-hover:scale-[1.055]"
                      }
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-jb-50 text-jb-600" aria-hidden>
                      <IconeCategoria nome={categoria.icon} className="size-16" />
                    </span>
                  )}

                  <span className="absolute left-5 top-5 text-[0.66rem] font-black tracking-[0.2em] text-jb-700">
                    0{indice + 1}
                  </span>
                </div>

                <div className="border-t border-jb-100 bg-white p-6">
                  <h3 className="text-[1.55rem] font-black leading-tight tracking-[-0.035em] text-graf-950 transition-colors group-hover:text-jb-700">
                    {categoria.name}
                  </h3>

                  <div className="mt-3 flex items-end justify-between gap-5">
                    <p className="max-w-[15rem] text-sm leading-6 text-graf-500">
                      {total >= MINIMO_PARA_CONTAR
                        ? `${plural(total, "equipamento", "equipamentos")} nesta categoria.`
                        : "Explore os equipamentos disponíveis nesta categoria."}
                    </p>

                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-jb-100 text-jb-700 transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-jb-600 group-hover:text-white"
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
