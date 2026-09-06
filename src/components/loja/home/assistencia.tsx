import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

const FLUXO = [
  { icone: ShoppingCart, rotulo: "Compra" },
  { icone: PackageCheck, rotulo: "Instalação" },
  { icone: Wrench, rotulo: "Assistência" },
  { icone: ClipboardCheck, rotulo: "Histórico" },
] as const;

function Instrumento({ escuro = false }: { escuro?: boolean }) {
  const prefixo = escuro ? "instrumento-escuro" : "instrumento-claro";

  return (
    <svg viewBox="0 0 360 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${prefixo}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={escuro ? "#fff" : "#f8f8f8"} />
          <stop offset="0.38" stopColor={escuro ? "#d8d8d8" : "#d7d9dc"} />
          <stop offset="0.68" stopColor={escuro ? "#8b8b8b" : "#8b8f94"} />
          <stop offset="1" stopColor={escuro ? "#f7f7f7" : "#eceff1"} />
        </linearGradient>
        <linearGradient id={`${prefixo}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2b32" />
          <stop offset="0.5" stopColor="#c80f18" />
          <stop offset="1" stopColor="#6b070d" />
        </linearGradient>
        <filter id={`${prefixo}-glow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {escuro ? (
        <>
          <ellipse cx="263" cy="172" rx="92" ry="92" fill="#e3151d" opacity="0.16" filter={`url(#${prefixo}-glow)`} />
          <circle cx="262" cy="172" r="72" fill="none" stroke="#ef1b23" strokeWidth="2" opacity="0.45" />
          <circle cx="262" cy="172" r="48" fill="none" stroke="#ff5258" strokeWidth="1" opacity="0.5" />
        </>
      ) : null}

      <g transform={escuro ? "translate(58 38) rotate(-24 175 210)" : "translate(86 14) rotate(8 175 210)"}>
        <rect x="146" y="52" width="72" height="264" rx="35" fill={`url(#${prefixo}-metal)`} stroke={escuro ? "#ffffff55" : "#c9ccd0"} />
        <rect x="152" y="68" width="60" height="28" rx="14" fill={escuro ? `url(#${prefixo}-red)` : "#d9dcdf"} opacity={escuro ? 1 : 0.9} />
        <rect x="151" y="274" width="62" height="34" rx="15" fill={escuro ? "#d71920" : "#b9bdc2"} opacity="0.9" />
        <path d="M160 52 C155 29 168 14 190 12 C211 10 229 25 230 44 L218 60 Z" fill={`url(#${prefixo}-metal)`} stroke={escuro ? "#ffffff55" : "#c7cacf"} />
        <path d="M185 13 L183 -7 L199 -7 L201 13" fill="#bfc3c8" />
        <path d="M199 -6 L206 -20" stroke="#90949a" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="182" cy="142" rx="12" ry="7" fill={escuro ? "#c20f17" : "#9c3a3d"} opacity="0.8" />
        <path d="M178 136 h8 v13 h-8z" fill={escuro ? "#f3f3f3" : "#d5d5d5"} opacity="0.7" />
        <rect x="161" y="318" width="42" height="62" rx="18" fill={`url(#${prefixo}-metal)`} stroke={escuro ? "#ffffff33" : "#c9ccd0"} />
      </g>
    </svg>
  );
}

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section className="relative isolate overflow-hidden border-y border-graf-100 bg-[#fffdfc] py-16 md:py-20 lg:py-24 xl:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_10%,rgba(221,24,32,0.07),transparent_27%),linear-gradient(120deg,rgba(255,255,255,0.96),rgba(255,249,248,0.92))]" aria-hidden />
      <div className="pointer-events-none absolute -right-[24rem] -top-[33rem] size-[67rem] rounded-full border border-jb-300/70" aria-hidden />
      <div className="pointer-events-none absolute -right-[18rem] -top-[27rem] size-[55rem] rounded-full border-[3.2rem] border-jb-50/80" aria-hidden />
      <div className="pointer-events-none absolute left-[-8rem] top-[7rem] hidden h-[40rem] w-[28rem] opacity-[0.18] xl:block" aria-hidden>
        <Image src="/images/footer-dental-chair.png" alt="" fill sizes="28rem" className="object-contain object-left-bottom" />
      </div>
      <div className="pointer-events-none absolute left-[5.3rem] top-[12.5rem] hidden text-[0.62rem] font-semibold uppercase leading-[1.8] tracking-[0.3em] text-graf-400 2xl:block" aria-hidden>
        Equipamentos<br />Suporte<br />Para o seu<br />Melhor amanhã
      </div>
      <div
        className="pointer-events-none absolute right-[4.6rem] top-[3.6rem] hidden rotate-[-7deg] text-right text-[1.3rem] leading-[1.05] text-graf-500 2xl:block"
        style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
        aria-hidden
      >
        Tecnologia<br />que impulsiona<br />sorrisos
        <span className="mx-auto mt-4 block h-px w-10 rotate-[-8deg] bg-graf-500" />
      </div>

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="mx-auto max-w-[96rem]">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-end lg:gap-14 xl:gap-20">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-jb-600" aria-hidden />
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-jb-700">Escolha o caminho</p>
              </div>
              <h2 className="mt-4 max-w-[14ch] text-[clamp(3rem,5vw,6.15rem)] font-black leading-[0.87] tracking-[-0.067em] text-graf-950">
                <span className="block">O próximo passo</span>
                <span className="block text-jb-700">depende do que sua</span>
                <span className="block">clínica precisa agora.</span>
              </h2>
            </div>

            <div className="pb-2 lg:pb-4">
              <p className="max-w-xl text-[clamp(1rem,1.35vw,1.28rem)] leading-[1.48] text-graf-500">
                Em vez de obrigar você a descobrir sozinho para onde ir, a home separa as duas intenções principais: comprar melhor ou resolver rápido.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <span className="h-[2px] w-20 bg-jb-600" aria-hidden />
                <span className="h-px flex-1 bg-graf-200" aria-hidden />
                <span className="text-[0.7rem] font-black tracking-[0.22em] text-jb-700">01</span>
                <span className="text-[0.7rem] font-bold tracking-[0.18em] text-graf-400">/ 04</span>
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-2">
            <article className="group relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-graf-200 bg-white shadow-[0_30px_70px_-50px_rgba(70,0,0,0.38)] sm:min-h-[27rem]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(227,24,32,0.08),transparent_32%),linear-gradient(135deg,#fff_0%,#fff_58%,#fff8f7_100%)]" aria-hidden />
              <div className="absolute -right-24 -top-28 size-72 rounded-full border-[2.7rem] border-jb-50/90" aria-hidden />
              <div className="absolute right-[-4rem] top-[-4rem] size-56 rounded-full border border-jb-200/60" aria-hidden />
              <div className="absolute bottom-[-5.4rem] right-[-0.5rem] hidden h-[22rem] w-[15rem] opacity-95 sm:block lg:w-[17rem]" aria-hidden>
                <Instrumento />
              </div>
              <div className="absolute right-8 top-8 hidden max-w-[8rem] text-[0.56rem] font-semibold uppercase leading-[1.7] tracking-[0.25em] text-graf-400 xl:block" aria-hidden>
                Equipamentos<br />que transformam<br />consultórios
                <span className="mt-3 block h-px w-5 bg-jb-600" />
              </div>

              <div className="relative z-10 flex min-h-[25rem] max-w-[69%] flex-col p-7 sm:min-h-[27rem] sm:p-9 lg:p-10">
                <span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-700 shadow-[0_12px_24px_-15px_rgba(220,20,28,0.45)]">
                  <ShoppingCart className="size-5" aria-hidden />
                </span>
                <p className="mt-7 text-[0.67rem] font-black uppercase tracking-[0.18em] text-jb-700">Quero comprar</p>
                <h3 className="mt-2 max-w-[11ch] text-[clamp(2rem,3vw,3.45rem)] font-black leading-[0.94] tracking-[-0.052em] text-graf-950">
                  Equipar ou ampliar a clínica.
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-6 text-graf-500 sm:text-[0.98rem] sm:leading-7">
                  Explore novos e seminovos, compare condição e disponibilidade e peça orientação quando precisar decidir entre modelos.
                </p>
                <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap">
                  <LinkBotao href="/loja" tamanho="lg" className="rounded-xl shadow-[0_13px_28px_-16px_rgba(220,20,28,0.8)]">
                    Ver equipamentos
                    <ArrowRight className="size-4" aria-hidden />
                  </LinkBotao>
                  <LinkBotao href="/orcamento" variante="secundario" tamanho="lg" className="rounded-xl bg-white/80">
                    Pedir orientação
                  </LinkBotao>
                </div>
              </div>
            </article>

            <article className="group relative min-h-[25rem] overflow-hidden rounded-[2rem] bg-[#101012] text-white shadow-[0_34px_78px_-42px_rgba(31,0,0,0.7)] sm:min-h-[27rem]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_42%,rgba(244,25,35,0.32),transparent_24%),radial-gradient(circle_at_70%_5%,rgba(143,5,12,0.26),transparent_33%),linear-gradient(125deg,#111113_0%,#151214_53%,#21090b_100%)]" aria-hidden />
              <div className="absolute right-[-9rem] top-[-9rem] size-[30rem] rounded-full border border-jb-500/60" aria-hidden />
              <div className="absolute right-[-4rem] top-[-4rem] size-[21rem] rounded-full border border-jb-500/25" aria-hidden />
              <div className="absolute bottom-[-6rem] right-[-4rem] hidden h-[25rem] w-[20rem] sm:block lg:w-[22rem]" aria-hidden>
                <Instrumento escuro />
              </div>
              <div className="absolute right-7 top-8 hidden text-[0.55rem] font-semibold uppercase leading-[1.7] tracking-[0.25em] text-white/45 xl:block" aria-hidden>
                Suporte hoje<br />continuidade<br />sempre
                <span className="mt-3 block h-px w-5 bg-jb-500" />
              </div>

              <div className="relative z-10 flex min-h-[25rem] max-w-[68%] flex-col p-7 sm:min-h-[27rem] sm:p-9 lg:p-10">
                <span className="flex size-12 items-center justify-center rounded-xl bg-jb-600 text-white shadow-[0_12px_30px_-10px_rgba(235,20,29,0.68)]">
                  <Wrench className="size-5" aria-hidden />
                </span>
                <p className="mt-7 text-[0.67rem] font-black uppercase tracking-[0.18em] text-jb-300">Preciso de suporte</p>
                <h3 className="mt-2 max-w-[10ch] text-[clamp(2rem,3vw,3.45rem)] font-black leading-[0.94] tracking-[-0.052em] text-white">
                  Resolver um equipamento.
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/65 sm:text-[0.98rem] sm:leading-7">
                  Abra o chamado no canal certo desde o início e deixe a equipe da JB conduzir a triagem, o orçamento e o histórico do atendimento.
                </p>
                <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap">
                  <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg" className="rounded-xl shadow-[0_14px_35px_-12px_rgba(235,20,29,0.7)]">
                    Solicitar assistência
                    <ArrowRight className="size-4" aria-hidden />
                  </LinkBotao>
                  {whatsapp ? (
                    <LinkBotao
                      href={whatsappHref(whatsapp, "Olá! Preciso de ajuda com um equipamento odontológico.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      variante="contorno-claro"
                      tamanho="lg"
                      className="rounded-xl bg-black/15"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      WhatsApp
                    </LinkBotao>
                  ) : (
                    <LinkBotao href="/contato" variante="contorno-claro" tamanho="lg" className="rounded-xl">
                      Falar com a JB
                    </LinkBotao>
                  )}
                </div>
              </div>
            </article>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-graf-200 bg-white/95 shadow-[0_15px_45px_-38px_rgba(70,0,0,0.3)] backdrop-blur-sm">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {FLUXO.map(({ icone: Icone, rotulo }, indice) => (
                <div key={rotulo} className="relative flex min-h-[5rem] items-center gap-4 border-graf-100 px-5 py-4 sm:border-l first:sm:border-l-0 lg:px-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700">
                    <Icone className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-graf-400">0{indice + 1}</p>
                    <p className="mt-0.5 text-[0.92rem] font-black text-graf-900">{rotulo}</p>
                  </div>
                  {indice < FLUXO.length - 1 ? (
                    <ChevronRight className="absolute right-4 size-4 text-graf-300 lg:right-5" aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs leading-relaxed text-graf-500 sm:flex-row">
            <span className="hidden h-px w-12 bg-graf-300 sm:block" aria-hidden />
            <span>A mesma relação acompanha a clínica antes e depois da entrega.</span>
            <Link href="/assistencia-tecnica" className="group inline-flex items-center gap-1.5 font-black text-jb-700 underline-offset-4 hover:underline">
              Conheça a assistência técnica JB.
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <span className="hidden h-px w-12 bg-graf-300 sm:block" aria-hidden />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[4.8rem] right-[4.8rem] hidden text-[0.56rem] font-semibold uppercase leading-[1.7] tracking-[0.28em] text-graf-400 2xl:block" aria-hidden>
        Parceria<br />em todas<br />as etapas
        <span className="mt-3 block h-px w-5 bg-graf-400" />
      </div>
    </section>
  );
}
