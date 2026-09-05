import type { Metadata } from "next";
import { Eye, EyeOff, HelpCircle, Pencil, Plus } from "lucide-react";

import { moverFaq, publicarFaq } from "@/app/acoes/admin-conteudo";
import { BotaoAcao, BotoesDeOrdem } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { GRUPOS_FAQ, ROTULO_GRUPO_FAQ } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Vazio } from "@/components/ui/data";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
};

const AVISOS: Record<string, string> = {
  excluida: "Pergunta excluída.",
};

export default async function PaginaFaq({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const podeEscrever = podeEditar(usuario, "conteudo");
  const { ok } = await searchParams;

  const perguntas = await prisma.faq.findMany({
    orderBy: [{ group: "asc" }, { order: "asc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      group: true,
      order: true,
      published: true,
      product: { select: { id: true, name: true } },
    },
  });

  const gruposConhecidos = GRUPOS_FAQ as readonly string[];
  const outros = [...new Set(perguntas.map((p) => p.group))].filter(
    (grupo) => !gruposConhecidos.includes(grupo),
  );
  const ordemDosGrupos = [...gruposConhecidos, ...outros];

  const publicadas = perguntas.filter((pergunta) => pergunta.published).length;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Perguntas frequentes" }]}
        titulo="Perguntas frequentes"
        descricao="Organizadas por grupo. A ordem dentro do grupo é a ordem em que aparecem no site."
        etiqueta={
          perguntas.length > 0 ? (
            <Etiqueta tom={publicadas > 0 ? "ok" : "aguardando"}>
              {publicadas} de {perguntas.length} publicadas
            </Etiqueta>
          ) : undefined
        }
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/conteudo/faq/nova" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Nova pergunta
            </LinkBotao>
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {perguntas.length === 0 ? (
        <Vazio
          icone={HelpCircle}
          titulo="Nenhuma pergunta cadastrada"
          descricao="As dúvidas frequentes aparecem na home e na página de dúvidas. Comece pelas perguntas que mais chegam por telefone."
          acao={
            podeEscrever ? (
              <LinkBotao href="/admin/conteudo/faq/nova">
                <Plus className="size-4" aria-hidden />
                Criar a primeira pergunta
              </LinkBotao>
            ) : undefined
          }
        />
      ) : (
        ordemDosGrupos.map((grupo) => {
          const doGrupo = perguntas.filter((pergunta) => pergunta.group === grupo);
          if (doGrupo.length === 0) return null;

          const rotulo =
            grupo in ROTULO_GRUPO_FAQ
              ? ROTULO_GRUPO_FAQ[grupo as keyof typeof ROTULO_GRUPO_FAQ]
              : grupo;

          return (
            <section key={grupo} aria-labelledby={`grupo-${grupo}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 id={`grupo-${grupo}`} className="text-lg font-bold text-graf-950">
                  {rotulo}
                </h2>
                {podeEscrever ? (
                  <LinkBotao
                    href={`/admin/conteudo/faq/nova?grupo=${grupo}`}
                    variante="texto"
                    tamanho="sm"
                  >
                    <Plus className="size-4" aria-hidden />
                    Adicionar neste grupo
                  </LinkBotao>
                ) : null}
              </div>

              <ol className="space-y-3">
                {doGrupo.map((pergunta, indice) => (
                  <li
                    key={pergunta.id}
                    className={cn(
                      "rounded-xl border bg-white p-4 shadow-card",
                      pergunta.published
                        ? "border-graf-200"
                        : "border-dashed border-graf-300 bg-graf-50/60",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <span
                        aria-hidden
                        className="tabular flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-sm font-bold text-graf-600"
                      >
                        {indice + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[0.9375rem] font-semibold text-graf-950">
                            {pergunta.question}
                          </h3>
                          {pergunta.published ? null : (
                            <Etiqueta tom="neutro" ponto>
                              Despublicada
                            </Etiqueta>
                          )}
                        </div>
                        <p className="mt-1 line-2 text-sm text-graf-600">{pergunta.answer}</p>
                        {pergunta.product ? (
                          <p className="mt-1.5 text-xs text-graf-500">
                            Aparece só na ficha de {pergunta.product.name}
                          </p>
                        ) : null}
                      </div>

                      {podeEscrever ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <BotoesDeOrdem
                            acao={moverFaq}
                            id={pergunta.id}
                            primeiro={indice === 0}
                            ultimo={indice === doGrupo.length - 1}
                            rotuloDoItem={`a pergunta ${pergunta.question}`}
                          />
                          <BotaoAcao
                            acao={publicarFaq}
                            valores={{
                              id: pergunta.id,
                              publicar: pergunta.published ? "0" : "1",
                            }}
                            rotulo={pergunta.published ? "Despublicar" : "Publicar"}
                            variante="secundario"
                            icone={
                              pergunta.published ? (
                                <EyeOff className="size-4" aria-hidden />
                              ) : (
                                <Eye className="size-4" aria-hidden />
                              )
                            }
                          />
                          <LinkBotao
                            href={`/admin/conteudo/faq/${pergunta.id}`}
                            variante="secundario"
                            tamanho="sm"
                          >
                            <Pencil className="size-4" aria-hidden />
                            Editar
                          </LinkBotao>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
