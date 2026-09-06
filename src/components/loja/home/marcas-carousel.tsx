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

const VISIVEIS = 4;

const TAGLINES: Record<string, string> = {
  alt: "Soluções em odontologia",
  schuster: "Tradição que evolui",
  suctron: "Aspiração de alto desempenho",
  sugmaster: "Qualidade em cada detalhe",
};

const LOGOS: Record<string, string> = {
  alt: "/marcas/alt.png",
  schuster: "/marcas/schuster.png",
  suctron: "/marcas/suctron.png",
  sugmaster: "/marcas/sugmaster.png",
};

function chave(marca: Marca) {
  return marca.slug.toLowerCase().replace(/^demo-/, "");
}

function legenda(marca: Marca) {
  return TAGLINES[chave(marca)] ?? "Tecnologia para o seu consultório";
}

function arteDaMarca(marca: Marca) {
  if (marca.logo) return { url: marca.logo.url, alt: marca.logo.alt || marca.name };
  const local = LOGOS[chave(marca)];
  return local ? { url: local, alt: marca.name } : null;
}

function circular(indice: number, total: number) {
  return ((indice % total) + total) % total;
}

export function MarcasCarousel({ marcas }: { marcas: Marca[] }) {
  const total = marcas.length;
  const janela = Math.min(VISIVEIS, total);
  const [inicio, setInicio] = useState(0);
  const [ativa, setAtiva] = useState(Math.min(1, total - 1));

  const visiveis = useMemo(
    () =>
      Array.from({ length: janela }, (_, deslocamento) => {
        const indice = circular(inicio + deslocamento, total);
        return { marca: marcas[indice], indice };
      }),
    [inicio, janela, marcas, total],
  );

  if (total === 0) return null;

  const andar = (passo: number) => {
    setInicio((valor) => circular(valor + passo, total));
    setAtiva((valor) => circular(valor + passo, total));
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#fffdfc] py-16 sm:py-20 lg:min-h-[42.5rem] lg:py-20 min-[1360px]:min-h-[43.5rem]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_44%,rgba(214,24,34,0.05),transparent_34%),radial-gradient(circle_at_16%_10%,rgba(214,24,34,0.022),transparent_36%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[22rem] -top-[26rem] size-[52rem] rounded-full bg-white shadow-[0_0_120px_rgba(25,25,28,0.04)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[27rem] -right-[19rem] size-[52rem] rounded-full border border-jb-200/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[22rem] -right-[15rem] size-[43rem] rounded-full border border-jb-100/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-4 hidden h-[38rem] w-56 -rotate-[26deg] opacity-30 blur-lg lg:block"
        aria-hidden
      >
        <span className="absolute left-14 top-0 h-80 w-9 rounded-full bg-gradient-to-b from-transparent via-graf-300/45 to-transparent" />
        <span className="absolute left-4 top-32 h-64 w-10 rounded-full bg-gradient-to-b from-transparent via-jb-600/50 to-transparent" />
        <span className="absolute left-32 top-2 h-[26rem] w-11 rounded-full bg-gradient-to-b from-transparent via-graf-200/70 to-transparent" />
      </div>

      <div className="container-jb relative z-10 max-w-[115rem]">
        <div className="pointer-events-none absolute right-0 top-0 hidden items-center gap-5 lg:flex">
          <span className="grid size-[3.15rem] shrink-0 place-items-center rounded-full bg-jb-50/70 text-graf-800">
            <Sparkles className="size-[1.05rem]" aria-hidden />
          </span>
          <p className="text-[0.66rem] font-bold uppercase leading-[1.6] tracking-[0.32em] text-graf-400">
            Tecnologia
            <br />
            que transforma
            <br />
            sorrisos
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-center lg:gap-x-16 min-[1360px]:gap-x-[7rem]">
          <div className="lg:pb-24">
            <div className="flex items-center gap-4">
              <span className="h-[2px] w-9 shrink-0 rounded-full bg-jb-600" aria-hidden />
              <p className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-jb-700">
                Marcas no catálogo
              </p>
            </div>

            <h2 className="mt-6 max-w-[32rem] text-[clamp(2.75rem,4.35vw,4.45rem)] font-black leading-[0.96] tracking-[-0.055em] text-graf-950">
              Marcas que <span className="text-jb-700">fazem parte do</span> dia a dia da JB.
            </h2>

            <p className="mt-7 max-w-[31rem] text-[1.05rem] leading-[1.5] text-graf-500 min-[1360px]:text-[1.12rem]">
              Navegue por fabricante para encontrar os equipamentos publicados e os modelos que a
              equipe acompanha.
            </p>

            <div className="mt-9 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
              <Link
                href="/marcas"
                className="group foco-jb inline-flex min-h-[3.6rem] w-fit items-center gap-8 rounded-full bg-gradient-to-b from-jb-500 to-jb-700 py-2 pl-8 pr-3 text-[0.95rem] font-bold text-white shadow-[0_20px_38px_-18px_rgba(196,16,26,0.7)] transition-transform hover:-translate-y-0.5"
              >
                Ver todas as marcas
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="size-[1.05rem]" aria-hidden />
                </span>
              </Link>

              <div className="hidden h-12 w-px shrink-0 bg-graf-200 sm:block" aria-hidden />
              <p className="text-[0.95rem] leading-[1.4] text-graf-500">
                As melhores marcas
                <br />
                para o seu consultório.
              </p>
            </div>
          </div>

          <div className="relative min-w-0 min-[1840px]:-mr-24">
            <div className="relative px-0 sm:px-[4.75rem]">
              <button
                type="button"
                onClick={() => andar(-1)}
                aria-label="Marcas anteriores"
                className="foco-jb absolute left-0 top-1/2 hidden size-[3.6rem] -translate-y-1/2 place-items-center rounded-full border border-graf-100 bg-white text-jb-600 shadow-[0_16px_36px_-22px_rgba(17,24,39,0.4)] transition hover:-translate-x-0.5 hover:border-jb-200 sm:grid"
              >
                <ArrowLeft className="size-[1.35rem]" aria-hidden />
              </button>

              <ul className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 min-[1360px]:grid-cols-4 min-[1360px]:gap-3.5">
                {visiveis.map(({ marca, indice }) => {
                  const arte = arteDaMarca(marca);
                  const selecionada = indice === ativa;
                  return (
                    <li key={`${marca.slug}-${indice}`}>
                      <Link
                        href={`/marcas/${marca.slug}`}
                        onMouseEnter={() => setAtiva(indice)}
                        onFocus={() => setAtiva(indice)}
                        className={`group foco-jb flex h-[12.4rem] flex-col items-center justify-center rounded-[1.4rem] border px-5 text-center transition-all duration-300 ${
                          selecionada
                            ? "-translate-y-[5px] border-jb-300 bg-white shadow-[0_26px_46px_-26px_rgba(202,20,30,0.4)]"
                            : "border-graf-100 bg-white/85 shadow-[0_18px_44px_-34px_rgba(17,24,39,0.32)] hover:-translate-y-[5px] hover:border-jb-100"
                        }`}
                      >
                        <span className="flex h-[4.4rem] w-full items-center justify-center">
                          {arte ? (
                            <Image
                              src={arte.url}
                              alt={arte.alt}
                              width={280}
                              height={130}
                              sizes="270px"
                              className="max-h-[4.1rem] w-auto max-w-[84%] object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <span className="text-[1.75rem] font-black tracking-[-0.04em] text-graf-900">
                              {marca.name}
                            </span>
                          )}
                        </span>
                        <span className="mt-5 block text-[1.02rem] font-bold text-graf-800">
                          {marca.name}
                        </span>
                        <span className="mt-1.5 block text-[0.6rem] font-bold uppercase leading-[1.5] tracking-[0.2em] text-graf-400">
                          {legenda(marca)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => andar(1)}
                aria-label="Próximas marcas"
                className="foco-jb absolute right-0 top-1/2 hidden size-[3.6rem] -translate-y-1/2 place-items-center rounded-full border border-graf-100 bg-white text-jb-600 shadow-[0_16px_36px_-22px_rgba(17,24,39,0.4)] transition hover:translate-x-0.5 hover:border-jb-200 sm:grid"
              >
                <ArrowRight className="size-[1.35rem]" aria-hidden />
              </button>
            </div>

            <div className="mt-11 flex items-center justify-center gap-9 sm:justify-start sm:pl-[4.75rem]">
              <div className="flex items-center gap-2">
                {Array.from({ length: janela }).map((_, posicao) => {
                  const indice = circular(inicio + posicao, total);
                  return (
                    <button
                      key={indice}
                      type="button"
                      aria-label={`Ver ${marcas[indice].name}`}
                      onClick={() => setAtiva(indice)}
                      className={`foco-jb h-[3px] w-[5.5rem] rounded-full transition-colors ${
                        indice === ativa ? "bg-jb-600" : "bg-graf-200"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[0.78rem] font-bold tracking-[0.14em] text-graf-400">
                <span className="text-jb-600">{String(ativa + 1).padStart(2, "0")}</span>
                <span className="mx-1.5 text-graf-300">/</span>
                {String(total).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[1.6rem] border border-graf-100 bg-white/70 px-6 py-5 shadow-[0_22px_58px_-44px_rgba(17,24,39,0.32)] backdrop-blur-sm sm:px-8 lg:mt-0 lg:ml-[17%] lg:max-w-[64%]">
          <div className="grid gap-6 sm:grid-cols-3 sm:divide-x sm:divide-graf-200/80">
            <div className="flex items-center gap-4 sm:pr-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-600">
                <ShieldCheck className="size-[1.2rem]" aria-hidden />
              </span>
              <p className="text-[0.95rem] font-semibold text-graf-700">
                Marcas de confiança
                <span className="mt-0.5 block text-[0.82rem] font-normal text-graf-400">
                  Qualidade comprovada
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4 sm:px-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-600">
                <Box className="size-[1.2rem]" aria-hidden />
              </span>
              <p className="text-[0.95rem] font-semibold text-graf-700">
                Equipamentos para todas as necessidades
                <span className="mt-0.5 block text-[0.82rem] font-normal text-graf-400">
                  Do consultório ao centro cirúrgico
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4 sm:pl-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-600">
                <Star className="size-[1.2rem]" aria-hidden />
              </span>
              <p className="text-[0.95rem] font-semibold text-graf-700">
                Suporte da equipe JB
                <span className="mt-0.5 block text-[0.82rem] font-normal text-graf-400">
                  Da escolha ao pós-venda
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 hidden lg:block" aria-hidden>
          <p className="text-[0.63rem] font-bold uppercase leading-[1.6] tracking-[0.28em] text-graf-300">
            Juntos
            <br />
            por uma odontologia
            <br />
            mais forte
          </p>
          <span className="mt-3.5 block h-[2px] w-9 rounded-full bg-jb-400" />
        </div>
      </div>
    </section>
  );
}
