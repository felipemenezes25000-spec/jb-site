import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tag, TriangleAlert } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { PUBLICADO, UNIDADE_VENDIDA } from "@/lib/catalogo";
import { unificarPorNome } from "@/lib/homonimos";
import { logoDaMarca } from "@/lib/marcas";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Marcas" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Marcas",
  descricao: "Marcas com produtos odontológicos publicados no catálogo da JB.",
  caminho: "/marcas",
});

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
        _count: { select: { products: { where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA } } } },
      },
    });

    const unificadas = unificarPorNome(
      linhas.map((linha) => ({
        slug: linha.slug,
        nome: linha.name,
        quantidade: linha._count.products,
        logo: linha.logo ? { url: linha.logo.url, alt: linha.logo.alt || linha.name } : null,
      })),
    );

    return unificadas.map((marca) => ({
      slug: marca.slug,
      name: marca.nome,
      logo: marca.logo,
      itens: marca.quantidade ?? 0,
    }));
  } catch {
    return null;
  }
}

function CartaoMarca({ marca }: { marca: Marca }) {
  return (
    <Link
      href={`/marcas/${marca.slug}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <span className="flex h-24 items-center justify-center px-5 sm:h-28 sm:px-6">
        {logoDaMarca(marca) ? (
          <Image
            src={logoDaMarca(marca)!.url}
            alt=""
            width={240}
            height={96}
            className="max-h-11 w-auto max-w-[78%] object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:max-h-12"
          />
        ) : (
          <span
            aria-hidden
            className="text-pretty text-center text-base font-extrabold uppercase leading-tight tracking-[0.02em] text-graf-500 sm:text-lg"
          >
            {marca.name}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-0.5 border-t border-graf-100 px-4 py-3">
        <span className="text-sm font-bold leading-snug text-graf-950">{marca.name}</span>
        <span className="text-[0.8125rem] text-graf-500">
          {marca.itens === 0
            ? "Sob consulta"
            : `${marca.itens} ${marca.itens === 1 ? "produto no catálogo" : "produtos no catálogo"}`}
        </span>
      </span>
    </Link>
  );
}

export default async function MarcasPage() {
  const marcas = await buscarMarcas();
  const comItens = marcas?.filter((marca) => marca.itens > 0).length ?? 0;

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-5" />
        <TituloSecao
          como="h1"
          sobretitulo="Catálogo"
          titulo="Marcas"
          descricao="Explore as marcas com produtos publicados na loja. Para assistência técnica, a JB também pode atender equipamentos de marcas que não aparecem nesta lista."
        />
      </Secao>

      <Secao fundo="clara" espaco="sm" rotulo="Marcas do catálogo">
        {marcas === null ? (
          <div className="rounded-xl border border-jb-200 bg-jb-50/60 px-6 py-12 text-center">
            <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-white text-jb-600 shadow-card">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <p className="text-base font-semibold text-graf-900">Não foi possível carregar as marcas</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-graf-600">
              Tente novamente em instantes ou continue pelo catálogo completo.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <LinkBotao href="/marcas" variante="secundario">
                Tentar de novo
              </LinkBotao>
              <LinkBotao href="/loja">Ver catálogo</LinkBotao>
            </div>
          </div>
        ) : marcas.length === 0 ? (
          <Vazio
            icone={Tag}
            titulo="Nenhuma marca publicada ainda"
            descricao="As marcas aparecem aqui conforme os produtos entram no catálogo. Enquanto isso, a equipe pode ajudar por orçamento."
            acao={
              <div className="flex flex-wrap justify-center gap-2.5">
                <LinkBotao href="/loja" variante="secundario">
                  Ver catálogo
                </LinkBotao>
                <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
              </div>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-graf-200 pb-3">
              <p className="text-sm text-graf-600">
                <span className="tabular font-bold text-graf-950">{marcas.length}</span>{" "}
                {marcas.length === 1 ? "marca publicada" : "marcas publicadas"}
              </p>
              {comItens > 0 && comItens < marcas.length ? (
                <p className="text-[0.8125rem] text-graf-500">
                  <span className="tabular font-bold text-graf-800">{comItens}</span>{" "}
                  {comItens === 1 ? "com produto disponível" : "com produtos disponíveis"}
                </p>
              ) : null}
            </div>

            <Grade
              como="ul"
              espaco="md"
              colunas={{ base: 2, sm: 3, lg: 4, xl: 5 }}
              className="mt-5"
            >
              {marcas.map((marca) => (
                <li key={marca.slug} className="flex">
                  <CartaoMarca marca={marca} />
                </li>
              ))}
            </Grade>
          </>
        )}
      </Secao>

      <Secao espaco="sm">
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-graf-200 pt-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-graf-950">Não encontrou a marca?</h2>
            <p className="mt-1.5 text-sm leading-6 text-graf-600">
              Para compra, informe o produto ou modelo. Para assistência técnica, descreva o equipamento e o atendimento necessário.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <LinkBotao href="/orcamento" variante="primario" tamanho="sm">
              Pedir orçamento
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="sm">
              Assistência técnica
            </LinkBotao>
          </div>
        </div>
      </Secao>
    </>
  );
}
