/* ============================================================================
   Avaliações — quem recebe convite, quando, e o que vira depoimento

   Três regras, e cada uma existe contra uma tentação específica:

   1. **Elegibilidade e intervalo.** Convite só depois de a transação terminar,
      e nunca dois convites para a mesma pessoa em intervalo curto. Quem já
      recebeu um pedido de avaliação semana passada não recebe outro porque a
      OS fechou hoje.

   2. **O convite não é filtrado por nota.** O escopo é explícito, e a prática
      que ele proíbe é comum: mandar o convite público só para quem já se sabe
      satisfeito. A satisfação é medida DEPOIS da resposta, e o convite é o
      mesmo para todo mundo — não existe função aqui que receba uma nota.

   3. **Depoimento público exige autorização explícita.** Nota e comentário são
      feedback privado por padrão. Virar depoimento é uma decisão de quem
      escreveu, tomada uma vez, com data.

   Módulo puro. Não envia nada, não escreve nada.
   ============================================================================ */

export type TipoDeAvaliacao = "compra" | "servico";

const DIA_MS = 86_400_000;

/**
 * Intervalo mínimo entre convites para o mesmo cliente.
 *
 * 90 dias é convenção de produto, declarada como tal. O que ela protege é
 * concreto: uma clínica com contrato de manutenção fecha várias OS por
 * trimestre, e um convite por OS transformaria a JB em remetente de spam
 * educado.
 */
export const INTERVALO_ENTRE_CONVITES_DIAS = 90;

/**
 * Carência antes de convidar.
 *
 * Pedir avaliação no minuto seguinte à entrega mede a expectativa, não a
 * experiência. Sete dias dão tempo de o equipamento ser usado.
 */
export const CARENCIA_APOS_CONCLUSAO_DIAS = 7;

export type MotivoDeInelegibilidade =
  | "nao_concluida"
  | "carencia"
  | "convite_recente"
  | "ja_convidado"
  | "sem_contato";

export const EXPLICACAO_INELEGIBILIDADE: Record<MotivoDeInelegibilidade, string> = {
  nao_concluida: "A transação ainda não terminou. Não há experiência completa para avaliar.",
  carencia: `Concluída há menos de ${CARENCIA_APOS_CONCLUSAO_DIAS} dias. Avaliação pedida cedo demais mede expectativa, não experiência.`,
  convite_recente: `Este cliente recebeu convite nos últimos ${INTERVALO_ENTRE_CONVITES_DIAS} dias.`,
  ja_convidado: "Já existe convite para esta transação.",
  sem_contato: "Não há e-mail cadastrado para enviar o convite.",
};

export type CandidatoAConvite = {
  /** A transação terminou? Pedido entregue, OS concluída. */
  concluida: boolean;
  /** Quando terminou. `null` quando não terminou. */
  concluidaEm: Date | null;
  /** Já existe convite para ESTA transação? */
  jaTemConvite: boolean;
  /** Data do último convite enviado a este cliente, de qualquer transação. */
  ultimoConviteAoCliente: Date | null;
  /** Há e-mail para onde mandar? */
  temEmail: boolean;
};

/**
 * Por que este cliente não deve ser convidado agora — ou `null`.
 *
 * Note o que NÃO entra nesta função: nota anterior, valor da compra,
 * histórico de reclamação. Convite filtrado por satisfação prevista é uma
 * vitrine construída, e o escopo proíbe nomeadamente.
 */
export function motivoDeInelegibilidade(
  candidato: CandidatoAConvite,
  agora = new Date(),
): MotivoDeInelegibilidade | null {
  if (!candidato.temEmail) return "sem_contato";
  if (candidato.jaTemConvite) return "ja_convidado";
  if (!candidato.concluida || !candidato.concluidaEm) return "nao_concluida";

  const diasDesdeConclusao = (agora.getTime() - candidato.concluidaEm.getTime()) / DIA_MS;
  if (diasDesdeConclusao < CARENCIA_APOS_CONCLUSAO_DIAS) return "carencia";

  if (candidato.ultimoConviteAoCliente) {
    const diasDesdeConvite =
      (agora.getTime() - candidato.ultimoConviteAoCliente.getTime()) / DIA_MS;
    if (diasDesdeConvite < INTERVALO_ENTRE_CONVITES_DIAS) return "convite_recente";
  }

  return null;
}

/* --------------------------------------------------- o que vira depoimento */

export type FatosDaResposta = {
  /** 1 a 5. */
  nota: number;
  comentario: string;
  /** A pessoa autorizou uso público? */
  autorizou: boolean;
  /** Alguém da JB conferiu e liberou? */
  curado: boolean;
};

export type ImpedimentoDeDepoimento =
  | "sem_autorizacao"
  | "sem_texto"
  | "sem_curadoria";

export const EXPLICACAO_DEPOIMENTO: Record<ImpedimentoDeDepoimento, string> = {
  sem_autorizacao:
    "Quem respondeu não autorizou uso público. A resposta continua valendo como feedback interno.",
  sem_texto: "A resposta não tem comentário. Nota isolada não é depoimento.",
  sem_curadoria: "Ninguém da JB conferiu esta resposta ainda.",
};

/**
 * O que impede esta resposta de virar depoimento público — ou `null`.
 *
 * A nota **não** aparece aqui, e é de propósito: uma resposta de nota 2 com
 * autorização e comentário é publicável. Curadoria serve para conferir dado
 * pessoal exposto e conteúdo ofensivo — não para escolher elogio.
 */
export function impedimentoDeDepoimento(
  resposta: FatosDaResposta,
): ImpedimentoDeDepoimento | null {
  if (!resposta.autorizou) return "sem_autorizacao";
  if (resposta.comentario.trim().length < 10) return "sem_texto";
  if (!resposta.curado) return "sem_curadoria";
  return null;
}

/* ------------------------------------------------------------ indicadores */

export type Satisfacao =
  | { calculavel: true; media: number; respostas: number; promotores: number; detratores: number }
  | { calculavel: false; motivo: string; respostas: number };

/**
 * Mínimo de respostas para a média significar alguma coisa.
 *
 * Com três respostas, uma nota muda a média em mais de um ponto. Publicar
 * isso como "satisfação da JB" seria descrever o acaso.
 */
export const MINIMO_DE_RESPOSTAS = 10;

/**
 * Satisfação medida — para uso interno.
 *
 * Devolve união discriminada pelo mesmo motivo dos outros indicadores do
 * projeto: poucas respostas não podem virar um número com aparência de
 * medição.
 */
export function satisfacaoInterna(notas: readonly number[]): Satisfacao {
  const validas = notas.filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 5);

  if (validas.length < MINIMO_DE_RESPOSTAS) {
    return {
      calculavel: false,
      motivo: `Ainda são poucas respostas para calcular satisfação (${validas.length} de ${MINIMO_DE_RESPOSTAS}).`,
      respostas: validas.length,
    };
  }

  const soma = validas.reduce((total, nota) => total + nota, 0);

  return {
    calculavel: true,
    media: Math.round((soma / validas.length) * 10) / 10,
    respostas: validas.length,
    promotores: validas.filter((nota) => nota >= 4).length,
    detratores: validas.filter((nota) => nota <= 2).length,
  };
}
