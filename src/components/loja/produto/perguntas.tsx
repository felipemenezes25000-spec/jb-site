import { BadgeCheck } from "lucide-react";

import { Acordeao } from "@/components/ui/acordeao";

/* ============================================================================
   Dúvidas sobre este equipamento

   As perguntas publicadas para este produto, em `<details>`/`<summary>`: sem
   JavaScript no cliente, com teclado e com busca do navegador funcionando
   dentro da resposta fechada.

   Nenhuma resposta começa aberta. A seção funciona como consulta: o título da
   pergunta já é o índice e o comprador abre apenas o assunto que interessa.
   Como estas respostas são conteúdo oficial cadastrado pela JB, a autoria fica
   explícita — não são depoimentos nem respostas anônimas de marketplace.
   ============================================================================ */

export type PerguntaDoProduto = {
  id: string;
  pergunta: string;
  resposta: string;
};

export function PerguntasDoProduto({ perguntas }: { perguntas: PerguntaDoProduto[] }) {
  if (perguntas.length === 0) return null;

  return (
    <Acordeao
      nome="duvidas-do-equipamento"
      itens={perguntas.map((item) => ({
        titulo: item.pergunta,
        resposta: (
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.065em] text-jb-700">
              <BadgeCheck className="size-3.5" aria-hidden />
              Respondido pela equipe técnica JB
            </p>
            <p className="whitespace-pre-line">{item.resposta}</p>
          </div>
        ),
      }))}
    />
  );
}
