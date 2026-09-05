import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TituloSecao } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Marcas

   Só as marcas cadastradas e publicadas que têm produto no ar. Nada de mural
   de "parceiros" com logotipo de fabricante que a JB não representa.

   Marca sem logotipo aparece pelo nome, com o mesmo peso das outras — o mural
   continua alinhado em vez de abrir um buraco.
   ============================================================================ */

const PUBLICADO = { status: "active" } as const;

async function carregar() {
  return prisma.brand.findMany({
    where: { published: true, products: { some: PUBLICADO } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    take: 12,
    select: {
      slug: true,
      name: true,
      logo: { select: { url: true, alt: true } },
    },
  });
}

export async function SecaoMarcas() {
  const marcas = await carregar();
  if (marcas.length === 0) return null;

  return (
    <Secao fundo="branco" espaco="md" separador>
      <TituloSecao
        sobretitulo="Marcas"
        titulo="As marcas que estão no catálogo"
        acao={
          <Link
            href="/marcas"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-jb-700 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Ver todas as marcas
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        }
        className="mb-8"
      />

      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-graf-200 bg-graf-200 sm:grid-cols-3 lg:grid-cols-6">
        {/* As divisórias são o próprio fundo do mosaico aparecendo pelo vão de
            1px. Linha incompleta deixaria esse fundo à mostra como um bloco
            cinza vazio, então as sobras viram células brancas. Seis é múltiplo
            de 2 e de 3: completar até o próximo múltiplo fecha a última linha
            nos três pontos de quebra de uma vez. */}
        {marcas.map((marca) => (
          <li key={marca.slug} className="flex bg-white">
            <Link
              href={`/marcas/${marca.slug}`}
              className="flex min-h-24 w-full items-center justify-center px-4 py-6 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
            >
              {marca.logo ? (
                <Image
                  src={marca.logo.url}
                  alt={marca.logo.alt || marca.name}
                  width={160}
                  height={48}
                  className="h-9 w-auto max-w-full object-contain"
                />
              ) : (
                <span className="text-center text-base font-extrabold tracking-tight text-graf-800">
                  {marca.name}
                </span>
              )}
            </Link>
          </li>
        ))}

        {Array.from({ length: (6 - (marcas.length % 6)) % 6 }, (_, i) => (
          <li key={`vao-${i}`} aria-hidden className="min-h-24 bg-white" />
        ))}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-graf-600">
        Não achou a sua marca?{" "}
        <Link
          href="/assistencia-tecnica/solicitar"
          className="inline-flex min-h-11 items-center font-bold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          Informe marca e modelo ao abrir o chamado
        </Link>{" "}
        e a equipe avalia o atendimento.
      </p>
    </Secao>
  );
}
