import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookMarked, Info, ShieldAlert } from "lucide-react";

import { CorpoCms } from "@/components/institucional/pagina-cms";
import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";
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
import { formatarData } from "@/lib/format";
import { artigoJsonLd, JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { connection } from "next/server";

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
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
    <dl className="jb-artigo-assinatura mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-graf-200 bg-white/80 p-4 text-sm">
      {autor ? (
        <div>
          <dt className="text-graf-500">Escrito por</dt>
          <dd className="font-extrabold text-graf-900">{autor.name}</dd>
        </div>
      ) : null}
      {revisor ? (
        <div>
          <dt className="text-graf-500">Revisão técnica</dt>
          <dd className="font-extrabold text-graf-900">{revisor.name}</dd>
        </div>
      ) : null}
      {data ? (
        <div>
          <dt className="text-graf-500">{data.rotulo}</dt>
          <dd className="tabular font-extrabold text-graf-900">{formatarData(data.data)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default async function ArtigoPage({ params }: Props) {
  await connection();
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

      <Secao espaco="md" largura="estreita" className="jb-artigo-detail">
        <Trilha itens={trilha} className="mb-6" />

        <header className="jb-artigo-head">
          <p className="label-mono inline-flex rounded-full border border-jb-100 bg-jb-50 px-3 py-1.5 text-xs font-bold text-jb-700">
            {ROTULO_TEMA[tema]}
          </p>
          <h1 className="mt-4 text-display texto-forte">{artigo.title}</h1>
          {artigo.lead ? (
            <p className="mt-5 text-lg leading-relaxed text-graf-600 sm:text-xl">{artigo.lead}</p>
          ) : null}

          <Assinatura autor={artigo.author} revisor={artigo.reviewer} data={data} />
        </header>

        {artigo.cover ? (
          <div className="jb-artigo-capa mt-8 overflow-hidden rounded-[1.5rem] border border-graf-200 bg-graf-100">
            <Image
              src={artigo.cover.url}
              alt={artigo.cover.alt}
              width={artigo.cover.width ?? 1200}
              height={artigo.cover.height ?? 675}
              className="w-full object-cover"
            />
          </div>
        ) : null}

        <p className="jb-artigo-aplicabilidade mt-8 flex gap-3 rounded-xl border border-graf-200 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600 sm:p-5">
          <Info className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>{fraseDeAplicabilidade(artigo.appliesTo)}</span>
        </p>

        <CorpoCms html={artigo.body} className="jb-artigo-corpo mt-8" />

        <p className="jb-artigo-limite mt-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[0.875rem] leading-relaxed text-amber-900 sm:p-5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            Este texto ajuda a observar e a decidir quando chamar a assistência. Ele não
            substitui diagnóstico com o equipamento na frente, e não orienta abrir, despressurizar
            ou desativar proteção de aparelho — isso é serviço de técnico qualificado, com o
            manual do fabricante em mãos.
          </span>
        </p>

        {artigo.sources.length > 0 ? (
          <section className="jb-artigo-fontes mt-10 rounded-[1.35rem] border border-graf-200 bg-white p-5 sm:p-6" aria-labelledby="fontes">
            <h2 id="fontes" className="flex items-center gap-2 text-title texto-forte">
              <span className="flex size-10 items-center justify-center rounded-xl bg-graf-50 text-graf-600 ring-1 ring-graf-200">
                <BookMarked className="size-5" aria-hidden />
              </span>
              Fontes
            </h2>
            <ul className="mt-5 space-y-4">
              {artigo.sources.map((fonte) => (
                <li key={fonte.title} className="border-t border-graf-100 pt-4 first:border-0 first:pt-0 text-corpo leading-relaxed text-graf-700">
                  {fonte.url ? (
                    <a
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-extrabold text-jb-700 underline underline-offset-2"
                    >
                      {fonte.title}
                    </a>
                  ) : (
                    <span className="font-extrabold text-graf-900">{fonte.title}</span>
                  )}
                  {fonte.note ? (
                    <span className="mt-1 block text-[0.875rem] text-graf-500">{fonte.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Secao>

      <Secao espaco="md" className="jb-content-cta">
        <div className="flex flex-col gap-6 rounded-[1.5rem] border border-graf-200 bg-graf-50 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="sobretitulo">Próximo passo</p>
            <h2 className="text-title texto-forte mt-2">O sintoma continua?</h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Chame no WhatsApp e mande foto ou vídeo do que está acontecendo. A equipe técnica
              responde e orienta o próximo passo.
            </p>
          </div>
          <ChamarWhatsapp />
        </div>
      </Secao>

      {relacionados.length > 0 ? (
        <Secao fundo="clara" espaco="md" className="jb-artigo-relacionados">
          <TituloSecao tamanho="titulo" titulo={`Mais sobre ${ROTULO_TEMA[tema].toLowerCase()}`} />
          <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="sm" como="ul" className="mt-6">
            {relacionados.map((outro) => (
              <li key={outro.slug}>
                <Cartao className="jb-artigo-card h-full overflow-hidden rounded-[1.25rem]">
                  <Link
                    href={`/central-tecnica/${outro.slug}`}
                    className="flex h-full flex-col gap-2 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <span className="text-corpo font-extrabold leading-snug text-graf-950">{outro.title}</span>
                    {outro.lead ? (
                      <span className="text-[0.875rem] leading-relaxed text-graf-600">{outro.lead}</span>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 border-t border-graf-100 pt-4 text-sm font-extrabold text-jb-700">
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
