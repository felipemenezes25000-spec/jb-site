import { ArrowRight, MessageCircle, PhoneCall } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { telHref, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

export function ChamadaFinal({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const telefone = s.telefone.trim();
  const whatsapp = s.whatsapp.trim();
  const horario = s.horario.trim();

  return (
    <section className="bg-white py-14 md:py-18 lg:py-20">
      <div className="container-jb max-w-[112rem]">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-jb-600 px-6 py-8 text-white shadow-[0_28px_70px_-46px_rgba(130,0,0,0.6)] sm:px-8 md:py-10 lg:px-12">
          <div className="absolute -right-16 -top-28 size-80 rounded-full border-[3.5rem] border-white/7" aria-hidden />
          <div className="absolute bottom-0 right-[27%] h-full w-px rotate-[25deg] bg-white/10" aria-hidden />

          <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/70">Próximo passo</p>
              <h2 className="mt-2 max-w-4xl text-[clamp(2rem,3.6vw,3.9rem)] font-black leading-[0.98] tracking-[-0.05em] text-white">
                Vai equipar a clínica ou precisa resolver um equipamento?
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                A equipe direciona sua necessidade para compra, orçamento ou assistência técnica sem você perder tempo procurando o canal certo.
              </p>

              {(telefone || horario) ? (
                <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/65">
                  {telefone ? (
                    <>
                      <PhoneCall className="size-3.5" aria-hidden />
                      <a href={telHref(telefone)} className="font-extrabold text-white hover:text-white/80">{telefone}</a>
                    </>
                  ) : null}
                  {horario ? <span className="sm:before:mr-2 sm:before:content-['·']">{horario}</span> : null}
                </p>
              ) : null}
            </div>

            <div className="flex min-w-[16rem] flex-col gap-3 sm:flex-row lg:flex-col">
              <LinkBotao href="/orcamento" variante="claro" tamanho="lg" className="w-full text-jb-700 hover:text-jb-900 sm:w-auto lg:w-full">
                Pedir orçamento
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>

              {whatsapp ? (
                <LinkBotao
                  href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB e gostaria de falar com a equipe.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  variante="claro"
                  tamanho="lg"
                  className="w-full border-white/35 bg-transparent text-white hover:bg-white hover:text-jb-700 sm:w-auto lg:w-full"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Falar no WhatsApp
                </LinkBotao>
              ) : (
                <LinkBotao href="/contato" variante="claro" tamanho="lg" className="w-full border-white/35 bg-transparent text-white hover:bg-white hover:text-jb-700 sm:w-auto lg:w-full">
                  Falar com a JB
                </LinkBotao>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
