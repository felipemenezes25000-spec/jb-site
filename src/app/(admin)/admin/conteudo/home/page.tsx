import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, LayoutTemplate, Pencil, Plus } from "lucide-react";

import { moverSecaoHome, publicarSecaoHome } from "@/app/acoes/admin-conteudo";
import { BotaoAcao, BotoesDeOrdem } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { SECOES, ehTipoSecao } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Vazio } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Seções da home",
};

const AVISOS: Record<string, string> = {
  excluida: "Seção excluída da home.",
};

export default async function PaginaSecoesDaHome({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const podeEscrever = podeEditar(usuario, "conteudo");
  const { ok } = await searchParams;

  const secoes = await prisma.homeSection.findMany({
    orderBy: [{ order: "asc" }, { updatedAt: "asc" }],
    select: {
      id: true,
      kind: true,
      title: true,
      subtitle: true,
      body: true,
      ctaLabel: true,
      ctaHref: true,
      order: true,
      published: true,
      updatedAt: true,
      media: { select: { url: true, alt: true, filename: true } },
    },
  });

  const publicadas = secoes.filter((secao) => secao.published).length;

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Home" }]}
        titulo="Seções da página inicial"
        descricao="A home é montada nesta ordem, de cima para baixo. Esconder uma seção não apaga o que está escrito nela."
        etiqueta={
          secoes.length > 0 ? (
            <Etiqueta tom={publicadas > 0 ? "ok" : "aguardando"}>
              {publicadas} de {secoes.length} no ar
            </Etiqueta>
          ) : undefined
        }
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/conteudo/home/nova" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Nova seção
            </LinkBotao>
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {secoes.length === 0 ? (
        <Vazio
          icone={LayoutTemplate}
          titulo="A home ainda não tem seções"
          descricao="Sem seções cadastradas, a página inicial fica sem blocos editáveis. Comece pela abertura."
          acao={
            podeEscrever ? (
              <LinkBotao href="/admin/conteudo/home/nova">
                <Plus className="size-4" aria-hidden />
                Criar a primeira seção
              </LinkBotao>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-3">
          {secoes.map((secao, indice) => {
            const tipo = ehTipoSecao(secao.kind) ? SECOES[secao.kind] : null;
            return (
              <li
                key={secao.id}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-card",
                  secao.published ? "border-graf-200" : "border-dashed border-graf-300 bg-graf-50/60",
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    aria-hidden
                    className="tabular flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-sm font-bold text-graf-600"
                  >
                    {indice + 1}
                  </span>

                  {secao.media ? (
                    /* miniatura interna, sem otimizador */
                    <img
                      src={secao.media.url}
                      alt=""
                      loading="lazy"
                      className="h-16 w-24 shrink-0 rounded-lg border border-graf-200 object-cover"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-graf-950">
                        {tipo?.rotulo ?? secao.kind}
                      </h2>
                      {secao.published ? (
                        <Etiqueta tom="ok" ponto>
                          No ar
                        </Etiqueta>
                      ) : (
                        <Etiqueta tom="neutro" ponto>
                          Escondida
                        </Etiqueta>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-graf-700">
                      {secao.title || (
                        <span className="text-graf-500">Sem título próprio</span>
                      )}
                    </p>
                    {secao.subtitle ? (
                      <p className="mt-0.5 line-2 text-sm text-graf-500">{secao.subtitle}</p>
                    ) : null}

                    <p className="mt-2 text-xs text-graf-500">
                      {tipo?.descricao ?? "Tipo não reconhecido pelo site."}
                      {secao.ctaLabel ? ` · Botão: ${secao.ctaLabel} → ${secao.ctaHref}` : ""}
                      {` · alterada em ${formatarDataHora(secao.updatedAt)}`}
                    </p>
                  </div>

                  {podeEscrever ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <BotoesDeOrdem
                        acao={moverSecaoHome}
                        id={secao.id}
                        primeiro={indice === 0}
                        ultimo={indice === secoes.length - 1}
                        rotuloDoItem={`a seção ${tipo?.rotulo ?? secao.kind}`}
                      />
                      <BotaoAcao
                        acao={publicarSecaoHome}
                        valores={{ id: secao.id, publicar: secao.published ? "0" : "1" }}
                        rotulo={secao.published ? "Esconder" : "Publicar"}
                        variante="secundario"
                        icone={
                          secao.published ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )
                        }
                      />
                      <LinkBotao
                        href={`/admin/conteudo/home/${secao.id}`}
                        variante="secundario"
                        tamanho="sm"
                      >
                        <Pencil className="size-4" aria-hidden />
                        Editar
                      </LinkBotao>
                    </div>
                  ) : (
                    <Link
                      href={`/admin/conteudo/home/${secao.id}`}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-jb-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      Ver detalhes
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
