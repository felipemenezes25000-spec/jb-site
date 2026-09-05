import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tag, TriangleAlert } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Trilha, Vazio } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { PUBLICADO } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Marcas de equipamentos odontológicos vendidas e atendidas pela JB.",
  alternates: { canonical: "/marcas" },
};

/** Iniciais da marca — a placa do cartão quando não há logotipo enviado. */
function monograma(nome: string) {
  const palavras = nome
    .split(/\s+/)
    .map((parte) => parte.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (palavras.length === 0) return "?";
  if (palavras.length === 1) return palavras[0].slice(0, 3).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

type Marca = {
  slug: string;
  name: string;
  logo: { url: string; alt: string } | null;
  itens: number;
};

async function buscarMarcas(): Promise<Marca[] | null> {
  try {
    const linhas = await prisma.brand.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        logo: { select: { url: true, alt: true } },
        _count: { select: { products: { where: PUBLICADO } } },
      },
    });

    return linhas.map((linha) => ({
      slug: linha.slug,
      name: linha.name,
      logo: linha.logo ? { url: linha.logo.url, alt: linha.logo.alt || linha.name } : null,
      itens: linha._count.products,
    }));
  } catch {
    return null;
  }
}

export default async function MarcasPage() {
  const marcas = await buscarMarcas();
  const comItens = marcas?.filter((marca) => marca.itens > 0).length ?? 0;

  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Marcas" }]} className="mb-5" />

      <header className="max-w-2xl">
        <h1 className="text-display text-graf-950">Marcas</h1>
        <p className="texto-guia mt-4 text-graf-600">
          As marcas presentes no catálogo. A assistência técnica da JB atende equipamentos de
          outras marcas também — abra um chamado informando marca e modelo.
        </p>
      </header>

      {marcas === null ? (
        <div className="mt-10 rounded-xl border border-jb-200 bg-jb-50/60 px-6 py-14 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-jb-600 shadow-card">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <p className="text-base font-semibold text-graf-900">
            Não foi possível carregar as marcas agora
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-graf-600">
            A falha é nossa, não sua. Tente de novo em instantes — o catálogo completo
            continua disponível.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkBotao href="/marcas" variante="secundario">
              Tentar de novo
            </LinkBotao>
            <LinkBotao href="/loja">Ver o catálogo</LinkBotao>
          </div>
        </div>
      ) : marcas.length === 0 ? (
        <Vazio
          className="mt-10"
          icone={Tag}
          titulo="Nenhuma marca publicada"
          descricao="As marcas aparecem aqui conforme os produtos vão sendo cadastrados no painel."
          acao={<LinkBotao href="/loja">Ver catálogo</LinkBotao>}
        />
      ) : (
        <>
          {/* O número precisa descrever a lista que está logo abaixo. Contar
              só as marcas com produto no ar enquanto a grade mostra todas as
              publicadas fazia a frase brigar com o que se vê. */}
          <p className="mt-8 text-sm text-graf-600">
            <span className="tabular font-bold text-graf-950">{marcas.length}</span>{" "}
            {marcas.length === 1 ? "marca publicada" : "marcas publicadas"}
            {comItens > 0 && comItens < marcas.length ? (
              <>
                {" · "}
                <span className="tabular font-bold text-graf-950">{comItens}</span>{" "}
                {comItens === 1
                  ? "com equipamento no catálogo"
                  : "com equipamentos no catálogo"}
              </>
            ) : null}
          </p>

          <Grade
            como="ul"
            espaco="md"
            colunas={{ base: 2, sm: 3, lg: 4, xl: 6 }}
            className="mt-5"
          >
            {marcas.map((marca) => (
              <li key={marca.slug} className="flex">
                <Link
                  href={`/marcas/${marca.slug}`}
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="flex h-24 items-center justify-center bg-graf-50 px-5">
                    {marca.logo ? (
                      <Image
                        src={marca.logo.url}
                        alt=""
                        width={160}
                        height={64}
                        className="max-h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      // Sem logotipo, a placa recebe o monograma. Repetir o nome
                      // aqui e na linha de baixo fazia o cartão dizer a mesma
                      // coisa duas vezes, com dois pesos diferentes.
                      <span
                        aria-hidden
                        className="text-2xl font-extrabold tracking-tight text-graf-500"
                      >
                        {monograma(marca.name)}
                      </span>
                    )}
                  </span>

                  <span className="flex flex-1 flex-col gap-1 border-t border-graf-100 p-4">
                    <span className="text-sm font-bold text-graf-950">{marca.name}</span>
                    <span className="text-xs text-graf-500">
                      {marca.itens === 0
                        ? "Sob consulta"
                        : `${marca.itens} ${marca.itens === 1 ? "item" : "itens"}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </Grade>
        </>
      )}

      <div className="mt-14 rounded-xl border border-graf-200 bg-surface-muted px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-title text-graf-950">Sua marca não está na lista?</h2>
            <p className="mt-2 text-base leading-relaxed text-graf-600">
              Diga qual equipamento você procura, com marca e modelo, que a equipe responde com
              preço e prazo.
            </p>
          </div>
          <LinkBotao href="/orcamento" tamanho="lg" className="shrink-0">
            Pedir orçamento
            <ArrowRight className="size-4" aria-hidden />
          </LinkBotao>
        </div>
      </div>
    </div>
  );
}
