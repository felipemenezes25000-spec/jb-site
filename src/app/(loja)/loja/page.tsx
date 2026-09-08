import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Headphones, PackageCheck, RefreshCcw, ShieldCheck } from "lucide-react";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { Trilha } from "@/components/ui/data";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 */
export const instant = false;

const CAMINHO = "/loja";
const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos odontológicos novos",
  descricao:
    "Equipamentos odontológicos novos, com ficha técnica completa, garantia informada e suporte da JB antes e depois da compra.",
  caminho: CAMINHO,
});

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametrosRecebidos, produtoDestaque, categorias, totalNovos, totalSeminovos] =
    await Promise.all([
      searchParams,
      prisma.product.findFirst({
        where: { status: "active", condition: "novo", media: { some: {} } },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
          name: true,
          model: true,
          brand: { select: { name: true } },
          media: {
            take: 1,
            orderBy: { order: "asc" },
            select: { alt: true, media: { select: { url: true } } },
          },
        },
      }),
      prisma.category.findMany({
        where: { published: true, parentId: null },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          _count: {
            select: { products: { where: { status: "active", condition: "novo" } } },
          },
        },
      }),
      prisma.product.count({ where: { status: "active", condition: "novo" } }),
      prisma.product.count({ where: { status: "active", condition: "seminovo" } }),
    ]);

  /* /loja é a coleção de novos. Mesmo um endereço antigo com
   * `?condicao=seminovo` não mistura as duas jornadas. */
  const parametros = Object.fromEntries(
    Object.entries(parametrosRecebidos).filter(([chave]) => chave !== "condicao"),
  ) as ParametrosVitrine;

  const foto = produtoDestaque?.media[0];
  const categoriasNovas = categorias
    .filter((categoria) => categoria._count.products > 0)
    .slice(0, 6);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <div className="catalogo-premium">
        <div className="container-jb pt-5 sm:pt-7 lg:pt-8">
          <Trilha itens={TRILHA} className="mb-3 sm:mb-4" />

          {/* Cabeçalho curto: a página precisa colocar a pessoa no catálogo,
              não fazê-la atravessar uma landing page antes de ver produto. */}
          <section className="relative isolate overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle at 82% 35%, rgb(224 20 27 / 0.07), transparent 28%), linear-gradient(115deg, #ffffff 0%, #ffffff 62%, #fafafa 100%)",
              }}
            />

            <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem]">
              <div className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9 xl:px-11">
                <p className="sobretitulo mb-2.5">Catálogo</p>
                <h1 className="max-w-3xl text-display text-graf-950">Equipamentos odontológicos</h1>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-graf-600 sm:text-[1.0625rem]">
                  Equipamentos novos para a rotina da clínica, com ficha técnica clara e suporte JB
                  antes e depois da compra.
                </p>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-graf-100 pt-4 text-sm font-semibold text-graf-700">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4 text-jb-600" aria-hidden />
                    Ficha técnica objetiva
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <PackageCheck className="size-4 text-jb-600" aria-hidden />
                    Coleção só de novos
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Headphones className="size-4 text-jb-600" aria-hidden />
                    Suporte especializado
                  </span>
                </div>
              </div>

              {/* A foto ajuda a vender, mas não pode dominar a dobra. No mobile
                  ela sai por completo: produto real começa logo abaixo. */}
              <div className="relative hidden min-h-[15.5rem] overflow-hidden border-l border-graf-100 bg-gradient-to-br from-white via-graf-50 to-jb-50/35 lg:block">
                {foto ? (
                  <>
                    <Image
                      src={foto.media.url}
                      alt={foto.alt || produtoDestaque?.name || "Equipamento odontológico"}
                      fill
                      preload
                      unoptimized={foto.media.url.startsWith("/")}
                      sizes="25rem"
                      className="object-contain p-5 xl:p-6"
                    />
                    <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-card backdrop-blur">
                      <div className="min-w-0">
                        <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-jb-600">
                          Em destaque
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold text-graf-950">
                          {produtoDestaque?.name}
                        </p>
                      </div>
                      {produtoDestaque?.brand?.name ? (
                        <span className="shrink-0 text-xs font-semibold text-graf-500">
                          {produtoDestaque.brand.name}
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center text-graf-400">
                    <PackageCheck className="size-12" aria-hidden />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Categorias: uma linha de descoberta, não uma segunda seção hero. */}
          {categoriasNovas.length > 0 ? (
            <nav aria-label="Categorias de equipamentos novos" className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                  Categorias
                </p>
                <Link
                  href="/marcas"
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-bold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  Ver marcas
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>

              <ul className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {categoriasNovas.map((categoria) => (
                  <li key={categoria.slug} className="shrink-0">
                    <Link
                      href={`/categoria/${categoria.slug}?condicao=novo`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 text-[0.8125rem] font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {categoria.name}
                      <span className="tabular text-xs font-medium text-graf-500">
                        {categoria._count.products}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* Novo e seminovo são coleções diferentes. O controle é compacto e
              funciona como navegação — não como dois banners concorrendo. */}
          <nav
            aria-label="Escolher coleção por condição"
            className="mt-5 grid w-full max-w-2xl grid-cols-2 rounded-xl border border-graf-200 bg-graf-50 p-1"
          >
            <Link
              href="/loja"
              aria-current="page"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-jb-500 px-3 text-sm font-bold text-white shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <PackageCheck className="size-4" aria-hidden />
              Novos
              <span className="tabular rounded-full bg-white/15 px-1.5 py-0.5 text-[0.6875rem]">
                {totalNovos}
              </span>
            </Link>
            <Link
              href="/seminovos"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-graf-700 transition-colors hover:bg-white hover:text-graf-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <RefreshCcw className="size-4" aria-hidden />
              Seminovo JB
              <span className="tabular rounded-full bg-graf-200 px-1.5 py-0.5 text-[0.6875rem] text-graf-600">
                {totalSeminovos}
              </span>
            </Link>
          </nav>
        </div>

        <div className="catalogo-lista">
          <Vitrine
            titulo="Equipamentos novos"
            trilha={TRILHA}
            caminho={CAMINHO}
            parametros={parametros}
            filtrosFixos={{ condicao: "novo" }}
            travarCondicao
          />
        </div>

        <style>{`
          .catalogo-premium .catalogo-lista > div {
            padding-top: 0 !important;
          }

          .catalogo-premium .catalogo-lista > div > nav:first-child,
          .catalogo-premium .catalogo-lista > div > header {
            display: none;
          }

          .catalogo-premium .catalogo-lista > div > div {
            margin-top: 1.25rem;
          }

          .catalogo-premium .catalogo-lista article {
            border-radius: 1rem;
            box-shadow: var(--shadow-card);
          }

          .catalogo-premium .catalogo-lista article > div:first-child {
            background: linear-gradient(145deg, #ffffff 0%, #fafafa 68%, #f4f4f5 100%);
          }

          .catalogo-premium .catalogo-lista article img {
            padding: 0.125rem !important;
          }

          @media (min-width: 1024px) {
            .catalogo-premium .catalogo-lista > div > div {
              column-gap: 1.25rem;
              grid-template-columns: 16.5rem minmax(0, 1fr);
            }

            .catalogo-premium .catalogo-lista aside > div {
              border: 1px solid var(--color-graf-200);
              border-radius: 1rem;
              background: #ffffff;
              padding: 1.1rem;
              box-shadow: var(--shadow-card);
            }
          }

          @media (min-width: 1536px) {
            .catalogo-premium .catalogo-lista ul:has(> li > article) {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
