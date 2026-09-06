/* ============================================================================
   Exposição anual a equipamento parado

   A conta em si é trivial. O que não é trivial — e é a razão de este módulo
   existir separado da tela — são as três armadilhas dela:

   1. **Unidade.** "Receita por hora" de quê? Da cadeira afetada ou da clínica
      inteira? A diferença muda o resultado por um fator igual ao número de
      cadeiras. Aqui a entrada é sempre a receita da clínica operando normal, e
      a parcela afetada é um percentual explícito e separado.

   2. **Dupla contagem.** O percentual afetado é aplicado UMA vez, sobre a
      receita/hora, e aparece como um passo próprio na memória de cálculo. Não
      volta a multiplicar em nenhum outro lugar.

   3. **Nome do resultado.** O que sai é exposição — receita em risco somada ao
      custo de reparo. Não é lucro perdido (ignora custo variável evitado), não
      é economia garantida e não é previsão. O tipo se chama `exposicao` para
      que nenhuma tela chame o número de outra coisa por descuido.

   Fórmula, e é a única:

       exposição = ocorrências/ano × ( (receita/hora × %afetado × horas/dia
                                        × dias/ocorrência) + reparo/ocorrência )
   ============================================================================ */

/** Entradas cruas da tela, já convertidas para número. */
export type PremissasParada = {
  /** Receita por hora da clínica operando normalmente, em centavos. */
  receitaHoraCents: number;
  /** Quanto da agenda para quando este equipamento falha, de 1 a 100. */
  percentualAfetado: number;
  /** Horas de atendimento por dia. */
  horasPorDia: number;
  /** Dias parados por ocorrência. */
  diasPorOcorrencia: number;
  /** Ocorrências por ano. */
  ocorrenciasPorAno: number;
  /** Custo do reparo de urgência por ocorrência, em centavos. Opcional. */
  reparoCents: number;
};

export type ProblemaDePremissa = {
  campo: keyof PremissasParada;
  mensagem: string;
};

/**
 * Limites de plausibilidade.
 *
 * Não são regra de negócio da JB: são os contornos do que uma clínica pode
 * descrever sem que a conta vire ficção. Passar de 24 horas por dia ou de 365
 * dias parados por ocorrência não é um número alto, é um número impossível — e
 * um resultado calculado em cima disso desqualificaria a ferramenta inteira.
 */
const LIMITES = {
  receitaHoraCents: { min: 1, max: 100_000_00 },
  percentualAfetado: { min: 1, max: 100 },
  horasPorDia: { min: 1, max: 24 },
  diasPorOcorrencia: { min: 1, max: 365 },
  ocorrenciasPorAno: { min: 1, max: 52 },
  reparoCents: { min: 0, max: 1_000_000_00 },
} as const;

const NOMES: Record<keyof PremissasParada, string> = {
  receitaHoraCents: "a receita por hora",
  percentualAfetado: "o percentual da agenda afetada",
  horasPorDia: "as horas por dia",
  diasPorOcorrencia: "os dias parados por ocorrência",
  ocorrenciasPorAno: "as ocorrências por ano",
  reparoCents: "o custo do reparo",
};

/**
 * O que está faltando ou fora de faixa.
 *
 * Devolve lista vazia quando dá para calcular. `reparoCents` é a única entrada
 * opcional: zero significa "não sei", e não "reparo de graça" — quem consome
 * precisa dizer isso na tela.
 */
export function conferirPremissas(p: PremissasParada): ProblemaDePremissa[] {
  const problemas: ProblemaDePremissa[] = [];

  for (const campo of Object.keys(LIMITES) as (keyof PremissasParada)[]) {
    const valor = p[campo];
    const limite = LIMITES[campo];

    if (!Number.isFinite(valor)) {
      problemas.push({ campo, mensagem: `Informe ${NOMES[campo]} em número.` });
      continue;
    }
    if (valor < limite.min) {
      problemas.push({
        campo,
        mensagem:
          limite.min === 0
            ? `${NOMES[campo]} não pode ser negativo.`
            : `Informe ${NOMES[campo]}.`,
      });
      continue;
    }
    if (valor > limite.max) {
      problemas.push({
        campo,
        mensagem: `Confira ${NOMES[campo]}: o valor informado está fora do plausível.`,
      });
    }
  }

  return problemas;
}

export type Exposicao = {
  /** Receita por hora efetivamente em risco, depois do percentual afetado. */
  receitaAfetadaHoraCents: number;
  /** Horas sem atender por ocorrência. */
  horasPorOcorrencia: number;
  /** Receita em risco por ocorrência, sem o reparo. */
  receitaEmRiscoPorOcorrenciaCents: number;
  /** Receita em risco no ano. */
  receitaEmRiscoAnualCents: number;
  /** Reparos no ano. Zero quando o custo não foi informado. */
  reparosAnualCents: number;
  /** Exposição anual total: receita em risco + reparos. */
  exposicaoAnualCents: number;
  /** Verdadeiro quando o custo de reparo não foi informado. */
  reparoDesconhecido: boolean;
};

/**
 * Calcula a exposição anual.
 *
 * Só deve ser chamada com premissas que passaram por `conferirPremissas`. Com
 * entrada inválida devolve tudo zerado em vez de `NaN`: uma tela que exibisse
 * "R$ NaN" seria pior do que uma que não exibe nada.
 */
export function calcularExposicao(p: PremissasParada): Exposicao {
  if (conferirPremissas(p).length > 0) {
    return {
      receitaAfetadaHoraCents: 0,
      horasPorOcorrencia: 0,
      receitaEmRiscoPorOcorrenciaCents: 0,
      receitaEmRiscoAnualCents: 0,
      reparosAnualCents: 0,
      exposicaoAnualCents: 0,
      reparoDesconhecido: true,
    };
  }

  /* Arredonda uma vez, aqui, e em centavos inteiros — a convenção do projeto.
     Arredondar em cada etapa faria a soma das linhas da memória de cálculo não
     bater com o total, e é exatamente essa conferência que a tela oferece. */
  const receitaAfetadaHoraCents = Math.round(
    (p.receitaHoraCents * p.percentualAfetado) / 100,
  );
  const horasPorOcorrencia = p.horasPorDia * p.diasPorOcorrencia;
  const receitaEmRiscoPorOcorrenciaCents = receitaAfetadaHoraCents * horasPorOcorrencia;
  const receitaEmRiscoAnualCents = receitaEmRiscoPorOcorrenciaCents * p.ocorrenciasPorAno;
  const reparosAnualCents = p.reparoCents * p.ocorrenciasPorAno;

  return {
    receitaAfetadaHoraCents,
    horasPorOcorrencia,
    receitaEmRiscoPorOcorrenciaCents,
    receitaEmRiscoAnualCents,
    reparosAnualCents,
    exposicaoAnualCents: receitaEmRiscoAnualCents + reparosAnualCents,
    reparoDesconhecido: p.reparoCents <= 0,
  };
}

/**
 * Resumo das premissas para levar ao formulário de proposta.
 *
 * Texto legível, sem identificar a clínica: quem lê o lead no painel precisa
 * saber com que números a pessoa chegou até ali. Não vai para analytics — ver
 * a seção de analytics do prompt mestre e `docs/evolucao-jb/decisoes.md`.
 */
export function resumoDasPremissas(
  p: PremissasParada,
  formatarPreco: (centavos: number) => string,
): string {
  const e = calcularExposicao(p);
  const linhas = [
    `Receita por hora da clínica: ${formatarPreco(p.receitaHoraCents)}`,
    `Parcela da agenda afetada: ${p.percentualAfetado}%`,
    `Horas de atendimento por dia: ${p.horasPorDia}`,
    `Dias parados por ocorrência: ${p.diasPorOcorrencia}`,
    `Ocorrências por ano: ${p.ocorrenciasPorAno}`,
    p.reparoCents > 0
      ? `Custo do reparo por ocorrência: ${formatarPreco(p.reparoCents)}`
      : "Custo do reparo por ocorrência: não informado",
    `Exposição anual estimada: ${formatarPreco(e.exposicaoAnualCents)}`,
  ];
  return linhas.join("\n");
}
