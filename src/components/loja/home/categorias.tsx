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
    <Secao fundo="branco" espaco="lg" className="overflow-hidden" classNameInterno="max-w-[112rem]">
      <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-jb-600" aria-hidden />
            <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">
              Compre por categoria
            </span>
          </div>
          <h2 className="max-w-[44rem] text-[clamp(2.35rem,3.7vw,3.9rem)] font-black leading-[0.98] tracking-[-0.05em] text-graf-950">
            Encontre rápido o que a sua clínica precisa.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-graf-500">
            Navegue pelas principais famílias do catálogo e compare modelos, condição e disponibilidade.
          </p>
        </div>

        <Link
          href="/loja"
          className="group inline-flex min-h-11 items-center gap-2 self-start text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 sm:self-auto"
        >
          Ver catálogo completo
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className="group grid min-h-[16.5rem] grid-cols-[minmax(0,1fr)_8.5rem] overflow-hidden rounded-[1.5rem] border border-graf-200 bg-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-jb-200 hover:shadow-[0_22px_58px_-40px_rgba(103,0,0,0.38)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:grid-cols-1 sm:grid-rows-[10.5rem_auto]"
              >
                <div className="order-2 relative overflow-hidden bg-[linear-gradient(145deg,#fff_0%,#fafafa_100%)] sm:order-1">
                  {foto ? (
                    <Image
                      src={foto.url}
                      alt={foto.alt}
                      fill
                      sizes="(max-width: 640px) 35vw, (max-width: 1024px) 50vw, 33vw"
                      className={foto.modo === "cover"
                        ? "object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                        : "object-contain p-5 transition-transform duration-700 group-hover:scale-[1.06]"
                      }
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-jb-50 text-jb-600" aria-hidden>
                      <IconeCategoria nome={categoria.icon} className="size-12" />
                    </span>
                  )}

                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.16em] text-jb-700 shadow-sm backdrop-blur-sm">
                    0{indice + 1}
                  </span>
                </div>

                <div className="order-1 flex min-w-0 flex-col justify-center p-5 sm:order-2 sm:border-t sm:border-graf-100 sm:p-6">
                  <h3 className="text-[1.35rem] font-black leading-tight tracking-[-0.035em] text-graf-950 transition-colors group-hover:text-jb-700">
                    {categoria.name}
                  </h3>

                  <div className="mt-3 flex items-end justify-between gap-4">
                    <p className="text-xs leading-5 text-graf-500">
                      {total >= MINIMO_PARA_CONTAR
                        ? plural(total, "equipamento disponível", "equipamentos disponíveis")
                        : "Ver equipamentos disponíveis"}
                    </p>
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-jb-100 text-jb-700 transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-jb-600 group-hover:text-white"
                    >
                      <ArrowRight className="size-3.5" />
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
