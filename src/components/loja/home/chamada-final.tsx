import { ArrowRight, MessageCircle, PhoneCall } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { telHref, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

export function ChamadaFinal({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const telefone = s.telefone.trim();
  const whatsapp = s.whatsapp.trim();
  const horario = s.horario.trim();

  return (
    <section className="bg-white py-16 md:py-24 lg:py-28">
      <div className="container-jb max-w-[112rem] border-y-4 border-jb-500 py-10 md:py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-14">
          <div className="max-w-5xl">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
              <span className="h-px w-8 bg-jb-500" aria-hidden />
              Próximo passo
            </p>
            <h2 className="mt-4 text-[clamp(2.8rem,5vw,6rem)] font-extrabold leading-[0.97] tracking-[-0.05em] text-graf-950">
              Sua clínica precisa de equipamento ou assistência?
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-graf-600 sm:text-lg">
              Conte o que precisa e a equipe da JB direciona para compra, orçamento ou atendimento técnico.
            </p>

            {(telefone || horario) ? (
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-500">
                {telefone ? (
                  <>
                    <PhoneCall className="size-4 text-jb-600" aria-hidden />
                    <a href={telHref(telefone)} className="font-extrabold text-jb-700 hover:text-jb-900">{telefone}</a>
                  </>
                ) : null}
                {horario ? <span className="sm:before:mr-2 sm:before:content-['·']">{horario}</span> : null}
              </p>
            ) : null}
          </div>

          <div className="flex min-w-[16rem] flex-col gap-3 sm:flex-row lg:flex-col">
            <LinkBotao href="/orcamento" tamanho="lg" className="w-full sm:w-auto lg:w-full">
              Pedir orçamento
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>

            {whatsapp ? (
              <LinkBotao
                href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB e gostaria de falar com a equipe.")}
                target="_blank"
                rel="noopener noreferrer"
                variante="perigo"
                tamanho="lg"
                className="w-full sm:w-auto lg:w-full"
              >
                <MessageCircle className="size-4" aria-hidden />
                Falar no WhatsApp
              </LinkBotao>
            ) : (
              <LinkBotao href="/contato" variante="perigo" tamanho="lg" className="w-full sm:w-auto lg:w-full">
                Falar com a JB
              </LinkBotao>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
