import { Check, ClipboardCheck, MapPin, MessageCircle, Ruler } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import type { Pergunta } from "@/lib/paginas-equipamento";

/* ============================================================================
   Infraestrutura hidráulica e de esgoto

   Serviço técnico complementar à manutenção: a JB prepara e executa a rede
   hidráulica e de esgoto que o consultório e os equipamentos precisam. A
   regra comercial é a do dono, e aparece duas vezes de propósito (no aviso e
   na última etapa): primeiro a visita ao local, depois o levantamento, e só
   então o orçamento. Nada de preço, prazo ou escopo fechado a distância.
   ============================================================================ */

export const MENSAGEM_VISITA_TECNICA =
  "Olá, JB! Vim pelo site e preciso de uma visita técnica para avaliar a infraestrutura hidráulica e de esgoto do consultório. Entendi que o orçamento é preparado após a avaliação no local.";

/** A mesma regra nas dúvidas da home (e no FAQ estruturado do buscador). */
export const PERGUNTA_DE_INFRAESTRUTURA: Pergunta = {
  pergunta: "A JB faz a parte hidráulica e de esgoto do consultório?",
  resposta:
    "Sim. A JB prepara e executa a estrutura hidráulica e de esgoto necessária para instalar ou adequar consultórios e equipamentos odontológicos. Como cada espaço é diferente, a equipe primeiro faz a visita técnica ao local e o levantamento; o orçamento vem depois disso, sem preço fechado a distância.",
};

/** Quando o serviço costuma entrar. Contexto, não promessa de escopo. */
const SITUACOES = ["Consultório novo", "Adequação ou reforma", "Instalação de equipamento"] as const;

const ETAPAS = [
  {
    icone: MessageCircle,
    titulo: "Você chama a JB",
    texto: "Pelo WhatsApp, com Jeferson ou Jackson, contando o que o consultório precisa.",
  },
  {
    icone: MapPin,
    titulo: "Visita técnica no local",
    texto: "A equipe vai até o consultório para ver o espaço e os pontos de água e esgoto.",
  },
  {
    icone: Ruler,
    titulo: "Levantamento",
    texto: "Fica definido o que precisa ser preparado ou executado na hidráulica e no esgoto.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Orçamento depois da vistoria",
    texto: "Com o levantamento em mãos, a JB prepara o orçamento da execução.",
  },
] as const;

export function InfraestruturaClinica({ contatos }: { contatos: ContatoWhatsapp[] }) {
  return (
    <section
      id="infraestrutura"
      aria-labelledby="infraestrutura-titulo"
      className="jb-infra relative scroll-mt-20 overflow-clip border-y border-graf-200 bg-surface-muted py-16 md:py-24"
    >
      <span aria-hidden className="jb-infra-malha pointer-events-none absolute inset-0" />

      <div className="container-jb relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:items-center lg:gap-16 xl:gap-24">
        <div>
          <p className="sobretitulo jb-revela">Serviço técnico complementar</p>
          <h2 id="infraestrutura-titulo" className="text-section texto-forte jb-revela mt-3 max-w-2xl">
            Infraestrutura hidráulica e de esgoto <span className="text-jb-600">para o consultório.</span>
          </h2>
          <p
            className="texto-guia jb-revela mt-5 max-w-xl text-graf-600"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Além da manutenção dos equipamentos, a JB prepara e executa a estrutura hidráulica e de
            esgoto necessária para instalar ou adequar o consultório.
          </p>

          <ul
            className="jb-revela mt-6 flex flex-wrap gap-2"
            style={{ "--i": 2 } as React.CSSProperties}
            aria-label="Quando o serviço entra"
          >
            {SITUACOES.map((situacao) => (
              <li key={situacao} className="jb-infra-situacao">
                <Check className="size-4 text-jb-600" aria-hidden />
                {situacao}
              </li>
            ))}
          </ul>

          <div className="jb-infra-regra jb-revela mt-7 max-w-xl" style={{ "--i": 3 } as React.CSSProperties}>
            <span className="jb-infra-regra-icone" aria-hidden>
              <ClipboardCheck className="size-5" />
            </span>
            <p>
              <strong className="block text-graf-950">Orçamento só depois da visita técnica.</strong>
              <span className="mt-1 block text-graf-600">
                Cada espaço é diferente: não há preço online nem valor fechado a distância.
              </span>
            </p>
          </div>
        </div>

        <div className="jb-infra-cartao jb-revela" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-700">Do contato ao orçamento</p>
          <ol className="jb-infra-etapas mt-5" aria-label="Etapas até o orçamento de infraestrutura">
            {ETAPAS.map(({ icone: Icone, titulo, texto }, indice) => (
              <li key={titulo} className="jb-infra-etapa" data-ultima={indice === ETAPAS.length - 1 || undefined}>
                <span className="jb-infra-etapa-icone" aria-hidden>
                  <Icone className="size-[1.15rem]" />
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-graf-950">
                    <span className="sr-only">Etapa {indice + 1}: </span>
                    {titulo}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-graf-600">{texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-graf-200 pt-5">
            <p className="mb-3 text-sm font-bold text-graf-800">Solicitar visita técnica</p>
            <OpcoesWhatsapp contatos={contatos} mensagem={MENSAGEM_VISITA_TECNICA} posicao="secao" lado />
          </div>
        </div>
      </div>
    </section>
  );
}
