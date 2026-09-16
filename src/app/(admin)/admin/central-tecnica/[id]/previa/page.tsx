import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, ShieldAlert } from "lucide-react";

import { CorpoCms } from "@/components/institucional/pagina-cms";
import { Aviso } from "@/components/ui/aviso";
import {
  EXPLICACAO_ESTADO_ARTIGO,
  ROTULO_ESTADO_ARTIGO,
  ROTULO_TEMA,
  dataEditorial,
  fraseDeAplicabilidade,
  type EstadoDoArtigo,
  type TemaDoArtigo,
} from "@/lib/central-tecnica";
import { formatarData } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

/* ============================================================================
   Prévia de um artigo

   Rota do painel, não do site. É essa escolha que protege o rascunho: a prévia
   fica atrás de `exigirArea`, o mesmo controle de qualquer tela do backoffice,
   e não atrás de um token na URL que alguém encaminharia por WhatsApp sem
   pensar duas vezes.

   `noindex` mesmo assim, por cinto e suspensório. Uma rota de /admin não
   deveria ser rastreada nunca, e a que renderiza texto sem revisão menos ainda.
   ============================================================================ */

export const metadata: Metadata = {
  title: "Prévia · Central Técnica",
  robots: { index: false, follow: false },
};

export default async function PaginaPrevia({ params }: { params: Promise<{ id: string }> }) {
  await exigirArea("central");
  const { id } = await params;

  const artigo = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      lead: true,
      body: true,
      topic: true,
      status: true,
      appliesTo: true,
      publishedAt: true,
      reviewedAt: true,
      cover: { select: { url: true, alt: true, width: true, height: true } },
      author: { select: { name: true } },
      reviewer: { select: { name: true } },
      sources: { orderBy: { order: "asc" }, select: { title: true, url: true } },
    },
  });

  if (!artigo) notFound();

  const estado = artigo.status as EstadoDoArtigo;
  const tema = artigo.topic as TemaDoArtigo;
  const data = dataEditorial({
    publicadoEm: artigo.publishedAt,
    revisadoEm: artigo.reviewedAt,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/admin/central-tecnica/${artigo.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700 underline underline-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar ao artigo
        </Link>
      </div>

      <Aviso
        tom={estado === "publicado" ? "info" : "atencao"}
        titulo={`Prévia — ${ROTULO_ESTADO_ARTIGO[estado]}`}
      >
        {EXPLICACAO_ESTADO_ARTIGO[estado]} Esta tela mostra como o texto vai aparecer no site.
        {estado !== "publicado"
          ? " Ninguém de fora do painel consegue abrir este endereço."
          : ""}
      </Aviso>

      <article className="mx-auto max-w-3xl rounded-xl border border-graf-200 bg-white p-6 sm:p-10">
        <p className="label-mono text-xs text-jb-700">{ROTULO_TEMA[tema]}</p>
        <h1 className="mt-2 text-display texto-forte">{artigo.title}</h1>
        {artigo.lead ? (
          <p className="mt-4 text-lg leading-relaxed text-graf-600">{artigo.lead}</p>
        ) : null}

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-graf-200 py-4 text-sm">
          <div>
            <dt className="text-graf-500">Escrito por</dt>
            <dd className="font-semibold text-graf-900">
              {artigo.author?.name ?? "— a definir —"}
            </dd>
          </div>
          <div>
            <dt className="text-graf-500">Revisão técnica</dt>
            <dd className="font-semibold text-graf-900">
              {artigo.reviewer?.name ?? "— a definir —"}
            </dd>
          </div>
          <div>
            <dt className="text-graf-500">{data?.rotulo ?? "Data"}</dt>
            <dd className="tabular font-semibold text-graf-900">
              {data ? formatarData(data.data) : "— sem data real —"}
            </dd>
          </div>
        </dl>

        {artigo.cover ? (
          <Image
            src={artigo.cover.url}
            alt={artigo.cover.alt}
            width={artigo.cover.width ?? 1200}
            height={artigo.cover.height ?? 675}
            className="mt-8 w-full rounded-xl border border-graf-200 object-cover"
          />
        ) : null}

        <p className="mt-8 flex gap-2.5 rounded-lg border border-graf-200 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600">
          <Info className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>{fraseDeAplicabilidade(artigo.appliesTo)}</span>
        </p>

        <CorpoCms html={artigo.body} className="mt-8" />

        <p className="mt-10 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[0.875rem] leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            Este texto ajuda a observar e a decidir quando chamar a assistência. Ele não
            substitui diagnóstico com o equipamento na frente, e não orienta abrir,
            despressurizar ou desativar proteção de aparelho.
          </span>
        </p>

        {artigo.sources.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-title texto-forte">Fontes</h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-graf-700">
              {artigo.sources.map((fonte) => (
                <li key={fonte.title}>{fonte.title}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
