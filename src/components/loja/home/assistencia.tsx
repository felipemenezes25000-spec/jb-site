import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  Stethoscope,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/data";
import { PassosNumerados } from "@/components/ui/passos";
import { Secao } from "@/components/ui/secao";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Assistência técnica — o processo

   O que acontece depois que a pessoa clica em "solicitar assistência",
   explicado em cinco etapas curtas. As etapas descrevem o fluxo que a
   plataforma executa de verdade: chamado, triagem, avaliação, orçamento para
   aprovação e ordem de serviço.

   Nenhum prazo é prometido aqui — prazo depende de peça, de agenda e do
   equipamento, e não existe no dado.
   ============================================================================ */

const ETAPAS = [
  {
    titulo: "Você abre o chamado",
    descricao:
      "Conte o que está acontecendo e, se puder, anexe foto ou vídeo do defeito. Quem já é cliente escolhe o equipamento da própria lista.",
    icone: MessageSquareText,
  },
  {
    titulo: "A equipe faz a triagem",
    descricao:
      "Um técnico da JB lê o chamado, confirma marca e modelo e define o caminho do atendimento.",
    icone: ClipboardCheck,
  },
  {
    titulo: "Diagnóstico ou visita",
    descricao:
      "A avaliação acontece na clínica ou na JB, conforme o equipamento e o defeito. A visita fica agendada no chamado.",
    icone: Stethoscope,
  },
  {
    titulo: "Orçamento para aprovar",
    descricao:
      "Peças e mão de obra discriminadas. Você aprova ou recusa pelo site, e o serviço só segue depois disso.",
    icone: FileText,
  },
  {
    titulo: "Serviço e ordem de serviço",
    descricao:
      "A OS registra o que foi executado e as peças usadas, e entra no histórico do equipamento.",
    icone: Wrench,
  },
];

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <Secao fundo="afundada" espaco="lg" separador id="como-funciona">
      <TituloSecao
        sobretitulo="Assistência técnica"
        titulo="Do chamado ao equipamento funcionando"
        descricao="O atendimento tem etapas definidas e você acompanha cada uma delas. Nada é executado sem a sua aprovação registrada."
        className="mb-12"
      />

      <PassosNumerados
        passos={ETAPAS}
        disposicao="fileira"
        rotulo="Etapas do atendimento técnico"
      />

      <div className="mt-14 flex flex-col gap-6 rounded-2xl border border-graf-200 bg-white p-6 shadow-card sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-title text-graf-950">Seu equipamento parou?</h3>
          <p className="mt-2.5 text-base leading-relaxed text-graf-600">
            Abra o chamado agora — ou fale com a equipe antes de decidir.
            {s.horario.trim() ? (
              <>
                {" "}
                Atendimento:{" "}
                <span className="font-semibold text-graf-800">{s.horario}</span>.
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">
          <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
            <Wrench className="size-4 shrink-0" aria-hidden />
            Solicitar assistência
          </LinkBotao>
          {whatsapp ? (
            <LinkBotao
              href={whatsappHref(
                whatsapp,
                "Olá! Preciso de assistência técnica para um equipamento odontológico.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              variante="secundario"
              tamanho="lg"
            >
              Falar no WhatsApp
            </LinkBotao>
          ) : null}
        </div>
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-600">
        <CalendarClock className="size-4 shrink-0 text-graf-400" aria-hidden />
        Quer evitar a parada?
        <Link
          href="/manutencao-preventiva"
          className="inline-flex min-h-11 items-center gap-1 font-bold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          Conheça a manutenção preventiva
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </p>
    </Secao>
  );
}
