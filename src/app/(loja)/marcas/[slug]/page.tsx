import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { LinkBotao } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { PUBLICADO } from "@/lib/catalogo";
import { chaveDeNome } from "@/lib/homonimos";
import { textoDeHtml } from "@/lib/html";
import { logoDaMarca } from "@/lib/marcas";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ParametrosVitrine>;
};

type MarcaVizinha = { slug: string; name: string; logo: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const marca = await prisma.brand.findUnique({ where: { slug } });
  if (!marca) return {};
  return metadataDePagina({
    titulo: marca.name,
    descricao:
      textoDeHtml(marca.description) ||
      `Produtos ${marca.name} disponíveis no catálogo da JB.`,
    caminho: `/marcas/${marca.slug}`,
  });
}

async function outrasMarcas(slugAtual: string): Promise<MarcaVizinha[]> {
  try {
    const linhas = await prisma.brand.findMany({
      where: {
        published: true,
        slug: { not: slugAtual },
        products: { some: PUBLICADO },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 12,
      select: { slug: true, name: true, logo: { select: { url: true } } },
    });

    return linhas.flatMap((linha) => {
      const arte = logoDaMarca(linha);
      return arte ? [{ slug: linha.slug, name: linha.name, logo: arte.url }] : [];
    });
  } catch {
    return [];
  }
}

export default async function MarcaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const marca = await prisma.brand.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      published: true,
      logo: { select: { url: true, alt: true } },
    },
  });
  if (!marca) notFound();

  if (!marca.published) {
    const publicadas = await prisma.brand.findMany({
      where: { published: true },
      select: { slug: true, name: true },
    });
    const herdeira = publicadas.find(
      (outra) => chaveDeNome(outra.name) === chaveDeNome(marca.name),
    );
    if (herdeira) permanentRedirect(`/marcas/${herdeira.slug}`);
    notFound();
  }

  const [parametros, vizinhas] = await Promise.all([searchParams, outrasMarcas(marca.slug)]);

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Loja", href: "/loja" },
    { rotulo: "Marcas", href: "/marcas" },
    { rotulo: marca.name },
  ];

  return (
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(trilha)} />

      <Vitrine
        sobretitulo="Marca"
        titulo={marca.name}
        descricao={
          textoDeHtml(marca.description) ||
          `Produtos ${marca.name} publicados no catálogo da JB. Para suporte técnico de equipamentos da marca, a assistência é atendida separadamente.`
        }
        trilha={trilha}
        caminho={`/marcas/${marca.slug}`}
        parametros={parametros}
        filtrosFixos={{ marca: marca.slug }}
        imagem={logoDaMarca(marca) ? { url: logoDaMarca(marca)!.url, alt: "" } : undefined}
        travarMarca
      />

      {vizinhas.length >= 3 ? (
        <Secao fundo="clara" espaco="sm">
          <TituloSecao
            tamanho="titulo"
            titulo="Outras marcas"
            descricao="Continue navegando pelas marcas com produtos publicados no catálogo."
            acao={
              <LinkBotao href="/marcas" variante="secundario" tamanho="sm">
                Ver todas
              </LinkBotao>
            }
          />

          <Grade como="ul" espaco="md" colunas={{ base: 2, sm: 3, lg: 6 }} className="mt-6">
            {vizinhas.map((vizinha) => (
              <li key={vizinha.slug} className="flex">
                <Link
                  href={`/marcas/${vizinha.slug}`}
                  className="group flex h-full w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-graf-200 bg-white px-4 py-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <Image
                    src={vizinha.logo}
                    alt=""
                    width={200}
                    height={80}
                    className="h-9 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="text-center text-apoio font-semibold text-graf-700">
                    {vizinha.name}
                  </span>
                </Link>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}
    </div>
  );
}
