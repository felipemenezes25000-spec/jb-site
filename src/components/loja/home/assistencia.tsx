import Link from "next/link";
import {
  ArrowRight,
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

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section className="border-y border-graf-200 bg-[#f5f5f3] py-16 md:py-20 lg:py-24">
      <div className="container-jb max-w-[112rem]">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-end lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">Escolha o caminho</p>
            </div>
            <h2 className="mt-4 max-w-[12ch] text-[clamp(2.6rem,4.1vw,4.8rem)] font-black leading-[0.94] tracking-[-0.055em] text-graf-950">
              O próximo passo depende do que sua clínica precisa agora.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-graf-500 lg:justify-self-end">
            Em vez de obrigar você a descobrir sozinho para onde ir, a home separa as duas intenções principais: comprar melhor ou resolver rápido.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="group relative overflow-hidden rounded-[2rem] border border-graf-200 bg-white p-7 shadow-[0_24px_62px_-46px_rgba(60,0,0,0.32)] sm:p-9 lg:p-10">
            <div className="absolute -right-20 -top-24 size-72 rounded-full border-[3rem] border-jb-50" aria-hidden />
            <div className="relative z-10">
              <span className="flex size-12 items-center justify-center rounded-full bg-jb-50 text-jb-700">
                <ShoppingCart className="size-5" aria-hidden />
              </span>
              <p className="mt-8 text-[0.65rem] font-black uppercase tracking-[0.16em] text-jb-700">Quero comprar</p>
              <h3 className="mt-2 max-w-[12ch] text-[clamp(2rem,3.2vw,3.7rem)] font-black leading-[0.96] tracking-[-0.05em] text-graf-950">
                Equipar ou ampliar a clínica.
              </h3>
              <p className="mt-5 max-w-xl text-sm leading-7 text-graf-600 sm:text-base">
                Explore novos e seminovos, compare condição e disponibilidade e peça orientação quando precisar decidir entre modelos.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <LinkBotao href="/loja" tamanho="lg" className="rounded-xl">
                  Ver equipamentos
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
                <LinkBotao href="/orcamento" variante="secundario" tamanho="lg" className="rounded-xl">
                  Pedir orientação
                </LinkBotao>
              </div>
            </div>
          </article>

          <article className="group relative overflow-hidden rounded-[2rem] bg-[#111214] p-7 text-white shadow-[0_30px_76px_-46px_rgba(35,0,0,0.5)] sm:p-9 lg:p-10">
            <div className="absolute inset-y-0 right-0 w-[24%] bg-jb-600" aria-hidden />
            <div
              className="absolute inset-y-0 right-[12%] w-[30%] bg-jb-500/30"
              style={{ clipPath: "polygon(55% 0,100% 0,45% 100%,0 100%)" }}
              aria-hidden
            />
            <div className="absolute -right-20 -top-24 size-72 rounded-full border-[3rem] border-white/[0.055]" aria-hidden />

            <div className="relative z-10 max-w-2xl">
              <span className="flex size-12 items-center justify-center rounded-full bg-jb-600 text-white">
                <Wrench className="size-5" aria-hidden />
              </span>
              <p className="mt-8 text-[0.65rem] font-black uppercase tracking-[0.16em] text-jb-300">Preciso de suporte</p>
              <h3 className="mt-2 max-w-[12ch] text-[clamp(2rem,3.2vw,3.7rem)] font-black leading-[0.96] tracking-[-0.05em] text-white">
                Resolver um equipamento.
              </h3>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                Abra o chamado no canal certo desde o início e deixe a equipe da JB conduzir a triagem, o orçamento e o histórico do atendimento.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg" className="rounded-xl">
                  <Wrench className="size-4" aria-hidden />
                  Solicitar assistência
                </LinkBotao>
                {whatsapp ? (
                  <LinkBotao
                    href={whatsappHref(whatsapp, "Olá! Preciso de ajuda com um equipamento odontológico.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    variante="contorno-claro"
                    tamanho="lg"
                    className="rounded-xl"
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

        <div className="mt-4 overflow-hidden rounded-[1.3rem] border border-graf-200 bg-white">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {FLUXO.map(({ icone: Icone, rotulo }, indice) => (
              <div key={rotulo} className="relative flex min-h-20 items-center gap-3 border-graf-100 px-5 py-4 sm:border-l first:sm:border-l-0 lg:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700">
                  <Icone className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-graf-400">0{indice + 1}</p>
                  <p className="mt-0.5 text-sm font-black text-graf-900">{rotulo}</p>
                </div>
                {indice < FLUXO.length - 1 ? (
                  <ArrowRight className="absolute right-4 size-3.5 text-graf-300 lg:right-5" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-graf-500">
          A mesma relação acompanha a clínica antes e depois da entrega. {" "}
          <Link href="/assistencia-tecnica" className="font-extrabold text-jb-700 underline-offset-4 hover:underline">
            Conheça a assistência técnica JB
          </Link>
        </p>
      </div>
    </section>
  );
}
