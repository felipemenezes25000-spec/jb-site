import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookMarked, Info, ShieldAlert, Wrench } from "lucide-react";

import { CorpoCms } from "@/components/institucional/pagina-cms";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { artigoPublicado, relacionadosDoTema } from "@/lib/artigos";
import {
  ROTULO_TEMA,
  dataEditorial,
  fraseDeAplicabilidade,
  type TemaDoArtigo,
} from "@/lib/central-tecnica";
import { formatarData, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { artigoJsonLd, JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artigo = await artigoPublicado(slug);

  if (!artigo) {
    return { title: "Texto não encontrado", robots: { index: false, follow: false } };
  }

  return metadataDePagina({
    titulo: artigo.seoTitle || artigo.title,
    descricao: artigo.seoDescription || artigo.lead,
    caminho: `/central-tecnica/${artigo.slug}`,
    imagem: artigo.cover?.url,
  });
}

/**
 * Quem assinou e quem conferiu.
 *
 * O bloco não aparece quando não há autor. A alternativa — "por Equipe JB" —
 * seria uma assinatura que ninguém deu, e num texto sobre equipamento de
 * saúde a assinatura é parte do que o leitor está avaliando.
 */
function Assinatura({
  autor,
  revisor,
  data,
}: {
  autor: { name: string } | null;
  revisor: { name: string } | null;
  data: { data: Date; rotulo: string } | null;
}) {
  if (!autor && !data) return null;

  return (
    <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-graf-200 py-4 text-sm">
      {autor ? (
        <div>
          <dt className="text-graf-500">Escrito por</dt>
          <dd className="font-semibold text-graf-900">{autor.name}</dd>
        </div>
      ) : null}
      {revisor ? (
        <div>
          <dt className="text-graf-500">Revisão técnica</dt>
          <dd className="font-semibold text-graf-900">{revisor.name}</dd>
        </div>
      ) : null}
      {data ? (
        <div>
          <dt className="text-graf-500">{data.rotulo}</dt>
          <dd className="tabular font-semibold text-graf-900">{formatarData(data.data)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default async function ArtigoPage({ params }: Props) {
  const { slug } = await params;
  const [artigo, s] = await Promise.all([artigoPublicado(slug), getSettings()]);

  if (!artigo) notFound();

  const tema = artigo.topic as TemaDoArtigo;
  const relacionados = await relacionadosDoTema(tema, artigo.slug);
  const data = dataEditorial({
    publicadoEm: artigo.publishedAt,
    revisadoEm: artigo.reviewedAt,
  });

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Central Técnica", href: "/central-tecnica" },
    { rotulo: ROTULO_TEMA[tema], href: `/central-tecnica?tema=${tema}` },
    { rotulo: artigo.title },
  ];

  return (
    <>
      <JsonLd
        dados={[
          trilhaJsonLd(trilha),
          artigoJsonLd({
            titulo: artigo.title,
            caminho: `/central-tecnica/${artigo.slug}`,
            descricao: artigo.seoDescription || artigo.lead,
            imagem: artigo.cover?.url,
            autor: artigo.author?.name,
            revisor: artigo.reviewer?.name,
            publicadoEm: artigo.publishedAt,
            revisadoEm: artigo.reviewedAt,
            editor: s.empresa_nome,
          }),
        ]}
      />

      <Secao espaco="sm" largura="estreita">
        <Trilha itens={trilha} className="mb-6" />

        <p className="label-mono text-xs text-jb-700">{ROTULO_TEMA[tema]}</p>
        <h1 className="mt-2 text-display texto-forte">{artigo.title}</h1>
        {artigo.lead ? (
          <p className="mt-4 text-lg leading-relaxed text-graf-600">{artigo.lead}</p>
        ) : null}

        <Assinatura
          autor={artigo.author}
          revisor={artigo.reviewer}
          data={data}
        />

        {artigo.cover ? (
          <Image
            src={artigo.cover.url}
            alt={artigo.cover.alt}
            width={artigo.cover.width ?? 1200}
            height={artigo.cover.height ?? 675}
            className="mt-8 w-full rounded-xl border border-graf-200 object-cover"
          />
        ) : null}

        {/* ---------------------------------------------- aplicabilidade ---

            Vem ANTES do texto, não depois. Um limite de aplicação lido no fim
            chega tarde: quem parou na metade já saiu com a impressão de que
            aquilo vale para o equipamento dele. */}
        <p className="mt-8 flex gap-2.5 rounded-lg border border-graf-200 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600">
          <Info className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>{fraseDeAplicabilidade(artigo.appliesTo)}</span>
        </p>

        <CorpoCms html={artigo.body} className="mt-8" />

        {/* ------------------------------------------------------ limite ---

            A frase fixa que fecha todo artigo. Não é rodapé jurídico: é o
            limite real do que um texto pode fazer. Diagnóstico de equipamento
            pressurizado se faz com o aparelho na frente. */}
        <p className="mt-10 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.875rem] leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            Este texto ajuda a observar e a decidir quando chamar a assistência. Ele não
            substitui diagnóstico com o equipamento na frente, e não orienta abrir, despressurizar
            ou desativar proteção de aparelho — isso é serviço de técnico qualificado, com o
            manual do fabricante em mãos.
          </span>
        </p>

        {artigo.sources.length > 0 ? (
          <section className="mt-10" aria-labelledby="fontes">
            <h2 id="fontes" className="flex items-center gap-2 text-title texto-forte">
              <BookMarked className="size-5 text-graf-500" aria-hidden />
              Fontes
            </h2>
            <ul className="mt-4 space-y-3">
              {artigo.sources.map((fonte) => (
                <li key={fonte.title} className="text-corpo leading-relaxed text-graf-700">
                  {fonte.url ? (
                    <a
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-jb-700 underline underline-offset-2"
                    >
                      {fonte.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-graf-900">{fonte.title}</span>
                  )}
                  {fonte.note ? (
                    <span className="block text-[0.875rem] text-graf-500">{fonte.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Secao>

      {/* ----------------------------------------------------------- CTA */}
      {artigo.products.length > 0 ? (
        <Secao fundo="clara" espaco="sm">
          <TituloSecao
            tamanho="titulo"
            titulo="Equipamentos citados neste texto"
            descricao="Do catálogo da JB, com preço e disponibilidade reais."
          />
          <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="sm" como="ul" className="mt-6">
            {artigo.products.map(({ product }) => (
              <li key={product.slug}>
              <Link
                href={`/loja/${product.slug}`}
                className="flex items-center gap-4 rounded-xl border border-graf-200 bg-white p-4 transition-colors hover:border-graf-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {product.media[0] ? (
                  <Image
                    src={imagemProdutoSemFundo(product.media[0].media.url)}
                    alt=""
                    width={72}
                    height={72}
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <span className="min-w-0">
                  <span className="block text-corpo font-semibold leading-snug text-graf-950">
                    {product.name}
                  </span>
                  {/* Preço zero significa "sob orçamento" na loja inteira, e é
                      assim que ele aparece aqui — não como "R$ 0,00". */}
                  <span className="mt-1 block text-[0.875rem] text-graf-600">
                    {product.priceCents > 0 ? formatarPreco(product.priceCents) : "Sob orçamento"}
                  </span>
                </span>
              </Link>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}

      <Secao espaco="sm">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-graf-200 bg-graf-50 p-6">
          <div className="max-w-xl">
            <h2 className="text-title texto-forte">O sintoma continua?</h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              A JB abre chamado sem exigir cadastro, e você pode anexar foto ou vídeo do que está
              acontecendo.
            </p>
          </div>
          <LinkBotao href="/assistencia-tecnica/solicitar">
            <Wrench className="size-4" aria-hidden />
            Abrir chamado
          </LinkBotao>
        </div>
      </Secao>

      {relacionados.length > 0 ? (
        <Secao fundo="clara" espaco="sm">
          <TituloSecao tamanho="titulo" titulo={`Mais sobre ${ROTULO_TEMA[tema].toLowerCase()}`} />
          <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="sm" como="ul" className="mt-6">
            {relacionados.map((outro) => (
              <li key={outro.slug}>
                <Cartao className="h-full">
                <Link
                  href={`/central-tecnica/${outro.slug}`}
                  className="flex h-full flex-col gap-2 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="text-corpo font-bold leading-snug text-graf-950">
                    {outro.title}
                  </span>
                  {outro.lead ? (
                    <span className="text-[0.875rem] leading-relaxed text-graf-600">
                      {outro.lead}
                    </span>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-jb-700">
                    Ler
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
                </Cartao>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}
    </>
  );
}
