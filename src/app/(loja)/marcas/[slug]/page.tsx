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
import { logoDaMarca } from "@/lib/marcas";
import { textoDeHtml } from "@/lib/html";
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
      `Equipamentos ${marca.name} vendidos e atendidos pela JB.`,
    caminho: `/marcas/${marca.slug}`,
  });
}

/**
 * A parede de marcas que fecha a página.
 *
 * Só entram marcas com arte e com equipamento publicado: uma faixa de
 * logotipos precisa ser feita de logotipos, e um monograma solto no meio de
 * seis marcas reais denuncia o cadastro pela metade. Sem material suficiente,
 * a faixa não aparece.
 *
 * O filtro por arte é feito depois da consulta, não no `where`. Filtrar por
 * `logoId: { not: null }` no banco descartava toda marca cujo logotipo vem do
 * arquivo local — que hoje são todas elas —, e a faixa nunca aparecia.
 */
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

  /* Mesma regra da categoria: marca despublicada por unificação entrega o
     endereço antigo à homônima que ficou publicada, em vez de um 404 para
     quem tinha o link salvo. Ver `scripts/unificar-duplicatas.ts`. */
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
    { rotulo: "Marcas", href: "/marcas" },
    { rotulo: marca.name },
  ];

  return (
    <>
      <JsonLd dados={trilhaJsonLd(trilha)} />

      <Vitrine
        sobretitulo="Marca atendida"
        titulo={marca.name}
        descricao={
          textoDeHtml(marca.description) ||
          `Os equipamentos ${marca.name} que estão no catálogo da JB. A assistência técnica depois da compra é da nossa equipe.`
        }
        trilha={trilha}
        caminho={`/marcas/${marca.slug}`}
        parametros={parametros}
        filtrosFixos={{ marca: marca.slug }}
        // o nome da marca já é o título da página: a logo entra como decoração
        imagem={logoDaMarca(marca) ? { url: logoDaMarca(marca)!.url, alt: "" } : undefined}
        travarMarca
      />

      {vizinhas.length >= 3 ? (
        <Secao fundo="clara" espaco="md">
          <TituloSecao
            tamanho="titulo"
            titulo="Outras marcas no catálogo"
            acao={
              <LinkBotao href="/marcas" variante="secundario" tamanho="sm">
                Ver todas as marcas
              </LinkBotao>
            }
          />

          <Grade como="ul" espaco="md" colunas={{ base: 2, sm: 3, lg: 6 }} className="mt-8">
            {vizinhas.map((vizinha) => (
              <li key={vizinha.slug} className="flex">
                <Link
                  href={`/marcas/${vizinha.slug}`}
                  className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-graf-200 bg-white px-4 py-6 transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <Image
                    src={vizinha.logo}
                    alt=""
                    width={200}
                    height={80}
                    className="h-10 w-auto max-w-full object-contain"
                  />
                  <span className="text-center text-[0.8125rem] font-semibold text-graf-700">
                    {vizinha.name}
                  </span>
                </Link>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}
    </>
  );
}
