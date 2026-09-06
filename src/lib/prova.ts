/* ============================================================================
   Quando um número vira prova

   Regra única para as duas telas que exibem contagem como argumento de
   confiança: a faixa de provas da home e a faixa de estatísticas do Sobre.
   Antes, cada uma decidia sozinha — a home escondia a contagem pequena e o
   Sobre publicava "3 serviços no catálogo" como se fosse autoridade.

   O critério não é estético. Uma contagem baixa é um número verdadeiro que
   trabalha contra quem o publica: "7 equipamentos no catálogo" é lido como
   confissão de vitrine vazia, não como prova. Esconder não é mentir —
   inventar seria. Abaixo do limite, a tela diz outra coisa verdadeira, ou não
   diz nada.

   Este módulo é propositalmente puro (sem `server-only`, sem Prisma) para
   poder ser testado sem banco e usado dos dois lados.
   ============================================================================ */

/**
 * Limites por tipo de contagem.
 *
 * São convenções de produto, não medições — e estão declaradas aqui em vez de
 * espalhadas em constantes locais justamente para poderem ser discutidas e
 * mudadas num lugar só.
 *
 * `equipamentos` é mais alto porque catálogo é o argumento mais fácil de
 * comparar com concorrente; `marcas` e `servicos` convencem com menos, porque
 * o leitor não tem referência do que seria "muitas".
 */
export const MINIMO_PARA_PROVAR = {
  equipamentos: 24,
  marcas: 6,
  servicos: 6,
} as const;

export type TipoDeContagem = keyof typeof MINIMO_PARA_PROVAR;

/**
 * A contagem sustenta um argumento comercial?
 *
 * Contagem não finita, negativa ou abaixo do limite devolve `false`. Quem
 * chama precisa ter um caminho alternativo verdadeiro para esse caso — não um
 * traço nem um zero.
 */
export function contagemProva(tipo: TipoDeContagem, quantidade: number): boolean {
  if (!Number.isFinite(quantidade)) return false;
  return Math.trunc(quantidade) >= MINIMO_PARA_PROVAR[tipo];
}
