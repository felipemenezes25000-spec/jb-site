import type { Metadata } from "next";
import { BookOpen, Plus } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import {
  ROTULO_ESTADO_ARTIGO,
  ROTULO_TEMA,
  type EstadoDoArtigo,
  type TemaDoArtigo,
} from "@/lib/central-tecnica";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
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

export const metadata: Metadata = { title: "Central Técnica" };

const AVISOS: Record<string, string> = {
  excluido: "Rascunho excluído.",
};

const TOM: Record<EstadoDoArtigo, "ok" | "andamento" | "aguardando" | "neutro"> = {
  publicado: "ok",
  em_revisao: "aguardando",
  rascunho: "andamento",
  arquivado: "neutro",
};

type Linha = {
  id: string;
  title: string;
  slug: string;
  status: EstadoDoArtigo;
  topic: TemaDoArtigo;
  autor: string | null;
  revisor: string | null;
  pendencia: string;
  atualizado: string;
};

export default async function PaginaCentralTecnica({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("central");
  const podeEscrever = podeEditar(usuario, "central");
  const { ok } = await searchParams;

  const artigos = await prisma.article.findMany({
    /* Publicado primeiro, depois o que espera revisão, depois o resto. A
       ordem alfabética do enum não serviria: ela deixaria "arquivado" no
       topo, que é justamente o que ninguém precisa ver primeiro. */
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      topic: true,
      pendingNote: true,
      updatedAt: true,
      author: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  const linhas: Linha[] = artigos.map((artigo) => ({
    id: artigo.id,
    title: artigo.title,
    slug: artigo.slug,
    status: artigo.status as EstadoDoArtigo,
    topic: artigo.topic as TemaDoArtigo,
    autor: artigo.author?.name ?? null,
    revisor: artigo.reviewer?.name ?? null,
    pendencia: artigo.pendingNote,
    atualizado: formatarDataHora(artigo.updatedAt),
  }));

  const semAssinatura = linhas.filter(
    (linha) => linha.status !== "publicado" && (!linha.autor || !linha.revisor),
  ).length;

  const colunas: Coluna<Linha>[] = [
    {
      chave: "title",
      rotulo: "Artigo",
      renderizar: (linha) => (
        <span className="block">
          <span className="block font-semibold text-graf-900">{linha.title}</span>
          <span className="mt-0.5 block text-apoio text-graf-500">
            {ROTULO_TEMA[linha.topic]} · /central-tecnica/{linha.slug}
          </span>
        </span>
      ),
    },
    {
      chave: "assinatura",
      rotulo: "Assinatura",
      largura: "16rem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="block text-apoio leading-relaxed">
          <span className="block text-graf-700">
            {linha.autor ? `Autor: ${linha.autor}` : "Autor: a definir"}
          </span>
          <span className="block text-graf-500">
            {linha.revisor ? `Revisão: ${linha.revisor}` : "Revisão: a definir"}
          </span>
        </span>
      ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "9rem",
      renderizar: (linha) => (
        <Etiqueta tom={TOM[linha.status]}>{ROTULO_ESTADO_ARTIGO[linha.status]}</Etiqueta>
      ),
    },
    {
      chave: "atualizado",
      rotulo: "Alterado",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="text-graf-600">{linha.atualizado}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Central Técnica" }]}
        titulo="Central Técnica"
        descricao="Artigos técnicos assinados. Nenhum vai ao ar sem autor, revisor e data real de revisão."
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/central-tecnica/novo" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Novo artigo
            </LinkBotao>
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {/* O número que a redação precisa ver ao abrir a tela: não é quantos
          textos existem, é quantos estão parados esperando gente. */}
      {semAssinatura > 0 ? (
        <Aviso tom="info" titulo="Textos esperando assinatura">
          {semAssinatura === 1
            ? "1 texto ainda não tem autor ou revisor definido"
            : `${semAssinatura} textos ainda não têm autor ou revisor definido`}
          . Enquanto isso, eles ficam fora do site — a Central não publica conteúdo técnico sem
          quem responda por ele.
        </Aviso>
      ) : null}

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/central-tecnica/${linha.id}`}
        legenda="Artigos da Central Técnica, com assinatura e situação editorial"
        vazio={{
          icone: BookOpen,
          titulo: "Nenhum artigo ainda",
          descricao: "Crie o primeiro rascunho para começar a pauta da Central Técnica.",
          acao: podeEscrever ? (
            <LinkBotao href="/admin/central-tecnica/novo">
              <Plus className="size-4" aria-hidden />
              Novo artigo
            </LinkBotao>
          ) : undefined,
        }}
      />
    </div>
  );
}
