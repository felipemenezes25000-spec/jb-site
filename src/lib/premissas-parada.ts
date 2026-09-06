/* ============================================================================
   Passagem das premissas da calculadora para o formulário de proposta

   Um módulo de uma constante, e ele existe por um motivo: a chave é escrita
   por um componente e lida por outro, em páginas diferentes. Repetida à mão
   nos dois lados, a primeira renomeação quebraria a passagem em silêncio — o
   formulário simplesmente não encontraria nada, e ninguém veria erro nenhum.

   O transporte é `sessionStorage`, nunca parâmetro de URL. Faturamento de
   clínica em link vaza para histórico do navegador, cabeçalho `Referer` e
   qualquer analytics que registre o caminho da página. Em `sessionStorage` o
   dado fica nesta aba e só chega à JB quando a pessoa envia o formulário.
   ============================================================================ */

export const CHAVE_PREMISSAS_PARADA = "jb:premissas-parada";
