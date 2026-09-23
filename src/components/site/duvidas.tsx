import { MessageCircleQuestion, ShieldCheck } from "lucide-react";

import { Acordeao } from "@/components/ui/acordeao";
import { JsonLd, faqJsonLd } from "@/lib/seo";

/* ============================================================================
   Dúvidas antes de chamar

   Só o que a JB já pratica e já diz em outras partes do site. A composição
   vira uma área de decisão: contexto à esquerda e respostas à direita no
   desktop; no mobile, tudo segue numa coluna curta e legível.
   ============================================================================ */

export function Duvidas({
  cidade,
  horario,
  extras = [],
}: {
  cidade: string;
  horario: string;
  /** Perguntas de um equipamento, que vêm antes das gerais. */
  extras?: readonly { pergunta: string; resposta: string }[];
}) {
  const perguntas = [
    ...extras,
    {
      pergunta: "Vocês atendem na minha clínica?",
      resposta: `Sim, em ${cidade} e região. Quando o conserto pede bancada, o equipamento vai para a JB e volta testado. A forma de atendimento é combinada na triagem pelo WhatsApp.`,
    },
    {
      pergunta: "Quanto custa o conserto?",
      resposta:
        "Depende do defeito e da peça. Por isso existe a triagem: você recebe o orçamento e aprova antes de qualquer troca. Sem surpresa na conta.",
    },
    {
      pergunta: "Vocês atendem todas as marcas?",
      resposta:
        "Sim. A JB conserta equipamentos odontológicos de todas as marcas. Modelo e sintoma entram na triagem quando a clínica os informa. A JB também é assistência técnica autorizada EVOXX, na lista oficial do fabricante.",
    },
    {
      pergunta: "Como explico o problema?",
      resposta:
        "Pelo WhatsApp mesmo. Diga o equipamento e o que ele está fazendo. Uma foto do painel, do erro ou um vídeo curto do barulho ajudam a equipe a entender o sintoma antes de definir o próximo passo.",
    },
    {
      pergunta: "Qual o horário de atendimento?",
      resposta: `${horario}. Fora desse horário, você pode deixar a mensagem no WhatsApp para a equipe visualizar no próximo expediente.`,
    },
    {
      pergunta: "Preciso fazer cadastro ou abrir chamado no site?",
      resposta:
        "Não. É só chamar no WhatsApp. A equipe registra o atendimento do lado de cá, com o histórico do seu equipamento.",
    },
  ];

  return (
    <section
      id="duvidas"
      aria-labelledby="duvidas-titulo"
      className="jb-faq-premium scroll-mt-20 py-16 md:py-24 lg:py-28"
    >
      <JsonLd dados={faqJsonLd(perguntas)} />
      <div className="container-jb grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <div className="lg:sticky lg:top-28 lg:h-max">
          <div className="jb-faq-intro">
            <p className="sobretitulo jb-revela">Antes de chamar</p>
            <h2 id="duvidas-titulo" className="text-section texto-forte jb-revela mt-3">
              Dúvidas que normalmente vêm <span className="text-jb-600">antes do WhatsApp.</span>
            </h2>
            <p
              className="texto-guia jb-revela mt-5 text-graf-600"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Atendimento, orçamento, marcas, horário e como explicar o defeito — tudo direto,
              sem esconder a próxima etapa.
            </p>

            <div
              className="jb-revela mt-6 flex gap-3 rounded-xl border border-graf-200 bg-white/80 p-4"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-extrabold text-graf-900">Sem promessa escondida</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-graf-600">
                  O site não inventa prazo, preço de visita ou garantia fixa para fechar a conversa.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="jb-faq-lista jb-revela" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="mb-1 flex items-center gap-2 px-3 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-graf-500 sm:px-4">
            <MessageCircleQuestion className="size-4 text-jb-600" aria-hidden />
            Perguntas frequentes
          </div>
          <Acordeao
            nome="duvidas"
            itens={perguntas.map((item, indice) => ({
              titulo: item.pergunta,
              resposta: <p>{item.resposta}</p>,
              aberto: indice === 0,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
