import { ClipboardCheck, MessageCircleMore, ShieldCheck, Wrench } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Como funciona

   O processo vira uma história visual: quatro cartões numerados, com leitura
   simples no celular e coluna editorial no desktop. A copy separa triagem de
   diagnóstico: o WhatsApp organiza contexto, a avaliação técnica confirma a
   causa, o orçamento vem antes de troca de peça e o serviço termina testado.
   ============================================================================ */

const PASSOS = [
  {
    etapa: "01",
    icone: MessageCircleMore,
    titulo: "Você chama no WhatsApp",
    texto: "Diga o equipamento e o sintoma. Foto ou vídeo ajudam a registrar o contexto antes da avaliação.",
  },
  {
    etapa: "02",
    icone: ClipboardCheck,
    titulo: "A equipe organiza a triagem",
    texto: "Marca, modelo, sintoma e situação da clínica orientam qual é o próximo passo e onde a avaliação pode acontecer.",
  },
  {
    etapa: "03",
    icone: ShieldCheck,
    titulo: "Avaliação e orçamento",
    texto: "A causa é confirmada na avaliação técnica. Quando houver troca de peça, o orçamento vem antes da substituição.",
  },
  {
    etapa: "04",
    icone: Wrench,
    titulo: "Serviço, teste e registro",
    texto: "Depois da intervenção, o que foi executado e testado fica registrado no histórico do equipamento.",
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
      className="jb-processo-premium scroll-mt-20 py-16 md:py-24 lg:py-28"
    >
      <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
        <div className="lg:sticky lg:top-28 lg:h-max">
          <div className="jb-processo-intro">
            <p className="sobretitulo jb-revela">Fluxo do atendimento</p>
            <h2 id="como-funciona-titulo" className="text-section texto-forte jb-revela mt-3">
              Do primeiro &ldquo;oi&rdquo; ao serviço <span className="text-jb-600">registrado e testado.</span>
            </h2>
            <p
              className="texto-guia jb-revela mt-5 max-w-md text-graf-600"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Você entende o próximo passo antes de ele acontecer. Sem formulário comprido e sem
              cadastro para começar a triagem.
            </p>

            <div className="jb-revela mt-7 border-t border-graf-200 pt-6" style={{ "--i": 2 } as React.CSSProperties}>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-graf-500">
                Comece por aqui
              </p>
              <OpcoesWhatsapp
                contatos={contatos}
                mensagem={mensagem}
                equipamento={equipamento}
                posicao="secao"
              />
            </div>
          </div>
        </div>

        <ol className="grid gap-3 sm:gap-4" aria-label="Passos do atendimento">
          {PASSOS.map((passo, indice) => (
            <li
              key={passo.titulo}
              className="jb-fluxo-passo jb-revela"
              style={{ "--i": indice % 3 } as React.CSSProperties}
            >
              <span className="jb-ponto-acende z-10 flex size-12 items-center justify-center rounded-full border-2 border-jb-500 bg-jb-500 text-white shadow-card">
                <passo.icone className="size-5" aria-hidden />
              </span>
              <div className="relative z-[1] max-w-xl">
                <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-jb-700">
                  Etapa {passo.etapa}
                </p>
                <h3 className="text-bloco texto-forte mt-2">{passo.titulo}</h3>
                <p className="mt-2 text-corpo leading-relaxed text-graf-600">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
