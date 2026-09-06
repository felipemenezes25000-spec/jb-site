import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Secao } from "@/components/ui/secao";
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
    <Secao fundo="branco" espaco="md" separador classNameInterno="max-w-[112rem]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Marcas no catálogo
          </p>
          <h2 className="mt-3 text-section text-graf-950">Equipamentos que a JB vende e acompanha</h2>
        </div>

        <Link href="/marcas" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-extrabold text-jb-700 hover:text-jb-900 sm:self-auto">
          Ver todas as marcas
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-8 grid overflow-hidden rounded-2xl border-2 border-jb-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {marcas.map((marca) => (
          <li key={marca.slug} className="flex border-b border-r border-jb-100 last:border-r-0 xl:border-b-0">
            <Link href={`/marcas/${marca.slug}`} className="group flex min-h-28 w-full items-center justify-center bg-white px-5 py-7 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500">
              {marca.logo ? (
                <Image src={marca.logo.url} alt={marca.logo.alt || marca.name} width={180} height={56} className="h-9 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
              ) : (
                <span className="text-center text-lg font-extrabold tracking-tight text-graf-900 transition-colors group-hover:text-jb-700">{marca.name}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm leading-relaxed text-graf-600">
        Não encontrou a marca?{" "}
        <Link href="/assistencia-tecnica/solicitar" className="inline-flex min-h-11 items-center font-extrabold text-jb-700 underline-offset-4 hover:underline">
          Informe marca e modelo ao abrir o chamado
        </Link>{" "}
        para a equipe avaliar o atendimento.
      </p>
    </Secao>
  );
}
