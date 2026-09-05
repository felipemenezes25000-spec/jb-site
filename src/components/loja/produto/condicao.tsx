import type { Tom } from "@/components/ui/data";

/* ============================================================================
   Condição do equipamento

   Novo, seminovo, usado e recondicionado não podem sair na tela como quatro
   etiquetas cinzas iguais: quem compra um equipamento de dezenas de milhares
   de reais decide justamente por aí. Cada condição tem rótulo, tom e um
   desenho próprio para o bloco da unidade física.

   A frase que explica a condição só existe quando há prova no banco — laudo de
   inspeção ou nota de conservação daquela unidade. Sem prova, sai só a
   etiqueta: melhor dizer menos do que prometer revisão que ninguém registrou.
   ============================================================================ */

export type CondicaoProduto = "novo" | "seminovo" | "usado" | "recondicionado";

export type DesenhoCondicao = {
  rotulo: string;
  tom: Tom;
  /** Fundo do cabeçalho do bloco da unidade física. */
  faixa: string;
  /** Selo quadrado que abre esse cabeçalho. */
  selo: string;
};

export const CONDICAO_PDP: Record<CondicaoProduto, DesenhoCondicao> = {
  novo: {
    rotulo: "Novo",
    tom: "neutro",
    faixa: "bg-graf-50",
    selo: "bg-graf-800 text-white",
  },
  seminovo: {
    rotulo: "Seminovo JB",
    tom: "marca",
    faixa: "bg-jb-50/60",
    selo: "bg-jb-500 text-white",
  },
  usado: {
    rotulo: "Usado",
    tom: "neutro",
    faixa: "bg-graf-50",
    selo: "bg-graf-700 text-white",
  },
  recondicionado: {
    rotulo: "Recondicionado JB",
    tom: "alerta",
    faixa: "bg-jb-50/60",
    selo: "bg-jb-600 text-white",
  },
};

/**
 * A linha que explica a condição, quando existe dado que a sustente.
 *
 * `null` quer dizer: não há laudo nem nota de conservação cadastrada, então a
 * página não afirma nada sobre revisão — mostra apenas a etiqueta.
 */
export function definicaoDaCondicao(
  condicao: CondicaoProduto,
  provas: { itensDeChecklist: number; temNotasDeEstado: boolean },
): string | null {
  const temLaudo = provas.itensDeChecklist > 0;

  switch (condicao) {
    case "novo":
      // A etiqueta já diz "Novo". Repetir em prosa só empurra o preço para baixo.
      return null;
    case "seminovo":
      if (temLaudo) {
        return "Unidade usada que passou pela bancada da JB. O laudo de inspeção desta unidade está mais abaixo.";
      }
      return provas.temNotasDeEstado
        ? "Unidade usada. O estado de conservação registrado pela equipe está mais abaixo."
        : null;
    case "recondicionado":
      if (temLaudo) {
        return "Unidade recondicionada pela equipe técnica da JB. O que foi verificado e o que foi trocado está mais abaixo.";
      }
      return provas.temNotasDeEstado
        ? "Unidade recondicionada pela equipe técnica da JB. O estado registrado está mais abaixo."
        : null;
    case "usado":
      return provas.temNotasDeEstado || temLaudo
        ? "Unidade usada. O estado de conservação registrado pela equipe está mais abaixo."
        : null;
  }
}
