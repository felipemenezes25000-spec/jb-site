import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { logoDaMarca } from "@/lib/marcas";

type Marca = {
  slug: string;
  name: string;
  logo: { url: string; alt: string | null } | null;
};

function CartaoMarca({ marca }: { marca: Marca }) {
  const arte = logoDaMarca(marca);

  return (
    <Link
      href={`/marcas/${marca.slug}`}
      className="group foco-jb flex min-h-36 min-w-0 flex-col items-center justify-center rounded-xl border border-graf-200 bg-white px-4 py-5 text-center transition-colors hover:border-jb-200 hover:bg-jb-50/30"
    >
      <span className="flex h-14 w-full min-w-0 items-center justify-center">
        {arte ? (
          <Image
            src={arte.url}
            alt={arte.alt}
            width={240}
            height={96}
            sizes="(max-width: 640px) 120px, 160px"
            className="max-h-12 w-auto max-w-[85%] object-contain"
          />
        ) : (
          <span className="max-w-full break-words text-lg font-extrabold tracking-[-0.025em] text-graf-900">
            {marca.name}
          </span>
        )}
      </span>
      <span className="mt-3 block max-w-full break-words text-sm font-bold text-graf-800 group-hover:text-jb-700">
        {marca.name}
      </span>
      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-graf-500 group-hover:text-jb-700">
        Ver produtos
        <ArrowRight className="size-3" aria-hidden />
      </span>
    </Link>
  );
}

export function MarcasCarousel({ marcas }: { marcas: Marca[] }) {
  if (marcas.length === 0) return null;

  return (
    <section className="border-b border-graf-200 bg-white py-12 lg:py-16">
      <div className="container-jb max-w-[100rem]">
        <div className="flex flex-col gap-4 border-b border-graf-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Marcas
            </p>
            <h2 className="mt-2 text-[clamp(1.7rem,1.35rem+1.4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-graf-950">
              Encontre produtos por fabricante.
            </h2>
            <p className="mt-2 text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
              Navegue pelas marcas com produtos publicados na loja e abra a coleção de cada fabricante.
            </p>
          </div>

          <Link
            href="/marcas"
            className="foco-jb inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
          >
            Ver todas as marcas
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-6 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {marcas.slice(0, 12).map((marca) => (
            <li key={marca.slug} className="min-w-0">
              <CartaoMarca marca={marca} />
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs text-graf-500">
          {marcas.length} {marcas.length === 1 ? "marca com produto publicado" : "marcas com produtos publicados"}.
        </p>
      </div>
    </section>
  );
}
