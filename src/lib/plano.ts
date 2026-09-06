import type { PlanBillingBasis, Prisma } from "@prisma/client";

/* ============================================================================
   Como o preço de um plano pode ser apresentado

   O problema que este módulo resolve: `priceCents` sozinho não diz o que a
   pessoa paga. R$ 890 por 12 meses pode ser a anuidade de um equipamento, o
   pacote da clínica inteira ou o piso de uma faixa. As três leituras levam a
   decisões de compra diferentes, e a diferença entre elas é dinheiro.

   A regra é conservadora e vale para toda a plataforma: **na dúvida, "Sob
   consulta"**. Um plano cai para consulta sempre que a combinação cadastrada
   não sustenta a frase que seria exibida — sem preço, pacote sem quantidade,
   quantidade sem sentido. Esconder um número ambíguo custa um clique; publicar
   o número errado custa a confiança de quem descobre depois.

   Em particular, "a partir de" só aparece quando existe uma base `a_partir_de`
   cadastrada com preço real. Ele não é um curinga para disfarçar preço
   indefinido — é a afirmação de que existe uma oferta mínima com escopo
   definido, e essa afirmação precisa de alguém que a assuma no cadastro.

   Puro de propósito: sem Prisma, sem `server-only`. A regra é testada sem
   banco e usada por página pública, comparativo, formulário e painel.
   ============================================================================ */

/** O que a tela precisa saber de um plano para falar do preço dele. */
export type BasePlano = {
  priceCents: number | null;
  periodMonths: number;
  billingBasis: PlanBillingBasis;
  coveredEquipment: number | null;
};

export type PrecoDePlano =
  | {
      tipo: "sob_consulta";
      /** Por que não há preço exibido. Vai para a tela, não para o log. */
      explicacao: string;
    }
  | {
      tipo: "valor";
      centavos: number;
      /** "por equipamento", "para até 5 equipamentos", "a partir de". */
      unidade: string;
      /** "por 12 meses de cobertura". */
      periodo: string;
      /** Verdadeiro quando o valor é piso e não preço fechado. */
      aPartirDe: boolean;
    };

/**
 * Período de cobertura em palavras, ou `null` quando ele não está definido.
 *
 * Devolver `null` em vez de cair no padrão de 12 meses é deliberado. O preço
 * de um plano é preço POR um período; sem saber o período, o valor não
 * significa nada. Preencher com "12 meses" porque é o padrão da coluna seria
 * inventar a vigência do contrato — a mesma classe de erro que a base de
 * cobrança veio corrigir, só que na outra metade da frase.
 */
function periodoEmPalavras(meses: number): string | null {
  if (!Number.isFinite(meses)) return null;
  const inteiro = Math.trunc(meses);
  if (inteiro < 1) return null;
  if (inteiro === 1) return "por mês de cobertura";
  return `por ${inteiro} meses de cobertura`;
}

/**
 * Como este plano deve falar do próprio preço.
 *
 * Toda saída que não seja `sob_consulta` é uma afirmação comercial, e cada uma
 * delas exige que o cadastro a sustente:
 *
 *   por_equipamento  preço > 0
 *   pacote           preço > 0 E quantidade coberta >= 1
 *   a_partir_de      preço > 0
 *   sob_consulta     sempre válida — é o estado seguro
 */
export function precoDoPlano(plano: BasePlano): PrecoDePlano {
  const centavos =
    plano.priceCents !== null && Number.isFinite(plano.priceCents)
      ? Math.trunc(plano.priceCents)
      : 0;
  const temPreco = centavos > 0;
  const periodo = periodoEmPalavras(plano.periodMonths);

  if (periodo === null) {
    return {
      tipo: "sob_consulta",
      explicacao: "O período de cobertura deste plano ainda não está definido.",
    };
  }

  if (plano.billingBasis === "sob_consulta") {
    return {
      tipo: "sob_consulta",
      explicacao: "O valor depende dos equipamentos cobertos e das condições do contrato.",
    };
  }

  if (!temPreco) {
    /* Base declarada e preço ausente é cadastro incompleto, não oferta. A tela
       diz "sob consulta" em vez de "R$ 0,00 por equipamento". */
    return {
      tipo: "sob_consulta",
      explicacao: "O valor ainda não está definido para este plano.",
    };
  }

  if (plano.billingBasis === "pacote") {
    const cobertos =
      plano.coveredEquipment !== null && Number.isFinite(plano.coveredEquipment)
        ? Math.trunc(plano.coveredEquipment)
        : 0;

    if (cobertos < 1) {
      /* Pacote sem quantidade é exatamente a ambiguidade que a base de
         cobrança veio resolver. Cair para consulta é o único desfecho
         honesto — inventar "1 equipamento" seria escolher a leitura mais
         barata para a JB. */
      return {
        tipo: "sob_consulta",
        explicacao: "A quantidade de equipamentos coberta por este pacote ainda não foi definida.",
      };
    }

    return {
      tipo: "valor",
      centavos,
      unidade:
        cobertos === 1 ? "para 1 equipamento" : `para até ${cobertos} equipamentos`,
      periodo,
      aPartirDe: false,
    };
  }

  if (plano.billingBasis === "a_partir_de") {
    return { tipo: "valor", centavos, unidade: "a partir de", periodo, aPartirDe: true };
  }

  return { tipo: "valor", centavos, unidade: "por equipamento", periodo, aPartirDe: false };
}

/**
 * Dois planos podem ser comparados lado a lado como preço?
 *
 * Só quando cobrem o mesmo período e a mesma unidade de cobrança. Comparar a
 * anuidade por equipamento de um com o pacote de clínica inteira do outro é
 * pôr números diferentes na mesma coluna — o leitor conclui que um é mais
 * barato quando eles nem medem a mesma coisa.
 *
 * Não impede exibir os dois: obriga a tela a dizer que o escopo difere.
 */
export function escoposComparaveis(a: BasePlano, b: BasePlano): boolean {
  if (a.periodMonths !== b.periodMonths) return false;
  if (a.billingBasis !== b.billingBasis) return false;
  if (a.billingBasis === "pacote") return a.coveredEquipment === b.coveredEquipment;
  return true;
}

/** Rótulo curto da base de cobrança, para o painel e o comparativo. */
export const ROTULO_BASE: Record<PlanBillingBasis, string> = {
  sob_consulta: "Sob consulta",
  por_equipamento: "Por equipamento",
  pacote: "Pacote com quantidade definida",
  a_partir_de: "Preço inicial",
};


/* ------------------------------------------------- o plano na tela pública */

/**
 * O plano como as telas públicas o consomem.
 *
 * Mora aqui, e não no componente do cartão, porque três telas o usam — a
 * página de planos, a de manutenção preventiva e o formulário de proposta — e
 * cada uma montava o próprio objeto a partir do Prisma. Duas cópias da mesma
 * conversão são duas chances de uma delas esquecer um campo novo e a tela
 * calar uma condição comercial.
 */
export type PlanoPublico = {
  slug: string;
  nome: string;
  descricao: string;
  beneficios: string[];
  precoCents: number | null;
  mesesDeVigencia: number;
  visitasIncluidas: number;
  descontoEmPecas: number;
  baseDeCobranca: PlanBillingBasis;
  equipamentosCobertos: number | null;
  elegibilidade: string;
  fatoresDePreco: string[];
  politicaDePecas: string;
  politicaDeDeslocamento: string;
  exclusoes: string[];
};

/** Exatamente os campos que a tela pública de plano precisa, e nada além. */
export const SELECAO_PLANO_PUBLICO = {
  slug: true,
  name: true,
  description: true,
  benefits: true,
  priceCents: true,
  periodMonths: true,
  visitsIncluded: true,
  partsDiscountPercent: true,
  billingBasis: true,
  coveredEquipment: true,
  eligibility: true,
  priceFactors: true,
  partsPolicy: true,
  travelPolicy: true,
  exclusions: true,
} satisfies Prisma.MaintenancePlanSelect;

type LinhaDePlano = Prisma.MaintenancePlanGetPayload<{
  select: typeof SELECAO_PLANO_PUBLICO;
}>;

export function paraPlanoPublico(plano: LinhaDePlano): PlanoPublico {
  return {
    slug: plano.slug,
    nome: plano.name,
    descricao: plano.description,
    beneficios: plano.benefits,
    precoCents: plano.priceCents,
    mesesDeVigencia: plano.periodMonths,
    visitasIncluidas: plano.visitsIncluded,
    descontoEmPecas: plano.partsDiscountPercent,
    baseDeCobranca: plano.billingBasis,
    equipamentosCobertos: plano.coveredEquipment,
    elegibilidade: plano.eligibility,
    fatoresDePreco: plano.priceFactors,
    politicaDePecas: plano.partsPolicy,
    politicaDeDeslocamento: plano.travelPolicy,
    exclusoes: plano.exclusions,
  };
}
