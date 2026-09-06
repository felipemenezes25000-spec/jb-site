import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;

async function carregar() {
  return prisma.brand.findMany({
    where: { published: true, products: { some: PUBLICADO } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    take: 12,
    select: { slug: true, name: true, logo: { select: { url: true, alt: true } } },
  });
}

export async function SecaoMarcas() {
  const marcas = await carregar();
  if (marcas.length === 0) return null;

  return (
    <section className="bg-white py-14 md:py-16 lg:py-20">
      <div className="container-jb max-w-[112rem]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">Marcas no catálogo</p>
            </div>
            <h2 className="mt-4 max-w-[12ch] text-[clamp(2.3rem,3.7vw,4rem)] font-black leading-[0.95] tracking-[-0.05em] text-graf-950">
              Marcas que fazem parte do dia a dia da JB.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-graf-500 sm:text-base">
              Navegue por fabricante para encontrar os equipamentos publicados e os modelos que a equipe acompanha.
            </p>
            <Link
              href="/marcas"
              className="group mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-700 hover:text-jb-900"
            >
              Ver todas as marcas
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <ul className="grid overflow-hidden rounded-[1.6rem] border border-graf-200 bg-[#fafafa] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {marcas.map((marca) => (
              <li key={marca.slug} className="flex border-b border-r border-graf-200 last:border-r-0">
                <Link
                  href={`/marcas/${marca.slug}`}
                  className="group flex min-h-24 w-full items-center justify-center bg-white/70 px-5 py-6 transition-[background-color,transform] hover:bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                >
                  {marca.logo ? (
                    <Image
                      src={marca.logo.url}
                      alt={marca.logo.alt || marca.name}
                      width={170}
                      height={54}
                      className="h-8 w-auto max-w-full object-contain opacity-80 grayscale transition-[filter,opacity,transform] duration-300 group-hover:scale-[1.04] group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  ) : (
                    <span className="text-center text-base font-black tracking-[-0.02em] text-graf-700 transition-colors group-hover:text-jb-700">
                      {marca.name}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
