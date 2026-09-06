import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, MessageSquareText, Stethoscope, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Assistência técnica

   O fluxo é apresentado como uma linha de processo curta. A versão anterior
   tinha cinco blocos extensos e parecia documentação; aqui o visitante entende
   o caminho em poucos segundos e decide se quer abrir o chamado.
   ============================================================================ */

const ETAPAS = [
  {
    numero: "01",
    titulo: "Abra o chamado",
    descricao: "Descreva o defeito e anexe foto ou vídeo quando ajudar.",
    icone: MessageSquareText,
  },
  {
    numero: "02",
    titulo: "Triagem e diagnóstico",
    descricao: "A equipe técnica define o caminho do atendimento e a avaliação.",
    icone: Stethoscope,
  },
  {
    numero: "03",
    titulo: "Aprove o orçamento",
    descricao: "Peças e mão de obra ficam discriminadas antes do serviço seguir.",
    icone: FileText,
  },
  {
    numero: "04",
    titulo: "Serviço + histórico",
    descricao: "A OS registra o que foi executado e entra na ficha do equipamento.",
    icone: ClipboardCheck,
  },
];

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <Secao fundo="clara" espaco="xl" separador id="como-funciona">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:items-start xl:gap-14">
        <div className="xl:sticky xl:top-28">
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

          {s.horario.trim() ? (
            <p className="mt-5 text-sm text-graf-500">Atendimento: {s.horario}.</p>
          ) : null}
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {ETAPAS.map((etapa, indice) => {
            const Icone = etapa.icone;
            return (
              <li
                key={etapa.numero}
                className="group relative min-h-60 overflow-hidden rounded-2xl border border-graf-200 bg-white p-6 shadow-card transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-graf-300 hover:shadow-raised sm:p-7"
              >
                <span className="absolute right-5 top-4 text-[4rem] font-black leading-none tracking-[-0.08em] text-graf-100" aria-hidden>
                  {etapa.numero}
                </span>
                <span className="relative flex size-11 items-center justify-center rounded-xl bg-jb-50 text-jb-600" aria-hidden>
                  <Icone className="size-5" />
                </span>
                <p className="relative mt-7 text-xs font-extrabold uppercase tracking-[0.12em] text-graf-500">Etapa {indice + 1}</p>
                <h3 className="relative mt-2 text-xl font-extrabold leading-snug text-graf-950">{etapa.titulo}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-graf-600">{etapa.descricao}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-graf-200 pt-6 text-sm text-graf-600">
        <span>Quer reduzir a chance de parada?</span>
        <Link
          href="/manutencao-preventiva"
          className="inline-flex min-h-11 items-center gap-1 font-extrabold text-jb-700 underline-offset-4 hover:underline"
        >
          Conheça a manutenção preventiva
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Secao>
  );
}
