"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Box, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";

type Marca = {
  slug: string;
  name: string;
  logo: { url: string; alt: string | null } | null;
};

const TAGLINES: Record<string, string> = {
  alt: "Soluções em odontologia",
  schuster: "Tradição que evolui",
  suctron: "Aspiração de alto desempenho",
  sugmaster: "Qualidade em cada detalhe",
};

function legendaDaMarca(marca: Marca) {
  return TAGLINES[marca.slug.toLowerCase()] ?? "Tecnologia para o seu consultório";
}

function indiceCircular(indice: number, total: number) {
  return ((indice % total) + total) % total;
}

export function MarcasCarousel({ marcas }: { marcas: Marca[] }) {
  const [ativa, setAtiva] = useState(Math.min(1, Math.max(0, marcas.length - 1)));

  const visiveis = useMemo(() => {
    if (marcas.length <= 4) return marcas.map((marca, indice) => ({ marca, indice }));

    const inicio = indiceCircular(ativa - 1, marcas.length);
    return Array.from({ length: 4 }, (_, deslocamento) => {
      const indice = indiceCircular(inicio + deslocamento, marcas.length);
      return { marca: marcas[indice], indice };
    });
  }, [ativa, marcas]);

  if (marcas.length === 0) return null;

  const anterior = () => setAtiva((valor) => indiceCircular(valor - 1, marcas.length));
  const proxima = () => setAtiva((valor) => indiceCircular(valor + 1, marcas.length));

  return (
    <section className="relative isolate overflow-hidden bg-[#fffdfc] py-16 sm:py-20 lg:min-h-[42rem] lg:py-24 xl:min-h-[46rem] xl:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_73%_45%,rgba(214,24,34,0.055),transparent_33%),radial-gradient(circle_at_12%_8%,rgba(214,24,34,0.025),transparent_34%)]" aria-hidden />
      <div className="pointer-events-none absolute -left-[20rem] -top-[23rem] size-[49rem] rounded-full bg-white shadow-[0_0_100px_rgba(25,25,28,0.035)]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-[24rem] -right-[20rem] size-[49rem] rounded-full border border-jb-200/45" aria-hidden />
      <div className="pointer-events-none absolute -bottom-[20rem] -right-[16rem] size-[41rem] rounded-full border border-jb-100" aria-hidden />

      <div className="pointer-events-none absolute -left-12 top-10 hidden h-[34rem] w-52 -rotate-[24deg] opacity-30 blur-md lg:block" aria-hidden>
        <span className="absolute left-12 top-0 h-80 w-8 rounded-full bg-gradient-to-b from-transparent via-graf-300/45 to-transparent" />
        <span className="absolute left-4 top-28 h-60 w-9 rounded-full bg-gradient-to-b from-transparent via-jb-600/55 to-transparent" />
        <span className="absolute left-28 top-2 h-96 w-10 rounded-full bg-gradient-to-b from-transparent via-graf-200/70 to-transparent" />
      </div>

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="absolute right-0 top-0 hidden items-center gap-4 lg:flex">
          <span className="grid size-14 place-items-center rounded-full bg-jb-50 text-jb-900">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <p className="max-w-[12rem] text-[0.66rem] font-bold uppercase leading-[1.55] tracking-[0.34em] text-graf-400">
            Tecnologia<br />que transforma<br />sorrisos
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)] lg:items-center lg:gap-14 xl:gap-20">
          <div className="max-w-[35rem] lg:pb-14">
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-jb-600" aria-hidden />
              <p className="text-[0.72rem] font-black uppercase tracking-[0.24em] text-jb-700">Marcas no catálogo</p>
            </div>

            <h2 className="mt-5 max-w-[10.7ch] text-[clamp(3rem,5.1vw,5.35rem)] font-black leading-[0.91] tracking-[-0.065em] text-graf-950">
              Marcas que <span className="text-jb-700">fazem parte do</span> dia a dia da JB.
            </h2>

            <p className="mt-6 max-w-[35rem] text-base leading-[1.65] text-graf-500 sm:text-[1.08rem]">
              Navegue por fabricante para encontrar os equipamentos publicados e os modelos que a equipe acompanha.
            </p>

            <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Link
                href="/marcas"
                className="group foco-jb inline-flex min-h-14 w-fit items-center gap-6 rounded-full bg-gradient-to-b from-jb-500 to-jb-700 px-7 text-sm font-black text-white shadow-[0_18px_35px_-18px_rgba(196,16,26,0.75)] transition-transform hover:-translate-y-0.5"
              >
                Ver todas as marcas
                <span className="grid size-9 place-items-center rounded-full bg-white/10 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>

              <div className="hidden h-11 w-px bg-graf-200 sm:block" aria-hidden />
              <p className="max-w-[12rem] text-[0.92rem] leading-[1.35] text-graf-500">
                As melhores marcas<br />para o seu consultório.
              </p>
            </div>
          </div>

          <div className="relative min-w-0 lg:pt-20">
            <div className="flex items-center gap-4 sm:gap-5">
              <button
                type="button"
                onClick={anterior}
                aria-label="Marca anterior"
                className="foco-jb hidden size-14 shrink-0 place-items-center rounded-full border border-graf-100 bg-white text-jb-700 shadow-[0_14px_34px_-24px_rgba(17,24,39,0.3)] transition hover:-translate-x-0.5 hover:border-jb-200 sm:grid"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visiveis.map(({ marca, indice }) => {
                  const selecionada = indice === ativa;
                  return (
                    <Link
                      key={`${marca.slug}-${indice}`}
                      href={`/marcas/${marca.slug}`}
                      onMouseEnter={() => setAtiva(indice)}
                      onFocus={() => setAtiva(indice)}
                      className={`group foco-jb relative flex min-h-[13.5rem] flex-col items-center justify-center rounded-[1.25rem] border bg-white/86 px-5 py-7 text-center backdrop-blur-sm transition-all duration-300 ${
                        selecionada
                          ? "-translate-y-1 border-jb-300 shadow-[0_24px_50px_-24px_rgba(202,20,30,0.35)]"
                          : "border-graf-100 shadow-[0_18px_45px_-34px_rgba(17,24,39,0.35)] hover:-translate-y-1 hover:border-jb-100"
                      }`}
                    >
                      <div className="flex h-20 w-full items-center justify-center">
                        {marca.logo ? (
                          <Image
                            src={marca.logo.url}
                            alt={marca.logo.alt || marca.name}
                            width={210}
                            height={84}
                            className="max-h-16 w-auto max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.035]"
                          />
                        ) : (
                          <span className="text-3xl font-black tracking-[-0.04em] text-graf-900">{marca.name}</span>
                        )}
                      </div>
                      <p className="mt-5 text-base font-bold text-graf-700">{marca.name}</p>
                      <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-graf-400">
                        {legendaDaMarca(marca)}
                      </p>
                    </Link>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={proxima}
                aria-label="Próxima marca"
                className="foco-jb hidden size-14 shrink-0 place-items-center rounded-full border border-graf-100 bg-white text-jb-700 shadow-[0_14px_34px_-24px_rgba(17,24,39,0.3)] transition hover:translate-x-0.5 hover:border-jb-200 sm:grid"
              >
                <ArrowRight className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mt-14 flex items-center justify-center gap-8 sm:justify-start sm:pl-[4.5rem]">
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(4, marcas.length) }).map((_, indice) => (
                  <button
                    key={indice}
                    type="button"
                    aria-label={`Ir para a marca ${indice + 1}`}
                    onClick={() => setAtiva(indice)}
                    className={`foco-jb h-[3px] rounded-full transition-all ${indice === ativa % Math.min(4, marcas.length) ? "w-24 bg-jb-700" : "w-20 bg-graf-200"}`}
                  />
                ))}
              </div>
              <p className="text-[0.72rem] font-black tracking-[0.16em] text-graf-400">
                <span className="text-jb-600">{String(ativa + 1).padStart(2, "0")}</span>
                <span className="mx-2 text-graf-300">/</span>
                {String(marcas.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[1.4rem] border border-graf-100 bg-white/72 px-5 py-5 shadow-[0_20px_55px_-42px_rgba(17,24,39,0.3)] backdrop-blur-sm sm:px-7 lg:mt-4 lg:ml-[17%] lg:max-w-[70%]">
          <div className="grid gap-5 sm:grid-cols-3 sm:divide-x sm:divide-graf-200">
            <div className="flex items-center gap-4 sm:pr-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-700"><ShieldCheck className="size-5" aria-hidden /></span>
              <div><p className="text-sm font-bold text-graf-600">Marcas de confiança</p><p className="mt-0.5 text-xs text-graf-400">Qualidade comprovada</p></div>
            </div>
            <div className="flex items-center gap-4 sm:px-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-700"><Box className="size-5" aria-hidden /></span>
              <div><p className="text-sm font-bold text-graf-600">Equipamentos para todas as necessidades</p><p className="mt-0.5 text-xs text-graf-400">Do consultório ao centro cirúrgico</p></div>
            </div>
            <div className="flex items-center gap-4 sm:pl-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-700"><Star className="size-5" aria-hidden /></span>
              <div><p className="text-sm font-bold text-graf-600">Suporte da equipe JB</p><p className="mt-0.5 text-xs text-graf-400">Da escolha ao pós-venda</p></div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-10 right-12 hidden max-w-[12rem] lg:block" aria-hidden>
          <p className="text-[0.63rem] font-bold uppercase leading-[1.55] tracking-[0.3em] text-graf-300">Juntos<br />por uma odontologia<br />mais forte</p>
          <span className="mt-3 block h-px w-10 bg-jb-400" />
        </div>
      </div>
    </section>
  );
}
