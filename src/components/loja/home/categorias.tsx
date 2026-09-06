import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;
const MINIMO_PARA_CONTAR = 4;

async function carregar() {
  return prisma.category.findMany({
    where: { published: true, parentId: null, products: { some: PUBLICADO } },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 4,
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

type CategoriaHome = Awaited<ReturnType<typeof carregar>>[number];

function fotoCategoria(categoria: CategoriaHome) {
  const fotoProduto = categoria.products[0]?.media[0];

  if (categoria.image) {
    return {
      url: categoria.image.url,
      alt: categoria.image.alt ?? categoria.name,
      modo: "cover" as const,
    };
  }

  if (fotoProduto) {
    return {
      url: fotoProduto.media.url,
      alt: fotoProduto.alt ?? fotoProduto.media.alt ?? categoria.name,
      modo: "contain" as const,
    };
  }

  return null;
}

function detalheCategoria(categoria: CategoriaHome) {
  const total = categoria._count.products;
  return total >= MINIMO_PARA_CONTAR
    ? plural(total, "equipamento disponível", "equipamentos disponíveis")
    : "Explore os equipamentos disponíveis";
}

export async function SecaoCategorias() {
  const categorias = await carregar();
  if (categorias.length === 0) return null;

  const [principal, ...outras] = categorias;

  return (
    <section className="bg-white py-16 md:py-20 lg:py-24">
      <div className="container-jb max-w-[112rem]">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">Compre por categoria</p>
            </div>
            <h2 className="mt-4 max-w-[16ch] text-[clamp(2.6rem,4vw,4.6rem)] font-black leading-[0.94] tracking-[-0.055em] text-graf-950">
              Menos procura. Mais clareza para escolher.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-graf-500">
              Entre pela necessidade da clínica e chegue mais rápido aos modelos que realmente fazem sentido comparar.
            </p>
          </div>

          <Link
            href="/loja"
            className="group inline-flex min-h-11 items-center gap-2 self-start text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 lg:self-end"
          >
            Ver catálogo completo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
          <CategoriaPrincipal categoria={principal} />

          {outras.length > 0 ? (
            <ul className="grid gap-4">
              {outras.map((categoria, indice) => (
                <li key={categoria.slug} className="min-w-0">
                  <CategoriaCompacta categoria={categoria} numero={indice + 2} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CategoriaPrincipal({ categoria }: { categoria: CategoriaHome }) {
  const foto = fotoCategoria(categoria);

  return (
    <Link
      href={`/categoria/${categoria.slug}`}
      className="group relative grid min-h-[29rem] overflow-hidden rounded-[2rem] bg-[#111214] text-white shadow-[0_30px_76px_-50px_rgba(55,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-jb-500 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <div className="relative z-10 flex min-w-0 flex-col justify-end p-7 sm:p-8 lg:p-10">
        <span className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-jb-300">Categoria em destaque</span>
        <h3 className="mt-3 max-w-[9ch] text-[clamp(2.2rem,3.8vw,4.2rem)] font-black leading-[0.92] tracking-[-0.055em] text-white">
          {categoria.name}
        </h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">{detalheCategoria(categoria)}</p>
        <span className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-extrabold text-white">
          Explorar categoria
          <span className="flex size-9 items-center justify-center rounded-full bg-jb-600 transition-transform group-hover:translate-x-1">
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </span>
      </div>

      <div className="relative min-h-72 overflow-hidden bg-[linear-gradient(145deg,#ffffff_0%,#f5f5f5_100%)] sm:min-h-full">
        <div className="absolute -right-16 -top-20 size-72 rounded-full border-[3rem] border-jb-100" aria-hidden />
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 100vw, 46vw"
            className={foto.modo === "cover"
              ? "object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              : "object-contain p-[10%] transition-transform duration-700 group-hover:scale-[1.06]"
            }
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-500" aria-hidden>
            <IconeCategoria nome={categoria.icon} className="size-20" />
          </span>
        )}
      </div>
    </Link>
  );
}

function CategoriaCompacta({
  categoria,
  numero,
}: {
  categoria: CategoriaHome;
  numero: number;
}) {
  const foto = fotoCategoria(categoria);

  return (
    <Link
      href={`/categoria/${categoria.slug}`}
      className="group grid min-h-[9.3rem] grid-cols-[minmax(0,1fr)_9.5rem] overflow-hidden rounded-[1.35rem] border border-graf-200 bg-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-[0_20px_48px_-40px_rgba(80,0,0,0.42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:grid-cols-[minmax(0,1fr)_12rem]"
    >
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-6">
        <span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-jb-500">0{numero}</span>
        <h3 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-graf-950 transition-colors group-hover:text-jb-700 sm:text-2xl">
          {categoria.name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[0.7rem] leading-relaxed text-graf-500">{detalheCategoria(categoria)}</p>
          <ArrowRight className="ml-auto size-3.5 shrink-0 text-jb-600 transition-transform group-hover:translate-x-1" aria-hidden />
        </div>
      </div>

      <div className="relative overflow-hidden border-l border-graf-100 bg-[#fafafa]">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="12rem"
            className={foto.modo === "cover"
              ? "object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              : "object-contain p-4 transition-transform duration-500 group-hover:scale-[1.08]"
            }
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-400" aria-hidden>
            <IconeCategoria nome={categoria.icon} className="size-10" />
          </span>
        )}
      </div>
    </Link>
  );
}
