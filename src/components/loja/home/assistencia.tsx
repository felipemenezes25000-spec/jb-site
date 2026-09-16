import { ArrowRight, MessageCircle, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <Secao fundo="clara" largura="loja" espaco="md" separador>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-16">
        <div>
          <p className="sobretitulo mb-3 flex items-center gap-2">
            <Wrench className="size-4" aria-hidden />
            Assistência própria
          </p>
          <h2 className="text-section texto-forte max-w-2xl">
            Seu equipamento precisa de atenção?
          </h2>
          <p className="texto-guia texto-suave mt-4 max-w-2xl">
            Conte o que aconteceu. A equipe JB orienta a triagem, prepara o orçamento
            e acompanha o atendimento até a devolução do equipamento.
          </p>
        </div>
        <div className="border-t border-graf-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <p className="text-corpo leading-6 text-graf-700">
            Tenha em mãos o modelo e uma descrição do problema. Fotos ajudam a equipe
            a entender o que você precisa.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario">
              Solicitar assistência
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            {whatsapp ? (
              <LinkBotao
                href={whatsappHref(whatsapp, "Olá! Preciso de ajuda com um equipamento odontológico.")}
                target="_blank"
                rel="noopener noreferrer"
                variante="texto"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </LinkBotao>
            ) : null}
          </div>
        </div>
      </div>
    </Secao>
  );
}
