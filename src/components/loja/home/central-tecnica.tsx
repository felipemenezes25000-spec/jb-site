import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { ROTULO_TEMA } from "@/lib/central-tecnica";
import { artigosPublicados } from "@/lib/artigos";

export async function SecaoCentralTecnica() {
  const artigos = (await artigosPublicados()).slice(0, 3);

  return (
    <section className="bg-jb-500 py-16 text-white md:py-24 lg:py-28">
      <div className="container-jb max-w-[112rem] grid gap-10 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1.42fr)] lg:items-stretch">
        <div className="flex flex-col justify-between">
          <div>
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">
              <span className="h-px w-8 bg-white" aria-hidden />
              Central Técnica JB
            </p>
            <h2 className="mt-4 text-[clamp(2.2rem,3.5vw,4rem)] font-extrabold leading-[1.01] tracking-[-0.045em] text-white">
              Conhecimento de bancada, não texto genérico.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80">
              Sintomas, compra, operação e manutenção escritos para quem usa equipamento odontológico no dia a dia.
            </p>
          </div>

          <div className="mt-8">
            <LinkBotao href="/central-tecnica" variante="claro" tamanho="lg" className="text-jb-700 hover:text-jb-900">
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
                  className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white text-graf-950 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-white">
                    {artigo.cover ? (
                      <Image
                        src={artigo.cover.url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-jb-200" aria-hidden>
                        <BookOpen className="size-12" />
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col border-t border-jb-100 p-5 sm:p-6">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-jb-700">{ROTULO_TEMA[artigo.topic]}</p>
                    <h3 className="mt-2 line-3 text-lg font-extrabold leading-snug text-graf-950 group-hover:text-jb-700">{artigo.title}</h3>
                    {artigo.lead ? <p className="mt-3 line-3 text-sm leading-relaxed text-graf-600">{artigo.lead}</p> : null}
                    <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-sm font-extrabold text-jb-700">Ler artigo <ArrowRight className="size-4" aria-hidden /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-[25rem] items-center justify-center rounded-2xl bg-white p-8 text-center text-graf-950">
            <div className="max-w-md">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-jb-500 text-white" aria-hidden>
                <BookOpen className="size-6" />
              </span>
              <h3 className="mt-5 text-title text-graf-950">Conteúdo técnico em revisão</h3>
              <p className="mt-3 text-base leading-relaxed text-graf-600">
                A Central Técnica só publica quando o texto tem autor e revisão identificados. Enquanto isso, o conteúdo permanece fora do ar.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <LinkBotao href="/central-tecnica" variante="perigo">Abrir a Central Técnica</LinkBotao>
                <LinkBotao href="/assistencia-tecnica/solicitar" variante="texto">
                  <Wrench className="size-4" aria-hidden />
                  Falar com a assistência
                </LinkBotao>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
