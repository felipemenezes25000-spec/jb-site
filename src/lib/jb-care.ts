/* ============================================================================
   JB Care — o nome do pacote de serviços da compra

   Instalação, preventiva e orientação já existiam como adicionais de pedido
   (`ProductAddon`), cada um com preço próprio e execução pela equipe da JB. O
   que não existia era o NOME: três caixas de seleção soltas ao lado do botão
   de compra não comunicam que aquilo é o diferencial da empresa — parecem
   taxa extra.

   Este arquivo existe para que o nome seja uma decisão de uma linha. "JB Care"
   é nome de trabalho: se a JB escolher outro, muda-se aqui e o site inteiro
   acompanha, incluindo textos de apoio. Nenhum componente escreve o nome
   diretamente.

   O que este arquivo NÃO faz: inventar cobertura, prazo ou garantia. O pacote
   é exatamente a soma dos adicionais que a JB cadastrou naquele equipamento —
   nem um item a mais.
   ============================================================================ */

export const JB_CARE = {
  /** Como o pacote aparece na tela. */
  nome: "JB Care",

  /** Uma frase: o que a pessoa ganha ao marcar. */
  resumo:
    "Os serviços da equipe da JB no mesmo pedido do equipamento: quem vende é quem instala e continua atendendo.",

  /** Rótulo da alternativa sem serviço nenhum. */
  rotuloSemPacote: "Só o equipamento",

  /** Rótulo da alternativa com o pacote. */
  rotuloComPacote: "Equipamento + JB Care",

  /** Explica a alternativa sem pacote, sem desencorajar quem a escolher. */
  descricaoSemPacote:
    "O equipamento com a garantia dele. Você pode contratar os serviços depois, quando precisar.",
} as const;
