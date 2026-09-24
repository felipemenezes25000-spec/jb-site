import type { Pergunta } from "@/lib/paginas-equipamento";

/* ============================================================================
   Infraestrutura hidráulica e de esgoto: a regra comercial

   A JB prepara e executa a estrutura hidráulica e de esgoto que o consultório
   e os equipamentos precisam. A ordem é do dono e não se negocia no site:
   contato → visita técnica no local → levantamento → orçamento. Nada de
   preço, prazo ou escopo fechado a distância.

   Módulo puro: a seção da home, as dúvidas e os testes leem daqui.
   ============================================================================ */

/** A mensagem que a pessoa revisa e envia no WhatsApp. */
export const MENSAGEM_VISITA_TECNICA =
  "Olá, JB! Vim pelo site e preciso de uma visita técnica para avaliar a infraestrutura hidráulica e de esgoto do consultório. Entendi que o orçamento é preparado após a avaliação no local.";

/** A mesma regra nas dúvidas da home (e no FAQ estruturado do buscador). */
export const PERGUNTA_DE_INFRAESTRUTURA: Pergunta = {
  pergunta: "A JB faz a parte hidráulica e de esgoto do consultório?",
  resposta:
    "Sim. A JB prepara e executa a estrutura hidráulica e de esgoto necessária para instalar ou adequar consultórios e equipamentos odontológicos. Como cada espaço é diferente, a equipe primeiro faz a visita técnica ao local e o levantamento; o orçamento vem depois disso, sem preço fechado a distância.",
};

/** Quando o serviço costuma entrar. Contexto, não promessa de escopo. */
export const SITUACOES_DE_INFRAESTRUTURA = [
  "Consultório novo",
  "Adequação ou reforma",
  "Instalação de equipamento",
] as const;

/** As etapas, na ordem da regra. A última é sempre o orçamento. */
export const ETAPAS_DE_INFRAESTRUTURA = [
  {
    titulo: "Você chama a JB",
    texto: "Pelo WhatsApp, com Jeferson ou Jackson, contando o que o consultório precisa.",
  },
  {
    titulo: "Visita técnica no local",
    texto: "A equipe vai até o consultório para ver o espaço e os pontos de água e esgoto.",
  },
  {
    titulo: "Levantamento",
    texto: "Fica definido o que precisa ser preparado ou executado na hidráulica e no esgoto.",
  },
  {
    titulo: "Orçamento depois da vistoria",
    texto: "Com o levantamento em mãos, a JB prepara o orçamento da execução.",
  },
] as const;
