import { Acordeao } from "@/components/ui/acordeao";
import { JsonLd, faqJsonLd } from "@/lib/seo";

/* ============================================================================
   Dúvidas antes de chamar

   Só o que a JB já pratica e já diz em outras partes do site: atendimento na
   clínica ou na bancada, orçamento antes da troca, outras marcas com triagem,
   horário. Nada de prazo de chegada, preço de visita ou garantia em meses:
   isso depende da operação real e entra quando a JB confirmar.

   As perguntas saem também como dados estruturados, que é o que faz o Google
   mostrar as respostas direto no resultado de busca.
   ============================================================================ */

export function Duvidas({ cidade, horario }: { cidade: string; horario: string }) {
  const perguntas = [
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
      pergunta: "Vocês são assistência autorizada?",
      resposta:
        "Sim. A JB é assistência técnica autorizada EVOXX e está na lista oficial do fabricante. Também atendemos outras marcas, confirmando o modelo na triagem.",
    },
    {
      pergunta: "Como explico o problema?",
      resposta:
        "Pelo WhatsApp mesmo. Diga o equipamento e o que ele está fazendo. Uma foto do painel, do erro ou um vídeo curto do barulho ajudam a equipe a entender mais rápido.",
    },
    {
      pergunta: "Qual o horário de atendimento?",
      resposta: `${horario}. Fora desse horário, deixe sua mensagem no WhatsApp: ela fica na fila e é respondida no próximo expediente.`,
    },
    {
      pergunta: "Preciso fazer cadastro ou abrir chamado no site?",
      resposta:
        "Não. É só chamar no WhatsApp. A equipe registra o atendimento do lado de cá, com o histórico do seu equipamento.",
    },
  ];

  return (
    <section id="duvidas" aria-labelledby="duvidas-titulo" className="scroll-mt-20 bg-surface-muted py-16 md:py-24">
      <JsonLd dados={faqJsonLd(perguntas)} />
      <div className="container-estreito">
        <h2 id="duvidas-titulo" className="text-section texto-forte jb-revela">
          Dúvidas antes de chamar
        </h2>
        <div className="jb-revela mt-8" style={{ "--i": 1 } as React.CSSProperties}>
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
