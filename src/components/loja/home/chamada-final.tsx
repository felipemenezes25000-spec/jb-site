import { ArrowRight, MessageCircle, PhoneCall } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { telHref, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Chamada final

   Fecha a home com peso visual suficiente para parecer conclusão, não mais uma
   caixinha clara. O vermelho continua em ação e detalhe; a base é grafite.
   ============================================================================ */

export function ChamadaFinal({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const telefone = s.telefone.trim();
  const whatsapp = s.whatsapp.trim();
  const horario = s.horario.trim();

  return (
    <Secao fundo="grafite" espaco="xl" padraoDeFundo>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-14">
        <div className="max-w-5xl">
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-300">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Próximo passo
          </p>
          <h2 className="mt-4 text-[clamp(2.7rem,5vw,6rem)] font-extrabold leading-[0.97] tracking-[-0.05em] text-white">
            Sua clínica precisa de equipamento ou assistência?
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-graf-300 sm:text-lg">
            Conte o que precisa e a equipe da JB direciona para compra, orçamento ou atendimento técnico.
          </p>

          {(telefone || horario) ? (
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-400">
              {telefone ? (
                <>
                  <PhoneCall className="size-4" aria-hidden />
                  <a href={telHref(telefone)} className="font-bold text-white hover:text-jb-300">
                    {telefone}
                  </a>
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
              variante="contorno-claro"
              tamanho="lg"
              className="w-full sm:w-auto lg:w-full"
            >
              <MessageCircle className="size-4" aria-hidden />
              Falar no WhatsApp
            </LinkBotao>
          ) : (
            <LinkBotao href="/contato" variante="contorno-claro" tamanho="lg" className="w-full sm:w-auto lg:w-full">
              Falar com a JB
            </LinkBotao>
          )}
        </div>
      </div>
    </Secao>
  );
}
