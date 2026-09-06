import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, CheckCircle2, Eye, FileEdit, Send, Trash2, Upload } from "lucide-react";

import {
  adicionarFonte,
  excluirArtigo,
  mudarEstadoDoArtigo,
  publicarArtigo,
  registrarRevisao,
  removerFonte,
  salvarArtigo,
} from "@/app/acoes/admin-central";
import { FormularioArtigo } from "@/components/admin/central/formulario-artigo";
import { BotaoAcao, BotaoAcaoConfirmar } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { SELECAO_MIDIA, bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioFonte } from "@/components/admin/central/formulario-fonte";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import {
  EXPLICACAO_ESTADO_ARTIGO,
  ROTULO_ESTADO_ARTIGO,
  impedimentoDePublicacao,
  type EstadoDoArtigo,
  type TemaDoArtigo,
} from "@/lib/central-tecnica";
import { equipeQuePodeAssinar } from "@/lib/equipe-editorial";
import { formatarDataHora } from "@/lib/format";
import { textoDeHtml } from "@/lib/html";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artigo = await prisma.article.findUnique({ where: { id }, select: { title: true } });
  return { title: artigo ? `${artigo.title} · Central Técnica` : "Artigo" };
}

const AVISOS: Record<string, string> = {
  criado: "Rascunho criado. Agora dá para definir assinatura e fontes.",
};

const TOM: Record<EstadoDoArtigo, "ok" | "andamento" | "aguardando" | "neutro"> = {
  publicado: "ok",
  em_revisao: "aguardando",
  rascunho: "andamento",
  arquivado: "neutro",
};

export default async function PaginaEditarArtigo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("central");
  const { id } = await params;
  const { ok } = await searchParams;

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
      pendingNote: true,
      seoTitle: true,
      seoDescription: true,
      publishedAt: true,
      reviewedAt: true,
      updatedAt: true,
      authorId: true,
      reviewerId: true,
      author: { select: { name: true } },
      reviewer: { select: { name: true } },
      cover: { select: SELECAO_MIDIA },
      sources: { orderBy: { order: "asc" }, select: { id: true, title: true, url: true, note: true } },
    },
  });

  if (!artigo) notFound();

  const podeEscrever = podeEditar(usuario, "central");
  const [equipe, biblioteca] = await Promise.all([
    equipeQuePodeAssinar(),
    bibliotecaDeImagens(),
  ]);

  const estado = artigo.status as EstadoDoArtigo;

  /* A mesma função que a ação de publicar consulta. A tela mostra o que falta
     ANTES de a pessoa tentar — descobrir a pendência só depois de clicar em
     "publicar" transforma uma regra clara numa recusa surpresa. */
  const impedimento = impedimentoDePublicacao({
    temTitulo: artigo.title.trim().length > 2,
    tamanhoDoCorpo: textoDeHtml(artigo.body).length,
    autorId: artigo.authorId,
    revisorId: artigo.reviewerId,
    revisadoEm: artigo.reviewedAt,
    fontes: artigo.sources.length,
    orientaConduta: true,
  });

  const souORevisor = artigo.reviewerId === usuario.id && artigo.authorId !== usuario.id;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Central Técnica", href: "/admin/central-tecnica" },
          { rotulo: artigo.title },
        ]}
        titulo={artigo.title}
        descricao={
          <>
            <span className="label-mono">/central-tecnica/{artigo.slug}</span> · alterado em{" "}
            {formatarDataHora(artigo.updatedAt)}
            {artigo.reviewedAt ? ` · revisado em ${formatarDataHora(artigo.reviewedAt)}` : ""}
          </>
        }
        etiqueta={<Etiqueta tom={TOM[estado]}>{ROTULO_ESTADO_ARTIGO[estado]}</Etiqueta>}
        acoes={
          <Link
            href={`/admin/central-tecnica/${artigo.id}/previa`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <Eye className="size-4" aria-hidden />
            Prévia
          </Link>
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      <Aviso tom="info" titulo={ROTULO_ESTADO_ARTIGO[estado]}>
        {EXPLICACAO_ESTADO_ARTIGO[estado]}
        {artigo.pendingNote ? ` Nota da redação: ${artigo.pendingNote}` : ""}
      </Aviso>

      {/* ------------------------------------------------ o que falta --- */}
      {impedimento ? (
        <Aviso tom="atencao" titulo="Ainda não pode ir ao ar">
          <ul className="mt-1 space-y-1">
            {impedimento.falta.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-current" />
                <span>Falta {item}.</span>
              </li>
            ))}
          </ul>
        </Aviso>
      ) : null}

      {/* -------------------------------------------------- fluxo --- */}
      {podeEscrever ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-graf-200 bg-white p-4">
          {estado !== "em_revisao" && estado !== "publicado" ? (
            <BotaoAcao
              acao={mudarEstadoDoArtigo}
              valores={{ id: artigo.id, status: "em_revisao" }}
              rotulo="Enviar para revisão"
              icone={<Send className="size-4" aria-hidden />}
            />
          ) : null}

          {estado === "em_revisao" && !artigo.reviewedAt ? (
            <BotaoAcao
              acao={registrarRevisao}
              valores={{ id: artigo.id }}
              rotulo="Registrar minha revisão"
              icone={<CheckCircle2 className="size-4" aria-hidden />}
              desabilitado={!souORevisor}
            />
          ) : null}

          {estado !== "publicado" ? (
            <BotaoAcao
              acao={publicarArtigo}
              valores={{ id: artigo.id }}
              rotulo="Publicar"
              variante="primario"
              icone={<Upload className="size-4" aria-hidden />}
              desabilitado={Boolean(impedimento)}
            />
          ) : (
            <BotaoAcao
              acao={mudarEstadoDoArtigo}
              valores={{ id: artigo.id, status: "arquivado" }}
              rotulo="Arquivar"
              icone={<Archive className="size-4" aria-hidden />}
            />
          )}

          {estado === "arquivado" ? (
            <BotaoAcao
              acao={mudarEstadoDoArtigo}
              valores={{ id: artigo.id, status: "rascunho" }}
              rotulo="Voltar para rascunho"
              icone={<FileEdit className="size-4" aria-hidden />}
            />
          ) : null}

          {estado !== "publicado" ? (
            <BotaoAcaoConfirmar
              acao={excluirArtigo}
              valores={{ id: artigo.id }}
              rotulo="Excluir"
              pergunta="Excluir este rascunho?"
              detalhe="O texto some do sistema. Se ele já esteve no ar, arquive em vez de excluir."
              icone={<Trash2 className="size-4" aria-hidden />}
            />
          ) : null}

          {estado === "em_revisao" && !souORevisor && !artigo.reviewedAt ? (
            <p className="w-full text-[0.8125rem] leading-relaxed text-graf-500">
              A revisão é registrada por quem está indicado como revisor
              {artigo.reviewer ? `: ${artigo.reviewer.name}` : ""}. Ninguém marca por outra
              pessoa.
            </p>
          ) : null}
        </div>
      ) : null}

      <FormularioArtigo
        acao={salvarArtigo}
        artigo={{
          id: artigo.id,
          title: artigo.title,
          slug: artigo.slug,
          lead: artigo.lead,
          body: artigo.body,
          topic: artigo.topic as TemaDoArtigo,
          appliesTo: artigo.appliesTo,
          pendingNote: artigo.pendingNote,
          seoTitle: artigo.seoTitle ?? "",
          seoDescription: artigo.seoDescription ?? "",
          authorId: artigo.authorId ?? "",
          reviewerId: artigo.reviewerId ?? "",
        }}
        equipe={equipe}
        capa={artigo.cover}
        biblioteca={biblioteca}
        somenteLeitura={!podeEscrever}
      />

      {/* ------------------------------------------------- fontes --- */}
      <section className="rounded-xl border border-graf-200 bg-white p-5" aria-labelledby="fontes">
        <h2 id="fontes" className="text-base font-bold text-graf-950">
          Fontes
        </h2>
        <p className="mt-1 text-[0.875rem] leading-relaxed text-graf-600">
          Manual do fabricante, norma ou orientação técnica. Um artigo sobre equipamento
          pressurizado sem fonte é opinião com aparência de instrução — por isso a publicação
          exige pelo menos uma.
        </p>

        {artigo.sources.length > 0 ? (
          <ul className="mt-4 divide-y divide-graf-100 border-y border-graf-100">
            {artigo.sources.map((fonte) => (
              <li key={fonte.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-graf-900">
                    {fonte.title}
                  </span>
                  {fonte.url ? (
                    <span className="label-mono block break-all text-[0.8125rem] text-graf-500">
                      {fonte.url}
                    </span>
                  ) : null}
                  {fonte.note ? (
                    <span className="block text-[0.8125rem] text-graf-600">{fonte.note}</span>
                  ) : null}
                </span>
                {podeEscrever ? (
                  <BotaoAcao
                    acao={removerFonte}
                    valores={{ fonteId: fonte.id }}
                    rotulo="Remover"
                    rotuloAcessivel={`Remover a fonte ${fonte.title}`}
                    variante="perigo"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-graf-300 bg-graf-50 p-4 text-[0.875rem] text-graf-600">
            Nenhuma fonte cadastrada.
          </p>
        )}

        {podeEscrever ? (
          <FormularioFonte acao={adicionarFonte} articleId={artigo.id} className="mt-5" />
        ) : null}
      </section>
    </div>
  );
}
