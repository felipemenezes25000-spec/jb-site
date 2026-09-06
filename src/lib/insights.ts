/* ============================================================================
   JB Insights — indicadores, e o que cada um NÃO diz

   Este módulo existe por causa de duas frases do escopo, e elas são as mais
   fáceis de violar sem perceber:

   > "Contagem de chamados de uma marca não equivale à sua taxa de falha sem
   > base de equipamentos e exposição comparáveis."

   > "Tempo entre intervenções não deve ser chamado automaticamente de MTBF ou
   > vida útil; defina exatamente o que foi medido."

   Um painel que mostra "Marca X: 14 chamados" ao lado de "Marca Y: 3 chamados"
   parece um ranking de qualidade. Ele é, na verdade, um ranking de **quantos
   equipamentos daquela marca a JB atende** — e publicar isso como qualidade
   seria injusto com a marca e enganoso com quem lê.

   Por isso todo indicador aqui carrega quatro coisas junto do número: a
   **definição** do que foi medido, a **janela**, o **denominador** e a
   **ressalva** do que ele não permite concluir. E todo indicador devolve união
   discriminada: sem volume mínimo, não há número.
   ============================================================================ */

export type DefinicaoDeIndicador = {
  chave: string;
  titulo: string;
  /** O que exatamente é contado. Sem eufemismo. */
  oQueMede: string;
  /** A janela de observação. */
  janela: string;
  /** A população considerada. */
  populacao: string;
  /** O denominador, quando há. `null` quando é contagem absoluta. */
  denominador: string | null;
  /** O que fica de fora, e por quê. */
  exclusoes: string[];
  /** O que este número NÃO permite concluir. */
  naoConclui: string;
  /** Mínimo de observações para o número ser publicado. */
  volumeMinimo: number;
};

/**
 * O fuso de referência de todos os indicadores.
 *
 * Declarado porque "chamados de setembro" muda de resultado conforme o fuso em
 * que a virada do mês é calculada — e um relatório que muda de número quando
 * roda em outro servidor não é um relatório.
 */
export const FUSO = "America/Sao_Paulo";

export const DEFINICOES: DefinicaoDeIndicador[] = [
  {
    chave: "chamados_por_modelo",
    titulo: "Modelos com mais chamados",
    oQueMede:
      "Quantos chamados de assistência foram abertos para cada modelo, no período.",
    janela: "Últimos 12 meses, no fuso de São Paulo.",
    populacao: "Chamados com equipamento identificado no prontuário.",
    denominador: null,
    exclusoes: [
      "Chamado sem equipamento vinculado — não dá para atribuí-lo a um modelo.",
      "Chamado cancelado antes do atendimento.",
    ],
    naoConclui:
      "Isto NÃO é taxa de falha e NÃO ordena qualidade de marca. Um modelo com mais " +
      "chamados pode simplesmente ser o modelo que a JB mais atende. Sem a base de " +
      "equipamentos instalados de cada modelo e sem exposição comparável, a comparação entre " +
      "marcas não se sustenta.",
    volumeMinimo: 20,
  },
  {
    chave: "pecas_substituidas",
    titulo: "Peças mais substituídas",
    oQueMede: "Quantas vezes cada peça apareceu em ordem de serviço concluída.",
    janela: "Últimos 12 meses.",
    populacao: "Itens de OS concluída, do tipo peça.",
    denominador: null,
    exclusoes: ["OS aberta ou cancelada.", "Item de serviço, que não é peça."],
    naoConclui:
      "Não diz que a peça é frágil: peça de manutenção preventiva aparece muito justamente " +
      "porque é trocada por rotina.",
    volumeMinimo: 15,
  },
  {
    chave: "intervalo_entre_intervencoes",
    titulo: "Intervalo entre intervenções",
    oQueMede:
      "Mediana de dias entre duas ordens de serviço concluídas do mesmo equipamento.",
    janela: "Equipamentos com pelo menos duas OS concluídas nos últimos 24 meses.",
    populacao: "Equipamentos do prontuário com histórico suficiente.",
    denominador: "Pares consecutivos de OS do mesmo equipamento.",
    exclusoes: [
      "Equipamento com uma OS só — não há intervalo a medir.",
      "OS aberta, cancelada ou sem data de conclusão.",
    ],
    naoConclui:
      "Isto NÃO é MTBF e NÃO é vida útil. MTBF pressupõe falhas independentes numa " +
      "população em operação controlada; aqui há preventiva programada, chamado por sintoma e " +
      "equipamento que passou meses parado. O que foi medido é exatamente o que está escrito " +
      "acima: dias entre duas OS concluídas.",
    volumeMinimo: 12,
  },
  {
    chave: "idade_do_parque",
    titulo: "Idade do parque",
    oQueMede: "Mediana de anos desde a compra ou a instalação dos equipamentos.",
    janela: "Situação de hoje.",
    populacao: "Equipamentos ativos no prontuário, com data de compra ou instalação.",
    denominador: "Equipamentos com data conhecida.",
    exclusoes: [
      "Equipamento sem data de compra nem de instalação — a data de cadastro não serve, " +
        "porque ela é quando alguém digitou, não quando o aparelho chegou.",
      "Equipamento desativado.",
    ],
    naoConclui: "Idade não é condição. Um aparelho de dez anos bem mantido não é um problema.",
    volumeMinimo: 10,
  },
  {
    chave: "preventivas_vencidas",
    titulo: "Preventivas vencidas",
    oQueMede: "Quantos equipamentos estão com a preventiva vencida hoje.",
    janela: "Situação de hoje, no fuso de São Paulo.",
    populacao: "Equipamentos com periodicidade cadastrada e próxima preventiva definida.",
    denominador: "Equipamentos com preventiva programada.",
    exclusoes: [
      "Equipamento sem periodicidade cadastrada — ele não está atrasado, está sem plano.",
      "Equipamento desativado.",
    ],
    naoConclui:
      "O denominador exclui quem não tem plano de manutenção. A porcentagem é sobre quem " +
      "tem — e não sobre o parque inteiro.",
    volumeMinimo: 10,
  },
  {
    chave: "reincidencia",
    titulo: "Reincidência em 90 dias",
    oQueMede:
      "Proporção de OS concluídas seguidas de outra OS do mesmo equipamento em até 90 dias.",
    janela: "OS concluídas entre 12 e 3 meses atrás — as mais recentes ainda não tiveram " +
      "90 dias para reincidir.",
    populacao: "OS concluídas com equipamento identificado.",
    denominador: "OS concluídas na janela.",
    exclusoes: [
      "OS dos últimos 90 dias, que ainda não completaram o período de observação. " +
        "Incluí-las reduziria a reincidência artificialmente.",
      "OS sem equipamento vinculado.",
    ],
    naoConclui:
      "Reincidência não é falha de reparo: pode ser outro defeito no mesmo aparelho, ou " +
      "preventiva agendada logo depois.",
    volumeMinimo: 20,
  },
  {
    chave: "tempo_ate_decisao",
    titulo: "Tempo até a decisão do orçamento",
    oQueMede: "Mediana de dias entre enviar um orçamento e o cliente aprovar ou recusar.",
    janela: "Orçamentos enviados nos últimos 12 meses e já decididos.",
    populacao: "Orçamentos com data de envio e data de decisão.",
    denominador: "Orçamentos decididos.",
    exclusoes: [
      "Orçamento ainda em aberto — ele não tem tempo de decisão, tem tempo de espera, que é " +
        "outro indicador.",
      "Orçamento expirado sem resposta.",
    ],
    naoConclui:
      "Excluir os em aberto enviesa para baixo: quem demora mais a decidir tem mais chance " +
      "de ainda não ter decidido. O número é sobre quem decidiu.",
    volumeMinimo: 12,
  },
];

export function definicaoDe(chave: string): DefinicaoDeIndicador | undefined {
  return DEFINICOES.find((definicao) => definicao.chave === chave);
}

/* --------------------------------------------------------- o resultado */

export type ValorDoIndicador =
  | {
      suficiente: true;
      /** Linhas do indicador, já ordenadas. */
      linhas: { rotulo: string; valor: number; unidade: string }[];
      /** Quantas observações entraram. */
      observacoes: number;
    }
  | { suficiente: false; motivo: string; observacoes: number };

/**
 * Aplica o volume mínimo.
 *
 * Abaixo dele, não há número — nem "aproximadamente", nem com asterisco. O
 * escopo permite explicitamente que a interface diga "ainda não há dados
 * suficientes", e proíbe semear métrica ilustrativa para a tela parecer
 * pronta.
 */
export function comVolumeMinimo(
  chave: string,
  linhas: { rotulo: string; valor: number; unidade: string }[],
  observacoes: number,
): ValorDoIndicador {
  const definicao = definicaoDe(chave);
  const minimo = definicao?.volumeMinimo ?? 10;

  if (observacoes < minimo) {
    return {
      suficiente: false,
      motivo: `Ainda não há dados suficientes: ${observacoes} de ${minimo} observações mínimas.`,
      observacoes,
    };
  }

  return { suficiente: true, linhas, observacoes };
}

/* --------------------------------------------- proteção de reidentificação */

/**
 * Quantas clínicas distintas precisam estar num agregado para ele ser
 * publicável fora do painel.
 *
 * Com duas, quem é uma delas descobre a outra por subtração. Cinco é
 * convenção de produto, declarada como tal — e vale só para publicação
 * agregada, não para a visão que cada clínica tem dos próprios dados.
 */
export const MINIMO_DE_CLINICAS = 5;

export type Publicavel =
  | { pode: true }
  | { pode: false; motivo: string };

/**
 * Um agregado pode sair do painel?
 *
 * Duas condições, e as duas existem contra reidentificação: clínicas
 * suficientes, e nenhuma delas dominando o agregado. Um "índice do setor" em
 * que 80% dos dados são de uma clínica é o dado daquela clínica com outro
 * nome.
 */
export function podePublicarAgregado(entrada: {
  clinicas: number;
  /** Maior fatia que uma única clínica ocupa no agregado, de 0 a 1. */
  maiorFatia: number;
}): Publicavel {
  if (entrada.clinicas < MINIMO_DE_CLINICAS) {
    return {
      pode: false,
      motivo: `Poucas clínicas no agregado (${entrada.clinicas} de ${MINIMO_DE_CLINICAS}). Com esse número, dá para deduzir de quem é o dado.`,
    };
  }

  if (entrada.maiorFatia > 0.5) {
    return {
      pode: false,
      motivo:
        "Uma única clínica responde por mais da metade do agregado. Publicá-lo seria publicar " +
        "o dado dela com outro nome.",
    };
  }

  return { pode: true };
}

/* --------------------------------------------------------------- mediana */

/**
 * Mediana, e não média.
 *
 * Em intervalo entre intervenções, um equipamento que ficou três anos parado
 * puxa a média para cima sozinho. A mediana descreve o caso do meio, que é o
 * que se quer saber.
 */
export function mediana(valores: readonly number[]): number | null {
  const validos = valores.filter((valor) => Number.isFinite(valor)).sort((a, b) => a - b);
  if (validos.length === 0) return null;

  const meio = Math.floor(validos.length / 2);
  return validos.length % 2 === 0
    ? (validos[meio - 1] + validos[meio]) / 2
    : validos[meio];
}
