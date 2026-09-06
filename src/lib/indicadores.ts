/* ============================================================================
   Indicadores da Área da Clínica

   Dois números que o escopo pede — e que só podem existir com uma condição:
   dizer, com todas as letras, quando NÃO dá para calculá-los.

   O modo de falha que este módulo existe para impedir é específico e comum:
   uma clínica com três equipamentos cadastrados ontem vê "100% de
   disponibilidade" e "índice de manutenção: excelente". Os dois números são
   verdadeiros no sentido aritmético e mentirosos no sentido que importa — não
   há histórico nenhum por trás deles.

   Por isso as duas funções devolvem união discriminada: ou um resultado, ou a
   razão de não haver. Quem consome é obrigado pelo tipo a tratar os dois
   casos, e não existe caminho em que a ausência vire zero, cem ou "baixo
   risco".

   Módulo puro — sem Prisma, sem `server-only`. A regra é testável sem banco,
   que é onde os erros dela doem.
   ============================================================================ */

/** Sobe quando a fórmula ou os pesos mudam. Vai junto do resultado. */
export const VERSAO_DOS_INDICADORES = 1;

/* ================================================ disponibilidade do parque */

const DIA_MS = 86_400_000;

/**
 * Um intervalo em que um equipamento esteve fora de operação.
 *
 * `fim` nulo significa "ainda parado agora".
 */
export type ParadaObservada = {
  equipmentId: string;
  inicio: Date;
  fim: Date | null;
};

/** Quando cada equipamento entrou no parque, e quando saiu, se saiu. */
export type PermanenciaNoParque = {
  equipmentId: string;
  entrouEm: Date;
  saiuEm: Date | null;
};

export type Disponibilidade =
  | {
      calculavel: true;
      /** 0 a 100, com uma casa. */
      percentual: number;
      /** Dias-equipamento observados no período. É o denominador. */
      diasObservados: number;
      /** Dias-equipamento em que houve parada registrada. */
      diasParados: number;
      /** Quantos equipamentos entraram na conta. */
      equipamentos: number;
      inicio: Date;
      fim: Date;
      versao: number;
    }
  | {
      calculavel: false;
      /** O que falta, em português, para a tela dizer sem inventar. */
      motivo: string;
      /** Quanto já se tem, para a tela poder dizer "faltam X dias". */
      diasObservados: number;
    };

/**
 * Mínimo de dias-equipamento para o número significar algo.
 *
 * 90 dias-equipamento é uma convenção de produto, não uma medição — e está
 * declarada como tal. Abaixo disso, uma única parada de dois dias mexe o
 * percentual em vários pontos, e o número passa a descrever o acaso.
 */
export const MINIMO_DIAS_OBSERVADOS = 90;

/**
 * Disponibilidade do parque no período.
 *
 * A conta é de dias-equipamento, não de "quantos estão operacionais hoje". Um
 * equipamento que entrou no parque semana passada contribui com sete dias, não
 * com o período inteiro; um que saiu contribui até a saída. Contar o estado
 * atual e dividir pelo total — que é o atalho tentador — não mede
 * disponibilidade histórica: mede uma foto, e chamá-la de histórico é o erro
 * que o escopo nomeia.
 */
export function disponibilidadeDoParque(entrada: {
  permanencias: PermanenciaNoParque[];
  /**
   * As paradas observadas, ou `null` quando não há registro de paradas.
   *
   * A diferença entre `[]` e `null` é a razão de este parâmetro aceitar os dois.
   * `[]` significa "acompanhamos e nada parou". `null` significa "ninguém
   * registrou parada nenhuma", que é outra coisa: tratar os dois como iguais
   * produziria 100% para um parque cujo histórico ninguém escreveu — o pior
   * número possível, porque é exatamente o que a clínica gostaria de ver.
   */
  paradas: ParadaObservada[] | null;
  inicio: Date;
  fim: Date;
}): Disponibilidade {
  const { permanencias, paradas, inicio, fim } = entrada;

  if (fim.getTime() <= inicio.getTime()) {
    return { calculavel: false, motivo: "O período informado é inválido.", diasObservados: 0 };
  }

  /** Interseção de um intervalo com a janela, em dias. Nunca negativa. */
  const diasNaJanela = (de: Date, ate: Date | null) => {
    const comeco = Math.max(de.getTime(), inicio.getTime());
    const termino = Math.min((ate ?? fim).getTime(), fim.getTime());
    return Math.max(0, (termino - comeco) / DIA_MS);
  };

  let diasObservados = 0;
  const elegiveis = new Set<string>();

  for (const permanencia of permanencias) {
    const dias = diasNaJanela(permanencia.entrouEm, permanencia.saiuEm);
    if (dias > 0) {
      diasObservados += dias;
      elegiveis.add(permanencia.equipmentId);
    }
  }

  if (diasObservados < MINIMO_DIAS_OBSERVADOS) {
    return {
      calculavel: false,
      motivo:
        "Ainda não há histórico suficiente para calcular disponibilidade. O número aparece " +
        "quando o parque acumular observação bastante para ele significar alguma coisa.",
      diasObservados: Math.round(diasObservados),
    };
  }

  if (paradas === null) {
    return {
      calculavel: false,
      motivo:
        "O parque tem histórico bastante, mas o registro de paradas está incompleto. " +
        "Sem saber quando cada equipamento ficou fora de operação, qualquer percentual " +
        "sairia alto por falta de dado, e não por bom desempenho.",
      diasObservados: Math.round(diasObservados),
    };
  }

  let diasParados = 0;
  for (const parada of paradas) {
    /* Parada de equipamento que não está entre os elegíveis é descartada: ela
       cairia no numerador sem ter contribuído com o denominador, e o
       percentual passaria a poder ficar negativo. */
    if (!elegiveis.has(parada.equipmentId)) continue;
    diasParados += diasNaJanela(parada.inicio, parada.fim);
  }

  const percentual = Math.max(
    0,
    Math.min(100, ((diasObservados - diasParados) / diasObservados) * 100),
  );

  return {
    calculavel: true,
    percentual: Math.round(percentual * 10) / 10,
    diasObservados: Math.round(diasObservados),
    diasParados: Math.round(diasParados),
    equipamentos: elegiveis.size,
    inicio,
    fim,
    versao: VERSAO_DOS_INDICADORES,
  };
}

/* ------------------------------------------- do banco para a fórmula */

/**
 * As situações possíveis de um equipamento.
 *
 * Repetidas aqui em vez de importadas do Prisma de propósito: este módulo é
 * puro, e a regra dele precisa poder ser testada sem banco. O `satisfies` no
 * ponto de uso garante que as duas listas não se separem.
 */
export type SituacaoDoEquipamento =
  | "operacional"
  | "em_manutencao"
  | "aguardando_peca"
  | "inoperante"
  | "desativado";

/** Situações em que o equipamento está fora de operação, mas ainda no parque. */
export const SITUACOES_DE_PARADA: readonly SituacaoDoEquipamento[] = [
  "em_manutencao",
  "aguardando_peca",
  "inoperante",
];

/** Desativado não é parada: é saída do parque. Somar como parada puniria a
 *  clínica para sempre por ter aposentado um aparelho. */
const FORA_DO_PARQUE: SituacaoDoEquipamento = "desativado";

export type EquipamentoDoParque = {
  equipmentId: string;
  entrouEm: Date;
  situacaoAtual: SituacaoDoEquipamento;
};

export type MudancaDeSituacao = {
  equipmentId: string;
  quando: Date;
  /** `null` nos eventos gravados antes de a situação virar coluna. */
  situacao: SituacaoDoEquipamento | null;
};

/**
 * Transforma o que o banco guarda no que a fórmula precisa.
 *
 * O trabalho de verdade desta função não é montar os intervalos — é decidir
 * quando o registro NÃO dá para ler. Ela devolve `paradas: null` sempre que o
 * histórico tem buraco, e o buraco tem três formas conhecidas:
 *
 * 1. evento antigo, gravado antes de existir a coluna de situação;
 * 2. equipamento parado agora sem o evento que registrou a parada;
 * 3. equipamento desativado agora sem o evento da desativação.
 *
 * Nos três casos o cálculo ingênuo daria um percentual ALTO — porque parada
 * não registrada é parada que não entra no numerador. É o erro que mais engana:
 * ele não parece erro, parece notícia boa.
 */
export function historicoDoParque(entrada: {
  equipamentos: EquipamentoDoParque[];
  mudancas: MudancaDeSituacao[];
}): { permanencias: PermanenciaNoParque[]; paradas: ParadaObservada[] | null } {
  const porEquipamento = new Map<string, MudancaDeSituacao[]>();
  let registroCompleto = true;

  for (const mudanca of entrada.mudancas) {
    if (mudanca.situacao === null) {
      registroCompleto = false;
      continue;
    }
    const lista = porEquipamento.get(mudanca.equipmentId);
    if (lista) lista.push(mudanca);
    else porEquipamento.set(mudanca.equipmentId, [mudanca]);
  }

  for (const lista of porEquipamento.values()) {
    lista.sort((a, b) => a.quando.getTime() - b.quando.getTime());
  }

  const permanencias: PermanenciaNoParque[] = [];
  const paradas: ParadaObservada[] = [];

  for (const equipamento of entrada.equipamentos) {
    const historico = porEquipamento.get(equipamento.equipmentId) ?? [];
    const ultima = historico.at(-1)?.situacao ?? null;

    /* A situação atual tem de bater com a última registrada. Quando não bate,
       alguém mudou o estado por fora do caminho que grava evento, e o
       histórico deste equipamento não descreve o que aconteceu com ele. */
    const situacaoAtualEhSilenciosa =
      equipamento.situacaoAtual !== "operacional" && ultima !== equipamento.situacaoAtual;
    if (situacaoAtualEhSilenciosa) registroCompleto = false;

    let saiuEm: Date | null = null;
    if (equipamento.situacaoAtual === FORA_DO_PARQUE) {
      const desativacao = [...historico]
        .reverse()
        .find((m) => m.situacao === FORA_DO_PARQUE);
      saiuEm = desativacao?.quando ?? null;
    }

    permanencias.push({
      equipmentId: equipamento.equipmentId,
      entrouEm: equipamento.entrouEm,
      saiuEm,
    });

    let abertaEm: Date | null = null;
    for (const mudanca of historico) {
      const parou = SITUACOES_DE_PARADA.includes(mudanca.situacao as SituacaoDoEquipamento);
      if (parou && abertaEm === null) {
        abertaEm = mudanca.quando;
      } else if (!parou && abertaEm !== null) {
        paradas.push({ equipmentId: equipamento.equipmentId, inicio: abertaEm, fim: mudanca.quando });
        abertaEm = null;
      }
    }
    /* Parada ainda aberta fica sem fim: quem calcula recorta na janela. */
    if (abertaEm !== null) {
      paradas.push({ equipmentId: equipamento.equipmentId, inicio: abertaEm, fim: null });
    }
  }

  return { permanencias, paradas: registroCompleto ? paradas : null };
}

/* ==================================================== índice de manutenção */

/**
 * Os fatos de um equipamento que entram no índice.
 *
 * `null` significa "não sei", e não "zero". A diferença é o módulo inteiro.
 */
export type FatosDoEquipamento = {
  /** Data da última manutenção registrada. */
  ultimaManutencao: Date | null;
  /** Próxima preventiva prevista. */
  proximaPreventiva: Date | null;
  /** Intervalo cadastrado, em dias. Sem ele não há o que estar em dia. */
  intervaloDias: number | null;
  /** Chamados nos últimos 12 meses. */
  chamados12Meses: number;
  /** Quando o equipamento entrou no parque. */
  desde: Date | null;
};

export type FatorDoIndice = {
  nome: string;
  /** O que este fator observou, em português. */
  observado: string;
  /** Peso no índice, de 0 a 1. */
  peso: number;
  /** Nota do fator, de 0 a 1. */
  nota: number;
};

export type IndiceDeManutencao =
  | {
      calculavel: true;
      /** 0 a 100. NÃO é probabilidade de falha nem laudo de segurança. */
      nota: number;
      fatores: FatorDoIndice[];
      versao: number;
    }
  | {
      calculavel: false;
      motivo: string;
      /** O que precisa ser cadastrado para o índice existir. */
      falta: string[];
    };

/**
 * Pesos dos fatores.
 *
 * **São convenções de produto, não um modelo validado de risco de falha.** O
 * escopo é explícito em exigir que isso seja dito, e a tela repete a frase.
 * Ninguém mediu correlação entre estes pesos e quebra de equipamento; o que
 * eles fazem é ordenar o que a clínica deve olhar primeiro.
 */
export const PESOS = {
  preventivaEmDia: 0.5,
  recorrenciaDeChamados: 0.3,
  historicoConhecido: 0.2,
} as const;

/**
 * Índice de manutenção de um equipamento.
 *
 * O nome é deliberado: é índice de MANUTENÇÃO, não laudo de saúde nem de
 * segurança do aparelho. Ele diz o quanto a manutenção está em dia — não o
 * quanto a máquina está boa.
 *
 * Sem periodicidade cadastrada, não há o que estar em dia, e a função devolve
 * `calculavel: false` com a lista do que falta. Uma nota 100 nesse caso seria a
 * pior saída possível: transformaria "ninguém cadastrou" em "está tudo certo".
 */
export function indiceDeManutencao(
  fatos: FatosDoEquipamento,
  agora = new Date(),
): IndiceDeManutencao {
  const falta: string[] = [];

  if (!fatos.intervaloDias || fatos.intervaloDias <= 0) {
    falta.push("a periodicidade de manutenção do equipamento");
  }
  if (!fatos.desde) {
    falta.push("desde quando o equipamento está no parque");
  }

  if (falta.length > 0) {
    return {
      calculavel: false,
      motivo:
        "Ainda não dá para calcular o índice deste equipamento. Sem os dados abaixo, " +
        "qualquer nota seria um palpite com aparência de medição.",
      falta,
    };
  }

  const intervalo = fatos.intervaloDias as number;
  const desde = fatos.desde as Date;
  const fatores: FatorDoIndice[] = [];

  /* ------------------------------------------ 1. preventiva em dia */
  if (fatos.proximaPreventiva) {
    const atrasoDias = (agora.getTime() - fatos.proximaPreventiva.getTime()) / DIA_MS;

    /* Um intervalo inteiro de atraso zera o fator. Dois meses de atraso num
       equipamento de revisão anual pesa menos que dois meses num de revisão
       trimestral — e é isso que dividir pelo intervalo produz. */
    const nota = atrasoDias <= 0 ? 1 : Math.max(0, 1 - atrasoDias / intervalo);

    fatores.push({
      nome: "Preventiva em dia",
      observado:
        atrasoDias <= 0
          ? `Próxima revisão prevista, dentro do prazo de ${intervalo} dias.`
          : `Revisão vencida há ${Math.round(atrasoDias)} dias, num ciclo de ${intervalo}.`,
      peso: PESOS.preventivaEmDia,
      nota,
    });
  } else {
    fatores.push({
      nome: "Preventiva em dia",
      observado: "Nenhuma revisão prevista foi registrada.",
      peso: PESOS.preventivaEmDia,
      nota: 0,
    });
  }

  /* ------------------------------------ 2. recorrência de chamados */
  const chamados = Math.max(0, fatos.chamados12Meses);
  /* Três chamados em doze meses zeram o fator. O número é convenção, e está
     dito como tal na tela. */
  const notaChamados = Math.max(0, 1 - chamados / 3);

  fatores.push({
    nome: "Recorrência de chamados",
    observado:
      chamados === 0
        ? "Nenhum chamado nos últimos 12 meses."
        : `${chamados} chamado${chamados === 1 ? "" : "s"} nos últimos 12 meses.`,
    peso: PESOS.recorrenciaDeChamados,
    nota: notaChamados,
  });

  /* ------------------------------------- 3. histórico conhecido */
  const mesesNoParque = (agora.getTime() - desde.getTime()) / (DIA_MS * 30);
  const temUltima = fatos.ultimaManutencao !== null;

  /* Um equipamento novo sem manutenção nenhuma não é penalizado como um
     antigo sem manutenção nenhuma: o primeiro não teve tempo. */
  const notaHistorico = temUltima ? 1 : mesesNoParque < 6 ? 0.8 : 0.3;

  fatores.push({
    nome: "Histórico conhecido",
    observado: temUltima
      ? "Há manutenção registrada para este equipamento."
      : mesesNoParque < 6
        ? "Equipamento recente, ainda sem manutenção registrada."
        : "Sem manutenção registrada, apesar do tempo no parque.",
    peso: PESOS.historicoConhecido,
    nota: notaHistorico,
  });

  const soma = fatores.reduce((total, fator) => total + fator.peso * fator.nota, 0);
  const somaDosPesos = fatores.reduce((total, fator) => total + fator.peso, 0);

  return {
    calculavel: true,
    nota: Math.round((soma / somaDosPesos) * 100),
    fatores,
    versao: VERSAO_DOS_INDICADORES,
  };
}

/**
 * A frase que acompanha o índice.
 *
 * Nunca "seguro", "em bom estado" ou "baixo risco": o índice mede manutenção,
 * não a condição do aparelho. Um equipamento com revisão em dia pode quebrar
 * amanhã, e dizer o contrário é o que transforma um índice de produto em laudo
 * técnico que ninguém emitiu.
 */
export function leituraDoIndice(nota: number): string {
  if (nota >= 80) return "Manutenção em dia";
  if (nota >= 50) return "Manutenção com pendências";
  return "Manutenção atrasada";
}
