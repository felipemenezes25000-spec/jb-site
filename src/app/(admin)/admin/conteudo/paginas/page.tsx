import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Lock, Plus } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { resumoDoHtml } from "@/components/admin/conteudo/html-seguro";
import { LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
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

export const metadata: Metadata = {
  title: "Páginas",
};

type LinhaDaPagina = {
  slug: string;
  title: string;
  lead: string;
  resumo: string;
  editable: boolean;
  imagens: number;
  atualizada: string;
};

const AVISOS: Record<string, string> = {
  excluida: "Página excluída.",
};

export default async function PaginaListaDePaginas({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const podeEscrever = podeEditar(usuario, "conteudo");
  const { ok } = await searchParams;

  const paginas = await prisma.page.findMany({
    orderBy: { title: "asc" },
    select: {
      slug: true,
      title: true,
      lead: true,
      body: true,
      editable: true,
      updatedAt: true,
      _count: { select: { gallery: true } },
    },
  });

  const linhas: LinhaDaPagina[] = paginas.map((pagina) => ({
    slug: pagina.slug,
    title: pagina.title,
    lead: pagina.lead ?? "",
    resumo: resumoDoHtml(pagina.body, 90),
    editable: pagina.editable,
    imagens: pagina._count.gallery,
    atualizada: formatarDataHora(pagina.updatedAt),
  }));

  const colunas: Coluna<LinhaDaPagina>[] = [
    {
      chave: "title",
      rotulo: "Página",
      renderizar: (linha) => (
        <span className="block">
          <span className="block font-semibold text-graf-900">{linha.title}</span>
          <span className="mt-0.5 block text-[0.8125rem] text-graf-500">
            {linha.lead || linha.resumo || "Sem texto cadastrado"}
          </span>
        </span>
      ),
    },
    {
      chave: "slug",
      rotulo: "Endereço",
      largura: "14rem",
      renderizar: (linha) => (
        <span className="label-mono text-graf-600">/{linha.slug}</span>
      ),
    },
    {
      chave: "conteudo",
      rotulo: "Conteúdo",
      largura: "10rem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="text-[0.8125rem] text-graf-600">
          {linha.resumo ? "Texto preenchido" : "Sem texto"}
          {linha.imagens > 0 ? ` · ${linha.imagens} na galeria` : ""}
        </span>
      ),
    },
    {
      chave: "editable",
      rotulo: "Situação",
      largura: "10rem",
      renderizar: (linha) =>
        linha.editable ? (
          <Etiqueta tom="ok">No ar</Etiqueta>
        ) : (
          <Etiqueta tom="neutro">
            <Lock className="size-3" aria-hidden />
            Travada
          </Etiqueta>
        ),
    },
    {
      chave: "atualizada",
      rotulo: "Atualizada",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="text-graf-600">{linha.atualizada}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Páginas" }]}
        titulo="Páginas do site"
        descricao="Cada página responde em um endereço próprio, como /sobre. Não existe rascunho: página cadastrada é página no ar."
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/conteudo/paginas/nova" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Nova página
            </LinkBotao>
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.slug}
        hrefDaLinha={(linha) => `/admin/conteudo/paginas/${linha.slug}`}
        legenda="Páginas institucionais do site, com endereço e data da última alteração"
        vazio={{
          icone: FileText,
          titulo: "Nenhuma página cadastrada",
          descricao:
            "As páginas institucionais aparecem aqui. Crie a primeira para começar a escrever.",
          acao: podeEscrever ? (
            <LinkBotao href="/admin/conteudo/paginas/nova">
              <Plus className="size-4" aria-hidden />
              Nova página
            </LinkBotao>
          ) : undefined,
        }}
        rodape={
          linhas.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                {linhas.length === 1 ? "1 página" : `${linhas.length} páginas`} no site.
              </span>
              {/*
                `<a>` e não `<Link>`: o mapa do site é rota de metadado, não
                página do roteador. Com `<Link>`, o Next pré-carrega o destino
                como se fosse uma rota React e /sitemap.xml responde 500 ao
                pedido de pré-carregamento — o link funcionava, mas o console de
                quem abrisse esta tela ficava com um erro de servidor.
              */}
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-jb-700 underline underline-offset-2"
              >
                Ver o mapa do site
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
