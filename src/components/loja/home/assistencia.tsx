import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, MessageSquareText, Stethoscope, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

const ETAPAS = [
  { numero: "01", titulo: "Abra o chamado", descricao: "Descreva o defeito e anexe foto ou vídeo quando ajudar.", icone: MessageSquareText },
  { numero: "02", titulo: "Triagem e diagnóstico", descricao: "A equipe técnica define o caminho do atendimento e a avaliação.", icone: Stethoscope },
  { numero: "03", titulo: "Aprove o orçamento", descricao: "Peças e mão de obra ficam discriminadas antes do serviço seguir.", icone: FileText },
  { numero: "04", titulo: "Serviço + histórico", descricao: "A OS registra o que foi executado e entra na ficha do equipamento.", icone: ClipboardCheck },
];

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section id="como-funciona" className="border-b border-jb-100 bg-white py-16 md:py-24 lg:py-28">
      <div className="container-jb max-w-[112rem]">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:items-start xl:gap-16">
          <div>
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
              <span className="h-px w-8 bg-jb-500" aria-hidden />
              Assistência técnica JB
            </p>
            <h2 className="mt-4 max-w-[11ch] text-display text-graf-950">Seu equipamento parou. O processo não precisa parar junto.</h2>
            <p className="texto-guia mt-6 max-w-xl text-graf-600">
              Do primeiro relato à ordem de serviço, cada etapa tem responsável, registro e decisão clara.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </LinkBotao>
              {whatsapp ? (
                <LinkBotao
                  href={whatsappHref(whatsapp, "Olá! Preciso de assistência técnica para um equipamento odontológico.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  variante="perigo"
                  tamanho="lg"
                >
                  Falar no WhatsApp
                </LinkBotao>
              ) : null}
            </div>

            {s.horario.trim() ? <p className="mt-5 text-sm text-graf-500">Atendimento: {s.horario}.</p> : null}
          </div>

          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
            {ETAPAS.map((etapa) => {
              const Icone = etapa.icone;
              return (
                <li key={etapa.numero} className="relative border-t-2 border-jb-500 pt-5">
                  <div className="flex items-start justify-between gap-5">
                    <span className="flex size-11 items-center justify-center rounded-full bg-jb-500 text-white" aria-hidden>
                      <Icone className="size-5" />
                    </span>
                    <span className="text-5xl font-black tracking-[-0.08em] text-jb-100" aria-hidden>{etapa.numero}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold leading-snug text-graf-950">{etapa.titulo}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-graf-600">{etapa.descricao}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-jb-100 pt-6 text-sm text-graf-600">
          <span>Quer reduzir a chance de parada?</span>
          <Link href="/manutencao-preventiva" className="inline-flex min-h-11 items-center gap-1 font-extrabold text-jb-700 underline-offset-4 hover:underline">
            Conheça a manutenção preventiva
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
