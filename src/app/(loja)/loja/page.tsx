import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Headphones,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

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
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
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
            select: {
              products: { where: { status: "active", condition: "novo" } },
            },
          },
        },
      }),
      prisma.product.count({ where: { status: "active", condition: "novo" } }),
      prisma.product.count({ where: { status: "active", condition: "seminovo" } }),
    ]);

  /* A coleção principal é, por decisão de UX, só de equipamentos novos.
   * Um `?condicao=seminovo` antigo não pode furar essa separação nem aparecer
   * como filtro ativo: Seminovo JB tem coleção própria em /seminovos. */
  const parametros = Object.fromEntries(
    Object.entries(parametrosRecebidos).filter(([chave]) => chave !== "condicao"),
  ) as ParametrosVitrine;

  const foto = produtoDestaque?.media[0];
  const categoriasNovas = categorias.filter((categoria) => categoria._count.products > 0).slice(0, 6);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <div className="catalogo-premium">
        <div className="container-jb pt-6 sm:pt-8 lg:pt-10">
          <Trilha itens={TRILHA} className="mb-4 sm:mb-5" />

          <section className="relative isolate overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle at 78% 32%, rgb(224 20 27 / 0.08), transparent 30%), linear-gradient(115deg, #ffffff 0%, #ffffff 55%, #fafafa 100%)",
              }}
            />

            <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
              <div className="flex flex-col justify-center px-6 py-9 sm:px-9 sm:py-11 lg:px-11 lg:py-12 xl:px-12">
                <p className="sobretitulo mb-3">Catálogo</p>
                <h1 className="max-w-3xl text-display text-graf-950">Equipamentos odontológicos</h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-graf-600 sm:text-lg">
                  Tecnologia, segurança e desempenho para a rotina da clínica. Aqui você encontra
                  equipamentos novos em uma coleção própria — sem misturar com seminovos.
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-3 sm:gap-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                      <ShieldCheck className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-graf-900">Ficha clara</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-graf-500">
                        Modelo, voltagem, medidas e garantia quando informada.
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                      <Truck className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-graf-900">Compra orientada</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-graf-500">
                        Condições de entrega e instalação aparecem quando declaradas.
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                      <Headphones className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-graf-900">Suporte JB</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-graf-500">
                        A assistência continua disponível depois da entrega.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative min-h-72 overflow-hidden border-t border-graf-100 bg-gradient-to-br from-graf-50 via-white to-jb-50/40 lg:min-h-full lg:border-l lg:border-t-0">
                {foto ? (
                  <>
                    <div className="absolute inset-8 rounded-full bg-white/80 blur-3xl" aria-hidden />
                    <Image
                      src={foto.media.url}
                      alt={foto.alt || produtoDestaque?.name || "Equipamento odontológico"}
                      fill
                      priority
                      quality={90}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="object-contain p-5 sm:p-7 lg:p-8 xl:p-10"
                    />
                    <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-raised backdrop-blur sm:inset-x-7 sm:bottom-7">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-jb-600">
                        Destaque da coleção
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-graf-950">
                        {produtoDestaque?.name}
                      </p>
                      {produtoDestaque?.brand?.name || produtoDestaque?.model ? (
                        <p className="mt-0.5 truncate text-xs text-graf-500">
                          {[produtoDestaque?.brand?.name, produtoDestaque?.model]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="flex size-full min-h-72 flex-col items-center justify-center gap-3 px-8 text-center text-graf-500">
                    <span className="flex size-14 items-center justify-center rounded-2xl border border-graf-200 bg-white shadow-card">
                      <PackageCheck className="size-7 text-jb-500" aria-hidden />
                    </span>
                    <p className="max-w-xs text-sm leading-relaxed">
                      A vitrine usa somente imagens reais cadastradas nos equipamentos publicados.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {categoriasNovas.length > 0 ? (
            <nav aria-label="Categorias de equipamentos novos" className="mt-6 sm:mt-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                  Categorias em destaque
                </p>
                <Link
                  href="/categorias"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  Ver todas
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>

              <ul className="scrollbar-none -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {categoriasNovas.map((categoria) => (
                  <li key={categoria.slug} className="shrink-0">
                    <Link
                      href={`/categoria/${categoria.slug}?condicao=novo`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-graf-200 bg-white px-4 text-sm font-semibold text-graf-800 shadow-card transition-[border-color,background-color,color,box-shadow] hover:border-graf-300 hover:bg-graf-50 hover:text-jb-700 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {categoria.name}
                      <span className="tabular text-xs font-semibold text-graf-500">
                        {categoria._count.products}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <nav
            aria-label="Escolher coleção por condição"
            className="mt-7 grid overflow-hidden rounded-2xl border border-graf-200 bg-graf-50 p-1.5 shadow-card sm:grid-cols-2"
          >
            <Link
              href="/loja"
              aria-current="page"
              className="group flex min-h-[4.75rem] items-center gap-3 rounded-xl bg-jb-500 px-4 py-3 text-white shadow-raised transition-transform active:scale-[0.995] sm:px-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
                <PackageCheck className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-extrabold sm:text-base">
                  Equipamentos novos
                  <span className="tabular rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">
                    {totalNovos}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-white/80 sm:text-[0.8125rem]">
                  Linha atual, ficha completa e compra em coleção própria.
                </span>
              </span>
            </Link>

            <Link
              href="/seminovos"
              className="group flex min-h-[4.75rem] items-center gap-3 rounded-xl px-4 py-3 text-graf-800 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-jb-500 sm:px-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-graf-200 bg-white text-graf-600 transition-colors group-hover:border-jb-200 group-hover:text-jb-600">
                <RefreshCcw className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-extrabold text-graf-950 sm:text-base">
                  Seminovo JB
                  <span className="tabular rounded-full bg-graf-200 px-2 py-0.5 text-xs font-bold text-graf-700">
                    {totalSeminovos}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-graf-500 sm:text-[0.8125rem]">
                  Unidades revisadas ficam separadas dos equipamentos novos.
                </span>
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
            margin-top: 1.5rem;
          }

          .catalogo-premium .catalogo-lista article {
            border-radius: 1rem;
            box-shadow: var(--shadow-card);
          }

          .catalogo-premium .catalogo-lista article > div:first-child {
            background: linear-gradient(145deg, #ffffff 0%, #fafafa 62%, #f4f4f5 100%);
          }

          .catalogo-premium .catalogo-lista article img {
            padding: 0.35rem !important;
          }

          @media (min-width: 1024px) {
            .catalogo-premium .catalogo-lista > div > div {
              column-gap: 1.5rem;
              grid-template-columns: 17.5rem minmax(0, 1fr);
            }

            .catalogo-premium .catalogo-lista aside > div {
              border: 1px solid var(--color-graf-200);
              border-radius: 1rem;
              background: #ffffff;
              padding: 1.25rem;
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
