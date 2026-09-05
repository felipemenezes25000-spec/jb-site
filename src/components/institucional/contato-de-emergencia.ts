/**
 * Contato para as telas de erro.
 *
 * As telas `error.tsx` e `global-error.tsx` são Client Components e são
 * exibidas justamente quando alguma coisa quebrou — inclusive, possivelmente,
 * o banco de dados. Elas não podem chamar `getSettings()`: o módulo
 * `@/lib/settings` carrega o Prisma, que não existe no navegador, e uma tela
 * de erro que depende do banco é uma tela de erro que também falha.
 *
 * Por isso estes valores são repetidos aqui. São os mesmos de
 * `SETTING_DEFAULTS` em `@/lib/settings` — dados reais da JB, não inventados.
 * Se o telefone da empresa mudar de verdade, os dois lugares precisam ser
 * atualizados juntos; o painel cobre o site inteiro, menos estas duas telas.
 */
export const CONTATO_DE_EMERGENCIA = {
  empresa: "JB Soluções Odontológicas",
  telefone: "(11) 3715-6362",
  whatsapp: "(11) 96341-7994",
  email: "comercial@jbsolucoesodontologicas.com.br",
} as const;
