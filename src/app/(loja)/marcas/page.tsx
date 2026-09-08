import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tag, TriangleAlert } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { PUBLICADO } from "@/lib/catalogo";
import { logoDaMarca } from "@/lib/marcas";
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

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Marcas" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Marcas",
  descricao: "Marcas de equipamentos odontológicos vendidas e atendidas pela JB.",
  caminho: "/marcas",
});

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

/**
 * Painel de marca.
 *
 * A placa branca ocupa a maior parte do cartão e o logotipo é o que se vê
 * primeiro — uma parede de marcas, não uma lista de links. Sem logotipo
 * enviado entra o monograma: repetir o nome na placa e na linha de baixo
 * fazia o cartão dizer a mesma coisa duas vezes, com dois pesos diferentes.
 */
function CartaoMarca({ marca }: { marca: Marca }) {
  return (
    <Link
      href={`/marcas/${marca.slug}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <span className="flex h-28 items-center justify-center px-5 sm:h-32 sm:px-7">
        {logoDaMarca(marca) ? (
          <Image
            src={logoDaMarca(marca)!.url}
            alt=""
            width={240}
            height={96}
            className="max-h-14 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:max-h-16"
          />
        ) : (
          <span
            aria-hidden
            className="text-2xl font-extrabold tracking-tight text-graf-500 sm:text-3xl"
          >
            {monograma(marca.name)}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-0.5 border-t border-graf-100 px-4 py-3.5">
        <span className="text-[0.9375rem] font-bold leading-snug text-graf-950">
          {marca.name}
        </span>
        <span className="text-[0.8125rem] text-graf-500">
          {marca.itens === 0
            ? "Sob consulta"
            : `${marca.itens} ${marca.itens === 1 ? "item no catálogo" : "itens no catálogo"}`}
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
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Catálogo"
          titulo="Marcas"
          descricao="As marcas que estão no catálogo da JB agora. A assistência técnica atende equipamento de marca que não aparece nesta lista — basta informar marca e modelo ao pedir o atendimento."
        />
      </Secao>

      <Secao fundo="clara" espaco="md" rotulo="Marcas do catálogo">
        {marcas === null ? (
          <div className="rounded-xl border border-jb-200 bg-jb-50/60 px-6 py-14 text-center">
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
            icone={Tag}
            titulo="Nenhuma marca publicada ainda"
            descricao="As marcas aparecem aqui conforme os equipamentos vão sendo cadastrados. Enquanto isso, diga o que a clínica procura e a equipe responde com preço e prazo."
            acao={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkBotao href="/loja" variante="secundario">
                  Ver o catálogo
                </LinkBotao>
                <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
              </div>
            }
          />
        ) : (
          <>
            {/* O número precisa descrever a parede que está logo abaixo. Contar
                só as marcas com produto no ar enquanto a grade mostra todas as
                publicadas fazia a frase brigar com o que se vê. */}
            <p className="text-[0.8125rem] text-graf-500">
              <span className="tabular font-bold text-graf-950">{marcas.length}</span>{" "}
              {marcas.length === 1 ? "marca" : "marcas"}
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
              colunas={{ base: 2, sm: 3, lg: 4, xl: 5 }}
              className="mt-6"
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

      <Secao fundo="afundada" espaco="md">
        <TituloSecao
          tamanho="titulo"
          sobretitulo="Fora da lista"
          titulo="Procura equipamento de uma marca que não está aqui?"
          descricao="A JB vende além do que está publicado e atende equipamento de outras marcas na bancada. Diga a marca, o modelo e o que a clínica precisa."
          acao={
            <div className="flex flex-wrap gap-3">
              <LinkBotao href="/orcamento" variante="primario">
                Pedir orçamento
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario">
                Pedir atendimento técnico
              </LinkBotao>
            </div>
          }
        />
      </Secao>
    </>
  );
}
