import type { Metadata } from "next";
import { Eye, EyeOff, Pencil, Plus, Presentation } from "lucide-react";

import { moverSlide, publicarSlide } from "@/app/acoes/admin-conteudo";
import { BotaoAcao, BotoesDeOrdem } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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
  title: "Slides",
};

const AVISOS: Record<string, string> = {
  excluido: "Slide excluído.",
};

/** Situação real de exibição: publicação e vigência juntas. */
function situacao(
  publicado: boolean,
  inicio: Date | null,
  fim: Date | null,
  agora: Date,
): { texto: string; tom: Tom } {
  if (!publicado) return { texto: "Despublicado", tom: "neutro" };
  if (inicio && inicio > agora) {
    return { texto: `Começa em ${formatarData(inicio)}`, tom: "aguardando" };
  }
  if (fim && fim < agora) return { texto: `Encerrado em ${formatarData(fim)}`, tom: "alerta" };
  return { texto: "No ar", tom: "ok" };
}

export default async function PaginaSlides({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const podeEscrever = podeEditar(usuario, "conteudo");
  const { ok } = await searchParams;

  const agora = new Date();
  const slides = await prisma.slide.findMany({
    orderBy: [{ order: "asc" }, { updatedAt: "asc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      href: true,
      order: true,
      published: true,
      startsAt: true,
      endsAt: true,
      image: { select: { url: true, alt: true, filename: true } },
    },
  });

  const noAr = slides.filter(
    (slide) =>
      slide.published &&
      (!slide.startsAt || slide.startsAt <= agora) &&
      (!slide.endsAt || slide.endsAt >= agora),
  ).length;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Slides" }]}
        titulo="Slides do carrossel"
        descricao="Destaques que giram no topo do site. Um slide com período definido some sozinho quando a campanha acaba."
        etiqueta={
          slides.length > 0 ? (
            <Etiqueta tom={noAr > 0 ? "ok" : "aguardando"}>
              {noAr} de {slides.length} no ar
            </Etiqueta>
          ) : undefined
        }
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/conteudo/slides/novo" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Novo slide
            </LinkBotao>
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {slides.length === 0 ? (
        <Vazio
          icone={Presentation}
          titulo="Nenhum slide cadastrado"
          descricao="Sem slides, o topo do site mostra apenas o conteúdo fixo da abertura."
          acao={
            podeEscrever ? (
              <LinkBotao href="/admin/conteudo/slides/novo">
                <Plus className="size-4" aria-hidden />
                Criar o primeiro slide
              </LinkBotao>
            ) : undefined
          }
        />
      ) : (
        <ol className="space-y-3">
          {slides.map((slide, indice) => {
            const estado = situacao(slide.published, slide.startsAt, slide.endsAt, agora);
            return (
              <li
                key={slide.id}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-card",
                  slide.published ? "border-graf-200" : "border-dashed border-graf-300 bg-graf-50/60",
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    aria-hidden
                    className="tabular flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-sm font-bold text-graf-600"
                  >
                    {indice + 1}
                  </span>

                  {slide.image ? (
                    /* miniatura interna, sem otimizador */
                    <img
                      src={slide.image.url}
                      alt=""
                      loading="lazy"
                      className="h-16 w-28 shrink-0 rounded-lg border border-graf-200 object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-graf-300 text-apoio text-graf-500">
                      Sem imagem
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-graf-950">{slide.title}</h2>
                      <Etiqueta tom={estado.tom} ponto>
                        {estado.texto}
                      </Etiqueta>
                    </div>

                    {slide.subtitle ? (
                      <p className="mt-1 line-2 text-sm text-graf-600">{slide.subtitle}</p>
                    ) : null}

                    <p className="mt-2 text-apoio text-graf-500">
                      {slide.href ? `Leva para ${slide.href}` : "Sem link"}
                      {slide.startsAt || slide.endsAt
                        ? ` · vigência ${slide.startsAt ? formatarData(slide.startsAt) : "sempre"} até ${slide.endsAt ? formatarData(slide.endsAt) : "sem fim"}`
                        : " · sem período definido"}
                    </p>
                  </div>

                  {podeEscrever ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <BotoesDeOrdem
                        acao={moverSlide}
                        id={slide.id}
                        primeiro={indice === 0}
                        ultimo={indice === slides.length - 1}
                        rotuloDoItem={`o slide ${slide.title}`}
                      />
                      <BotaoAcao
                        acao={publicarSlide}
                        valores={{ id: slide.id, publicar: slide.published ? "0" : "1" }}
                        rotulo={slide.published ? "Despublicar" : "Publicar"}
                        variante="secundario"
                        icone={
                          slide.published ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )
                        }
                      />
                      <LinkBotao
                        href={`/admin/conteudo/slides/${slide.id}`}
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
            );
          })}
        </ol>
      )}
    </div>
  );
}
