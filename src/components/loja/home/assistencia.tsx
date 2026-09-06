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

const CURSIVA = { fontFamily: '"Segoe Script", "Brush Script MT", cursive' } as const;

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section className="relative isolate overflow-hidden border-y border-graf-100 bg-[#fffdfc] py-14 min-[768px]:py-16 min-[1024px]:py-18 min-[1440px]:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(221,24,32,0.075),transparent_28%),radial-gradient(circle_at_4%_62%,rgba(221,24,32,0.055),transparent_27%),linear-gradient(120deg,rgba(255,255,255,0.97),rgba(255,249,248,0.91))]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -right-[24rem] -top-[33rem] size-[67rem] rounded-full border border-jb-300/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[18rem] -top-[27rem] size-[55rem] rounded-full border-[3.2rem] border-jb-50/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[26rem] -left-[20rem] size-[46rem] rounded-full border border-jb-100"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute left-0 top-0 hidden h-[20rem] w-[13rem] opacity-75 min-[1440px]:block"
        aria-hidden
      >
        <Image
          src="/images/next-step/top-left-dental-arm.webp"
          alt=""
          fill
          sizes="208px"
          className="object-contain object-left-top"
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden w-[clamp(18rem,22vw,27rem)] opacity-92 min-[1280px]:block"
        aria-hidden
      >
        <Image
          src="/images/next-step/clinic-chair-left.webp"
          alt=""
          width={432}
          height={940}
          sizes="(min-width: 1600px) 432px, 320px"
          className="h-auto w-full object-contain object-left-bottom"
        />
      </div>

      <p
        className="pointer-events-none absolute left-[5.5rem] top-[10.5rem] hidden text-[0.62rem] font-semibold uppercase leading-[1.9] tracking-[0.3em] text-graf-400 min-[1600px]:block"
        aria-hidden
      >
        Equipamentos
        <br />
        Suporte
        <br />
        Para o seu
        <br />
        Melhor amanhã
      </p>

      <div
        className="pointer-events-none absolute right-[4.5rem] top-[3.1rem] hidden -rotate-[7deg] text-right text-[1.35rem] leading-[1.08] text-graf-500 min-[1600px]:block"
        style={CURSIVA}
        aria-hidden
      >
        Tecnologia
        <br />
        que impulsiona
        <br />
        sorrisos
        <span className="ml-auto mt-4 block h-px w-10 -rotate-[8deg] bg-graf-400" />
      </div>

      {/*
        Esta seção não usa container-jb no desktop largo.
        O container global é limitado a 90rem e fazia a composição ficar estreita,
        quebrando o título em quatro linhas e deixando um vazio enorme à direita.
        A partir de 1600px a malha replica a referência: margem editorial maior à
        esquerda para a cadeira e apenas um respiro curto à direita.
      */}
      <div className="relative z-10 mx-auto w-full max-w-[90rem] px-5 min-[640px]:px-7 min-[1024px]:px-10 min-[1600px]:mx-0 min-[1600px]:ml-[14vw] min-[1600px]:mr-[3vw] min-[1600px]:w-auto min-[1600px]:max-w-none min-[1600px]:px-0">
        <div className="grid gap-8 min-[1024px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] min-[1024px]:items-end min-[1024px]:gap-x-14 min-[1440px]:gap-x-16">
          <div className="min-[1600px]:pl-8">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 shrink-0 bg-jb-600" aria-hidden />
              <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-jb-700">
                Escolha o caminho
              </p>
            </div>

            <h2 className="mt-4 max-w-none text-[clamp(2.75rem,4.25vw,5.25rem)] font-black leading-[0.89] tracking-[-0.062em] text-graf-950">
              <span className="block min-[1024px]:whitespace-nowrap">O próximo passo</span>
              <span className="block text-jb-700 min-[1024px]:whitespace-nowrap">
                depende do que sua
              </span>
              <span className="block min-[1024px]:whitespace-nowrap">clínica precisa agora.</span>
            </h2>
          </div>

          <div className="min-[1024px]:pb-3">
            <p className="max-w-[34rem] text-[clamp(1rem,1.18vw,1.2rem)] leading-[1.5] text-graf-500">
              Em vez de obrigar você a descobrir sozinho para onde ir, a home separa as duas
              intenções principais: comprar melhor ou resolver rápido.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span className="h-[2px] w-20 shrink-0 bg-jb-600" aria-hidden />
              <span className="h-px flex-1 bg-graf-200" aria-hidden />
              <span className="text-[0.72rem] font-black tracking-[0.22em] text-jb-700">01</span>
              <span className="text-[0.72rem] font-bold tracking-[0.18em] text-graf-400">/ 04</span>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 min-[1024px]:grid-cols-[minmax(0,0.88fr)_minmax(0,1fr)] min-[1024px]:gap-5">
          <article className="relative min-h-[24rem] overflow-hidden rounded-[2rem] border border-graf-200 bg-white shadow-[0_30px_70px_-50px_rgba(70,0,0,0.38)]">
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_88%_22%,rgba(227,24,32,0.09),transparent_34%),linear-gradient(135deg,#fff_0%,#fff_56%,#fff7f6_100%)]"
              aria-hidden
            />
            <div
              className="absolute -right-24 -top-28 size-72 rounded-full border-[2.7rem] border-jb-50/90"
              aria-hidden
            />
            <div
              className="absolute -right-16 -top-16 size-56 rounded-full border border-jb-200/60"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute bottom-0 right-0 hidden h-[88%] w-[17.5rem] min-[640px]:block min-[1440px]:w-[19rem]"
              aria-hidden
            >
              <Image
                src="/images/next-step/buy-card-handpiece.webp"
                alt=""
                fill
                sizes="(min-width: 1440px) 304px, 280px"
                className="object-contain object-right-bottom"
              />
            </div>

            <p
              className="pointer-events-none absolute right-8 top-8 hidden max-w-[8.5rem] text-right text-[0.56rem] font-semibold uppercase leading-[1.8] tracking-[0.25em] text-graf-400 min-[1280px]:block"
              aria-hidden
            >
              Equipamentos
              <br />
              que transformam
              <br />
              consultórios
              <span className="ml-auto mt-3 block h-px w-5 bg-jb-600" />
            </p>

            <div className="relative z-10 flex min-h-[24rem] max-w-[66%] flex-col p-7 min-[640px]:p-9 min-[1024px]:p-10">
              <span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-700 shadow-[0_12px_24px_-15px_rgba(220,20,28,0.45)]">
                <ShoppingCart className="size-5" aria-hidden />
              </span>
              <p className="mt-6 text-[0.67rem] font-black uppercase tracking-[0.18em] text-jb-700">
                Quero comprar
              </p>
              <h3 className="mt-2 max-w-[11ch] text-[clamp(1.9rem,2.45vw,3rem)] font-black leading-[0.95] tracking-[-0.05em] text-graf-950">
                Equipar ou ampliar a clínica.
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-6 text-graf-500 min-[640px]:text-[0.98rem] min-[640px]:leading-7">
                Explore novos e seminovos, compare condição e disponibilidade e peça orientação
                quando precisar decidir entre modelos.
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-6 min-[640px]:flex-row min-[640px]:flex-wrap">
                <LinkBotao
                  href="/loja"
                  tamanho="lg"
                  className="rounded-xl shadow-[0_13px_28px_-16px_rgba(220,20,28,0.8)]"
                >
                  Ver equipamentos
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
                <LinkBotao
                  href="/orcamento"
                  variante="secundario"
                  tamanho="lg"
                  className="rounded-xl bg-white/80"
                >
                  Pedir orientação
                </LinkBotao>
              </div>
            </div>
          </article>

          <article className="relative min-h-[24rem] overflow-hidden rounded-[2rem] bg-[#101012] text-white shadow-[0_34px_78px_-42px_rgba(31,0,0,0.7)]">
            <div
              className="absolute inset-0 bg-[linear-gradient(125deg,#111113_0%,#151214_48%,#1d0709_100%)]"
              aria-hidden
            />

            <div
              className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[66%] min-[640px]:block"
              aria-hidden
            >
              <Image
                src="/images/next-step/support-card-device.webp"
                alt=""
                fill
                sizes="(min-width: 1600px) 620px, (min-width: 1024px) 540px, 380px"
                className="object-cover object-right-bottom"
              />
            </div>

            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_86%_44%,rgba(244,25,35,0.3),transparent_27%),radial-gradient(circle_at_68%_4%,rgba(143,5,12,0.25),transparent_34%),linear-gradient(90deg,#101012_0%,rgba(16,16,18,0.94)_34%,transparent_61%)]"
              aria-hidden
            />
            <div
              className="absolute -right-36 -top-36 size-[30rem] rounded-full border border-jb-500/50"
              aria-hidden
            />
            <div
              className="absolute -right-16 -top-16 size-[21rem] rounded-full border border-jb-500/20"
              aria-hidden
            />

            <p
              className="pointer-events-none absolute right-7 top-8 z-10 hidden text-right text-[0.55rem] font-semibold uppercase leading-[1.8] tracking-[0.25em] text-white/45 min-[1280px]:block"
              aria-hidden
            >
              Suporte hoje
              <br />
              continuidade
              <br />
              sempre
              <span className="ml-auto mt-3 block h-px w-5 bg-jb-500" />
            </p>

            <div className="relative z-10 flex min-h-[24rem] max-w-[60%] flex-col p-7 min-[640px]:p-9 min-[1024px]:p-10">
              <span className="flex size-12 items-center justify-center rounded-xl bg-jb-600 text-white shadow-[0_12px_30px_-10px_rgba(235,20,29,0.68)]">
                <Wrench className="size-5" aria-hidden />
              </span>
              <p className="mt-6 text-[0.67rem] font-black uppercase tracking-[0.18em] text-jb-300">
                Preciso de suporte
              </p>
              <h3 className="mt-2 max-w-[10ch] text-[clamp(1.9rem,2.45vw,3rem)] font-black leading-[0.95] tracking-[-0.05em] text-white">
                Resolver um equipamento.
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/65 min-[640px]:text-[0.98rem] min-[640px]:leading-7">
                Abra o chamado no canal certo desde o início e deixe a equipe da JB conduzir a
                triagem, o orçamento e o histórico do atendimento.
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-6 min-[640px]:flex-row min-[640px]:flex-wrap">
                <LinkBotao
                  href="/assistencia-tecnica/solicitar"
                  tamanho="lg"
                  className="rounded-xl shadow-[0_14px_35px_-12px_rgba(235,20,29,0.7)]"
                >
                  Solicitar assistência
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>

                {whatsapp ? (
                  <LinkBotao
                    href={whatsappHref(
                      whatsapp,
                      "Olá! Preciso de ajuda com um equipamento odontológico.",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    variante="contorno-claro"
                    tamanho="lg"
                    className="rounded-xl bg-black/25"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    WhatsApp
                  </LinkBotao>
                ) : (
                  <LinkBotao
                    href="/contato"
                    variante="contorno-claro"
                    tamanho="lg"
                    className="rounded-xl bg-black/25"
                  >
                    Falar com a JB
                  </LinkBotao>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-graf-200 bg-white/95 shadow-[0_15px_45px_-38px_rgba(70,0,0,0.3)] backdrop-blur-sm">
          <div className="grid min-[640px]:grid-cols-2 min-[1024px]:grid-cols-4">
            {FLUXO.map(({ icone: Icone, rotulo }, indice) => (
              <div
                key={rotulo}
                className="relative flex min-h-[5rem] items-center gap-4 border-graf-100 px-5 py-4 min-[640px]:border-l first:min-[640px]:border-l-0 min-[1024px]:px-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700">
                  <Icone className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-graf-400">
                    0{indice + 1}
                  </p>
                  <p className="mt-0.5 text-[0.92rem] font-black text-graf-900">{rotulo}</p>
                </div>
                {indice < FLUXO.length - 1 ? (
                  <ChevronRight
                    className="absolute right-4 size-4 text-graf-300 min-[1024px]:right-5"
                    aria-hidden
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-5 flex flex-col items-center justify-center gap-2 text-center text-xs leading-relaxed text-graf-500 min-[640px]:flex-row">
          <span className="hidden h-px w-12 bg-graf-300 min-[640px]:block" aria-hidden />
          <span>A mesma relação acompanha a clínica antes e depois da entrega.</span>
          <Link
            href="/assistencia-tecnica"
            className="group foco-jb inline-flex items-center gap-1.5 rounded-xs font-black text-jb-700 underline-offset-4 hover:underline"
          >
            Conheça a assistência técnica JB.
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <span className="hidden h-px w-12 bg-graf-300 min-[640px]:block" aria-hidden />
        </div>
      </div>

      <p
        className="pointer-events-none absolute bottom-[4.8rem] right-[4.8rem] hidden text-right text-[0.56rem] font-semibold uppercase leading-[1.8] tracking-[0.28em] text-graf-400 min-[1600px]:block"
        aria-hidden
      >
        Parceria
        <br />
        em todas
        <br />
        as etapas
        <span className="ml-auto mt-3 block h-px w-5 bg-graf-400" />
      </p>
    </section>
  );
}
