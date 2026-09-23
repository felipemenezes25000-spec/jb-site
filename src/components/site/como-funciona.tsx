import { ClipboardCheck, MessageCircleMore, ShieldCheck, Wrench } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Como funciona

   Quatro passos numa linha vertical que se enche conforme a pessoa rola, e
   cada círculo acende quando o passo chega ao meio da tela. Tudo por CSS
   (`view-timeline`): sem suporte, a linha aparece cheia e os círculos já
   acesos, e a leitura continua a mesma.

   O primeiro passo é o WhatsApp, e o texto não promete o que o clique não
   garante: chamar não é visita marcada, é o começo da triagem.
   ============================================================================ */

const PASSOS = [
  {
    icone: MessageCircleMore,
    titulo: "Você chama no WhatsApp",
    texto: "Diga o equipamento e o que ele está fazendo. Foto ou vídeo do problema ajudam muito.",
  },
  {
    icone: ClipboardCheck,
    titulo: "A equipe faz a triagem",
    texto: "Entendemos o defeito, tiramos dúvidas e combinamos o atendimento na clínica ou na bancada.",
  },
  {
    icone: ShieldCheck,
    titulo: "Orçamento antes de mexer",
    texto: "Você aprova o valor antes de qualquer troca de peça. Sem surpresa na conta.",
  },
  {
    icone: Wrench,
    titulo: "Conserto e teste final",
    texto: "O equipamento volta testado, e o que foi feito fica registrado para o próximo atendimento.",
  },
] as const;

export function ComoFunciona({
  contatos,
  mensagem = MENSAGEM_PADRAO,
  equipamento,
}: {
  contatos: ContatoWhatsapp[];
  /** Nas páginas de equipamento, a mensagem já diz qual é. */
  mensagem?: string;
  equipamento?: string;
}) {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="scroll-mt-20 bg-white py-16 md:py-24"
    >
      <div className="container-jb grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:h-max">
          <h2 id="como-funciona-titulo" className="text-section texto-forte jb-revela">
            Do primeiro &ldquo;oi&rdquo; ao equipamento <span className="text-jb-600">funcionando</span>.
          </h2>
          <p className="texto-guia jb-revela mt-5 max-w-md text-graf-600" style={{ "--i": 1 } as React.CSSProperties}>
            Sem formulário comprido, sem cadastro e sem espera para saber o que vai acontecer.
          </p>
          <div className="jb-revela mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao="secao"
            />
          </div>
        </div>

        <ol className="jb-timeline-como-funciona relative" aria-label="Passos do atendimento">
          <span aria-hidden className="absolute bottom-6 left-6 top-6 w-0.5 bg-graf-200" />
          <span aria-hidden className="jb-linha-enche absolute bottom-6 left-6 top-6 w-0.5 bg-jb-500" />

          {PASSOS.map((passo, indice) => (
            <li
              key={passo.titulo}
              className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 pb-12 last:pb-0 sm:gap-x-7"
            >
              <span className="jb-ponto-acende relative z-10 flex size-12 items-center justify-center rounded-full border-2 border-jb-500 bg-jb-500 text-white shadow-card">
                <passo.icone className="size-5" aria-hidden />
              </span>
              <div className="jb-revela pt-2.5" style={{ "--i": indice % 2 } as React.CSSProperties}>
                <h3 className="text-bloco texto-forte">{passo.titulo}</h3>
                <p className="mt-2 max-w-lg text-corpo leading-relaxed text-graf-600">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
