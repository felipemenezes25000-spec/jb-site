/* ============================================================================
   TCO — reparar, seminovo ou novo

   Uma simulação de custo total é útil quando as premissas estão à vista, e
   perigosa quando aparece só o total. A diferença entre as duas é este
   arquivo.

   Três regras, e cada uma bloqueia uma tentação específica:

   1. **Valor conhecido, premissa do usuário e dado ausente são três coisas
      diferentes.** Um custo de manutenção que a pessoa estimou não pode
      aparecer com o mesmo peso de um orçamento assinado, e "sem orçamento"
      **não** significa reparo gratuito.

   2. **Nada de vida útil restante, probabilidade de falha, valor de revenda
      ou economia futura.** São os quatro números que fariam a simulação eleger
      um vencedor — e nenhum deles é medido por este sistema.

   3. **Custo de parada entra uma vez só.** Se ele já está numa premissa, não
      volta como linha separada. Somar duas vezes é a forma mais comum de uma
      planilha de TCO produzir um número três vezes maior que a realidade.
   ============================================================================ */

export type OrigemDoValor = "conhecido" | "premissa" | "ausente";

export const ROTULO_DA_ORIGEM: Record<OrigemDoValor, string> = {
  conhecido: "valor real",
  premissa: "premissa sua",
  ausente: "sem dado",
};

export const EXPLICACAO_DA_ORIGEM: Record<OrigemDoValor, string> = {
  conhecido: "Veio de um orçamento, de um preço de catálogo ou de um contrato.",
  premissa: "Foi você quem informou. A simulação usa, e diz que foi você.",
  ausente:
    "Ninguém informou. Não entra na soma — e não vale zero: significa que este custo ainda " +
    "é desconhecido.",
};

export type LinhaDeCusto = {
  rotulo: string;
  /** Em centavos. `null` quando ausente — nunca zero por falta de dado. */
  valorCents: number | null;
  origem: OrigemDoValor;
  /** De onde veio, em português. Ex.: "orçamento OS-001842". */
  procedencia?: string;
};

export type Cenario = {
  chave: "reparar" | "seminovo" | "novo";
  titulo: string;
  linhas: LinhaDeCusto[];
  /** O que não é dinheiro e pesa na decisão. */
  observacoes: string[];
};

export const ROTULO_DO_CENARIO: Record<Cenario["chave"], string> = {
  reparar: "Reparar o que está aí",
  seminovo: "Trocar por um seminovo",
  novo: "Comprar um novo",
};

export type TotalDoCenario = {
  chave: Cenario["chave"];
  /** Soma do que é conhecido e do que foi assumido. */
  totalCents: number;
  /** Quanto do total veio de premissa do usuário. */
  dePremissaCents: number;
  /** Quantas linhas ficaram de fora por falta de dado. */
  linhasSemDado: number;
  /** `true` quando falta dado suficiente para o total significar algo. */
  incompleto: boolean;
};

/**
 * O total de um cenário.
 *
 * Linha ausente **não vira zero**: ela é contada em `linhasSemDado`, e a tela
 * mostra o total como parcial. Um cenário com três custos desconhecidos
 * somando "R$ 0,00" venceria qualquer comparação — e por isso este é o ponto
 * em que a função poderia mentir, e não mente.
 */
export function totalDoCenario(cenario: Cenario): TotalDoCenario {
  let totalCents = 0;
  let dePremissaCents = 0;
  let linhasSemDado = 0;

  for (const linha of cenario.linhas) {
    if (linha.valorCents === null || linha.origem === "ausente") {
      linhasSemDado += 1;
      continue;
    }
    totalCents += linha.valorCents;
    if (linha.origem === "premissa") dePremissaCents += linha.valorCents;
  }

  return {
    chave: cenario.chave,
    totalCents,
    dePremissaCents,
    linhasSemDado,
    incompleto: linhasSemDado > 0,
  };
}

/* --------------------------------------------------------- comparação */

export type Comparacao =
  | {
      comparavel: true;
      /** Do menor total para o maior. */
      ordem: TotalDoCenario[];
      /** Aviso sobre o que o número não cobre. Sempre presente. */
      ressalva: string;
    }
  | { comparavel: false; motivo: string; totais: TotalDoCenario[] };

/**
 * Compara os cenários — quando isso é possível.
 *
 * Não é possível quando algum cenário está incompleto, e a recusa é o ponto:
 * ordenar totais em que um deles ignora três custos desconhecidos produziria
 * um "vencedor" que venceu por falta de informação.
 *
 * Quando é possível, o resultado vem com ressalva. Ela não é rodapé: o total
 * cobre o horizonte declarado e nada além dele, e não inclui vida útil
 * restante, revenda nem probabilidade de falha — porque nenhum desses números
 * existe aqui.
 */
export function compararCenarios(cenarios: readonly Cenario[], anosDeHorizonte: number): Comparacao {
  const totais = cenarios.map(totalDoCenario);

  if (cenarios.length < 2) {
    return {
      comparavel: false,
      motivo: "Escolha pelo menos dois cenários para comparar.",
      totais,
    };
  }

  const incompletos = totais.filter((total) => total.incompleto);
  if (incompletos.length > 0) {
    return {
      comparavel: false,
      motivo:
        `${incompletos.length === 1 ? "Um cenário tem" : `${incompletos.length} cenários têm`} ` +
        "custo sem informação. Comparar agora elegeria o mais barato por falta de dado, e não " +
        "por ser mais barato. Preencha o que falta ou peça um orçamento.",
      totais,
    };
  }

  return {
    comparavel: true,
    ordem: [...totais].sort((a, b) => a.totalCents - b.totalCents),
    ressalva:
      `Simulação para ${anosDeHorizonte} ${anosDeHorizonte === 1 ? "ano" : "anos"}, com os ` +
      "valores acima. Ela não estima vida útil restante, probabilidade de falha, valor de " +
      "revenda nem economia futura — nenhum desses números foi medido.",
  };
}

/* ------------------------------------------------------ custo de parada */

export type ParadaNaSimulacao =
  | { incluir: true; cents: number; ondeEntrou: string }
  | { incluir: false; motivo: string };

/**
 * O custo de parada entra nesta simulação?
 *
 * Só quando ainda não está embutido em outra premissa. É a regra que o escopo
 * nomeia — não somar de novo um custo já incluído — e ela precisa ser uma
 * decisão explícita, porque a linha de "manutenção estimada" de um contrato
 * frequentemente já cobre a indisponibilidade.
 */
export function custoDeParada(entrada: {
  cents: number | null;
  jaIncluidoEmOutraPremissa: boolean;
}): ParadaNaSimulacao {
  if (entrada.jaIncluidoEmOutraPremissa) {
    return {
      incluir: false,
      motivo:
        "O custo de parada já está embutido em outra premissa desta simulação. Somar de novo " +
        "dobraria o mesmo prejuízo.",
    };
  }

  if (entrada.cents === null || entrada.cents <= 0) {
    return {
      incluir: false,
      motivo: "O custo de parada não foi informado, então ele não entra na soma.",
    };
  }

  return {
    incluir: true,
    cents: entrada.cents,
    ondeEntrou: "Somado uma vez, como linha própria.",
  };
}

/* ---------------------------------------------------------- orçamento */

/**
 * A linha do reparo.
 *
 * Sem orçamento, ela é `ausente` — e a frase diz por quê. "Sem orçamento" é o
 * caso em que uma planilha de TCO mais frequentemente escreve zero, e o zero
 * faz reparar vencer sempre.
 */
export function linhaDoReparo(orcamentoCents: number | null, referencia?: string): LinhaDeCusto {
  if (orcamentoCents === null || orcamentoCents <= 0) {
    return {
      rotulo: "Reparo",
      valorCents: null,
      origem: "ausente",
      procedencia:
        "Sem orçamento. O reparo não é gratuito — é desconhecido, e um diagnóstico resolve isso.",
    };
  }

  return {
    rotulo: "Reparo",
    valorCents: orcamentoCents,
    origem: "conhecido",
    procedencia: referencia ? `Orçamento ${referencia}` : "Orçamento da JB",
  };
}
