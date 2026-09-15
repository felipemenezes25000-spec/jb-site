import { CardProduto, type ProdutoCard, type Parcelamento } from "@/components/loja/card-produto";
import { TrilhoOuGrade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { cn } from "@/lib/utils";

/* ============================================================================
   A grade da vitrine

   O CARTÃO daqui não existe mais. Este arquivo tinha um componente inteiro —
   `CardVitrine` — que a própria documentação dele abria dizendo "o mesmo dado
   do `CardProduto`, com a apresentação da vitrine". Era verdade, e era o
   problema: as duas apresentações divergiram em frase, em tarja e em botão,
   não em desenho. Ver a nota em `card-produto.tsx`.

   O que sobra aqui é o que é só desta faixa: a grade que vira trilho.
   ============================================================================ */

/* Fecha a fileira pela quantidade, como a do catálogo — e, abaixo de `sm`,
   deixa de ser grade.

   Em coluna única de 390px cada cartão mede ~430px de altura. Quatro deles,
   numa faixa só, são 1.720px de rolagem para mostrar quatro equipamentos; a
   home tem quatro dessas faixas, e o total passava de 18.000px. Quem chega
   pelo celular desiste antes de ver a assistência técnica, que é o argumento
   comercial da JB.

   `TrilhoOuGrade` existia no sistema para exatamente isto, escrito e
   documentado, e nenhuma tela o usava. No trilho o cartão continua largo, a
   foto continua grande, e o pedaço do próximo cartão aparecendo na borda é o
   convite para arrastar. É rolagem nativa com encaixe: sem biblioteca, sem
   botão, sem estado, e o foco do teclado leva o trilho junto.
   ============================================================================ */
export function GradeVitrine({
  produtos,
  colunas,
  parcelamento,
  extra,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  extra?: React.ReactNode;
  className?: string;
}) {
  const teto = colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 };
  const celulas = produtos.length + (extra ? 1 : 0);

  /* Coleção curta não vira cartaz.

     `colunasAte` fecha a fileira quando há menos itens que colunas — sem ele,
     um seminovo só numa grade de quatro deixa um cartão e três buracos. Só
     que fechar a fileira em UMA coluna faz o cartão ocupar os 1600px da
     faixa: a foto do equipamento vai para o centro de um retângulo de tela
     inteira e o preço fica sozinho a meio metro do nome. Foi o que a home
     mostrou no dia em que o catálogo tinha um seminovo publicado.

     O teto por célula devolve a proporção de cartão. A fileira continua
     fechada, alinhada à esquerda, e quem olha entende que há um item — não
     que o desenho quebrou. */
  const alvo = teto.xl ?? teto.lg ?? teto.sm ?? teto.base ?? 1;

  return (
    <TrilhoOuGrade
      como="ul"
      espaco="sm"
      colunas={colunasAte(celulas, teto)}
      className={cn(celulas < alvo && "sm:[&>li]:max-w-[24rem]", className)}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardProduto
            produto={produto}
            variante="trilho"
            parcelamento={parcelamento}
            prioridade={indice < 4}
            className="w-full"
          />
        </li>
      ))}
      {extra ? <li className="flex">{extra}</li> : null}
    </TrilhoOuGrade>
  );
}
