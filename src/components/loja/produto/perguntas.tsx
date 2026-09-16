import { Acordeao } from "@/components/ui/acordeao";

/* ============================================================================
   Dúvidas sobre este equipamento

   As perguntas publicadas para este produto, em `<details>`/`<summary>`: sem
   JavaScript no cliente, com teclado e com busca do navegador funcionando
   dentro da resposta fechada.
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
      itens={perguntas.map((item, indice) => ({
        titulo: item.pergunta,
        resposta: <p className="whitespace-pre-line">{item.resposta}</p>,
        aberto: indice === 0,
      }))}
    />
  );
}
