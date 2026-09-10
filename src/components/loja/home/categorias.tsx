import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { stripTags } from "@/lib/html";
import { plural } from "@/lib/format";
import { unificarPorNome } from "@/lib/homonimos";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;

async function carregar() {
  return prisma.category.findMany({
    where: { published: true, parentId: null, products: { some: PUBLICADO } },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 8,
    select: {
      slug: true,
      name: true,
      description: true,
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
  if (categoria.image) {
    return { url: categoria.image.url, alt: categoria.image.alt ?? categoria.name };
  }

  const fotoProduto = categoria.products[0]?.media[0];
  if (!fotoProduto) return null;

  return {
    url: fotoProduto.media.url,
    alt: fotoProduto.alt ?? fotoProduto.media.alt ?? categoria.name,
  };
}

function itensDaCategoria(descricao: string): string[] {
  const itens = descricao.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (!itens) return [];

  return itens
    .map((item) => stripTags(item).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function detalheCategoria(categoria: CategoriaHome) {
  const itens = itensDaCategoria(categoria.description ?? "");
  if (itens.length) return itens.slice(0, 2).join(" · ");

  return plural(categoria._count.products, "produto disponível", "produtos disponíveis");
}

export async function SecaoCategorias() {
  const linhas = await carregar();
  const categorias = unificarPorNome(
    linhas.map((linha) => ({ ...linha, nome: linha.name, quantidade: linha._count.products })),
  ).slice(0, 4);

  if (categorias.length === 0) return null;

  return (
    <section className="border-b border-graf-200 bg-white py-12 lg:py-16">
      <div className="container-jb max-w-[100rem]">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graf-200 pb-5">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Categorias
            </p>
            <h2 className="mt-2 text-[clamp(1.7rem,1.35rem+1.4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-graf-950">
              Encontre pelo que a clínica precisa
            </h2>
            <p className="mt-2 text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
              Entre por categoria para comparar produtos semelhantes com menos ruído.
            </p>
          </div>

          <Link
            href="/loja"
            className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
          >
            Ver todas as categorias
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categorias.map((categoria) => {
            const foto = fotoCategoria(categoria);
            return (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span
                    data-palco-imagem-produto
                    className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-graf-100 bg-graf-50/60"
                  >
                    {foto ? (
                      <Image
                        data-imagem-produto
                        src={imagemProdutoSemFundo(foto.url)}
                        alt={foto.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-contain p-[8%] transition-transform duration-300 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <IconeCategoria nome={categoria.icon} className="size-12 text-jb-600" />
                    )}
                  </span>

                  <span className="flex flex-1 flex-col p-4">
                    <strong className="text-base font-bold text-graf-950 transition-colors group-hover:text-jb-700">
                      {categoria.name}
                    </strong>
                    <small className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-5 text-graf-500">
                      {detalheCategoria(categoria)}
                    </small>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-graf-700 group-hover:text-jb-700">
                      Explorar
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
