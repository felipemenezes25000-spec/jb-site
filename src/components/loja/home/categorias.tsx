import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { TituloSecao } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { IconeCategoria } from "@/components/ui/icone";
import { Secao } from "@/components/ui/secao";
import { plural } from "@/lib/format";
import { textoDeHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Categorias do catálogo

   Cartão de catálogo, com a fotografia mandando na composição — não o
   quadradinho com ícone que faria a home parecer painel administrativo.

   Categoria sem produto publicado não entra: o filtro está no `where`, e a
   contagem exibida é a mesma que o cliente vai encontrar na listagem.

   A foto sai, nesta ordem: imagem da categoria (foto de ambiente, recortada),
   foto do equipamento em destaque dela (recorte em fundo claro) ou, na falta
   das duas, o ícone da categoria numa placa da marca.
   ============================================================================ */

const PUBLICADO = { status: "active" } as const;

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
      description: true,
      icon: true,
      image: { select: { url: true, alt: true } },
      _count: { select: { products: { where: PUBLICADO } } },
      // uma leitura só, aninhada: o Prisma resolve por relação, não por linha
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
    <Secao fundo="branco" espaco="lg">
      <TituloSecao
        sobretitulo="Catálogo"
        titulo="O que a JB vende e atende"
        descricao="As frentes de equipamento em que a equipe é especializada — para comprar e para dar assistência."
        acao={
          <Link
            href="/loja"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-jb-700 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Ver catálogo completo
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        }
        className="mb-10"
      />

      <Grade colunas={colunasParaTotal(categorias.length)} espaco="md" como="ul">
        {categorias.map((categoria) => {
          const fotoProduto = categoria.products[0]?.media[0];
          const total = categoria._count.products;
          const resumo = textoDeHtml(categoria.description);

          return (
            <li key={categoria.slug} className="flex">
              <Link
                href={`/categoria/${categoria.slug}`}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-b from-graf-50 to-white">
                  {categoria.image ? (
                    <Image
                      src={categoria.image.url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                  ) : fotoProduto ? (
                    <Image
                      src={fotoProduto.media.url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                      className="object-contain p-8 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center text-jb-600/70"
                    >
                      <IconeCategoria nome={categoria.icon} className="size-14" />
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-title text-graf-950 group-hover:text-jb-700">
                      {categoria.name}
                    </h3>
                    <span className="mt-1 shrink-0 rounded-full bg-graf-100 px-2.5 py-1 text-xs font-semibold text-graf-600">
                      {plural(total, "item", "itens")}
                    </span>
                  </div>

                  {resumo ? (
                    <p className="mt-3 line-2 text-[0.9375rem] leading-relaxed text-graf-500">
                      {resumo}
                    </p>
                  ) : null}

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
                    Ver equipamentos
                    <ArrowRight className="size-4 shrink-0" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </Grade>
    </Secao>
  );
}
