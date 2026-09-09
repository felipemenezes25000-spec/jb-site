import { Acordeao } from "@/components/ui/acordeao";

/* ============================================================================
   Dúvidas sobre este equipamento

   As perguntas publicadas para este produto, em `<details>`/`<summary>`: sem
   JavaScript no cliente, com teclado e com busca do navegador funcionando
   dentro da resposta fechada.

   Nenhuma resposta começa aberta. A seção funciona como consulta: o título da
   pergunta já é o índice e o comprador abre apenas o assunto que interessa,
   sem ganhar uma resposta longa empurrando o restante da PDP para baixo.
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
        resposta: <p className="whitespace-pre-line">{item.resposta}</p>,
      }))}
    />
  );
}
