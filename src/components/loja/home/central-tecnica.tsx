import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { ROTULO_TEMA } from "@/lib/central-tecnica";
import { artigosPublicados } from "@/lib/artigos";

/* ============================================================================
   Central Técnica na home

   Autoridade editorial entra sem repetir assistência ou Área da Clínica. Só
   artigo publicado aparece. Se ainda não houver conteúdo revisado, a faixa vira
   um convite compacto para a Central Técnica, sem inventar artigo ou data.
   ============================================================================ */

export async function SecaoCentralTecnica() {
  const artigos = (await artigosPublicados()).slice(0, 3);

  return (
    <Secao fundo="afundada" espaco="lg" separador>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1.42fr)] lg:gap-10">
        <div className="flex flex-col justify-between rounded-[1.75rem] bg-graf-950 p-7 text-graf-300 shadow-raised sm:p-8 lg:min-h-[28rem]">
          <div>
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-300">
              <span className="h-px w-8 bg-jb-500" aria-hidden />
              Central Técnica JB
            </p>
            <h2 className="mt-4 text-[clamp(2rem,3.3vw,3.65rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-white">
              Conhecimento de bancada, não texto genérico.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-graf-300">
              Sintomas, compra, operação e manutenção escritos para quem usa equipamento odontológico no dia a dia.
            </p>
          </div>

          <div className="mt-8">
            <LinkBotao href="/central-tecnica" variante="contorno-claro" tamanho="lg">
              Explorar a Central Técnica
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
          </div>
        </div>

        {artigos.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {artigos.map((artigo) => (
              <li key={artigo.slug} className="flex min-w-0">
                <Link
                  href={`/central-tecnica/${artigo.slug}`}
                  className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-white to-graf-100">
                    {artigo.cover ? (
                      <Image
                        src={artigo.cover.url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-graf-300" aria-hidden>
                        <BookOpen className="size-12" />
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-jb-700">
                      {ROTULO_TEMA[artigo.topic]}
                    </p>
                    <h3 className="mt-2 line-3 text-lg font-extrabold leading-snug text-graf-950 transition-colors group-hover:text-jb-700">
                      {artigo.title}
                    </h3>
                    {artigo.lead ? (
                      <p className="mt-3 line-3 text-sm leading-relaxed text-graf-600">{artigo.lead}</p>
                    ) : null}
                    <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-sm font-extrabold text-jb-700">
                      Ler artigo
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-[28rem] items-center justify-center rounded-[1.75rem] border border-dashed border-graf-300 bg-white p-8 text-center">
            <div className="max-w-md">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-jb-50 text-jb-600" aria-hidden>
                <BookOpen className="size-6" />
              </span>
              <h3 className="mt-5 text-title text-graf-950">Conteúdo técnico em revisão</h3>
              <p className="mt-3 text-base leading-relaxed text-graf-600">
                A Central Técnica só publica quando o texto tem autor e revisão identificados. Enquanto isso, o conteúdo permanece fora do ar.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <LinkBotao href="/central-tecnica" variante="secundario">
                  Abrir a Central Técnica
                </LinkBotao>
                <LinkBotao href="/assistencia-tecnica/solicitar" variante="texto">
                  <Wrench className="size-4" aria-hidden />
                  Falar com a assistência
                </LinkBotao>
              </div>
            </div>
          </div>
        )}
      </div>
    </Secao>
  );
}
