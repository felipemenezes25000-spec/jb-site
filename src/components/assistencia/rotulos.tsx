import type { ServiceRequestStatus, ServiceKind, Urgency } from "@prisma/client";

/**
 * Vocabulário público da assistência.
 *
 * Módulo sem estado e sem acesso a banco de propósito: é importado tanto por
 * páginas de servidor quanto por formulários do cliente. Nada de
 * `server-only` aqui dentro, ou os formulários deixam de compilar.
 *
 * O que mora aqui são as palavras que o cliente lê. Os rótulos internos da
 * equipe continuam em `@/lib/assistencia`; este arquivo traduz aquilo para
 * quem está esperando o equipamento voltar a funcionar.
 */

/* ------------------------------------------------------ campos de proteção */

/** Isca invisível: robô preenche, gente não enxerga. */
export const CAMPO_ISCA = "confirme_seu_site";
/** Momento em que o formulário abriu, para barrar envio instantâneo. */
export const CAMPO_INICIO = "aberto_em";
/** Código da imagem, exigido só na escalada do limite por IP. */
export const CAMPO_CODIGO = "codigo_da_imagem";

/* ----------------------------------------------------------- o que abrir */

export const TIPOS_PROBLEMA = [
  "Não liga",
  "Liga e desliga sozinho",
  "Vazamento",
  "Ruído ou vibração anormal",
  "Perda de pressão ou de vácuo",
  "Aquecimento ou cheiro de queimado",
  "Erro no painel",
  "Peça quebrada ou solta",
  "Instalação ou mudança de lugar",
  "Outro",
] as const;

export const QUANDO_COMECOU = [
  "Hoje",
  "Nesta semana",
  "Neste mês",
  "Há mais de um mês",
  "Sempre foi assim",
] as const;

export type Operacao = "sim" | "parcial" | "nao";

export const ROTULO_OPERACAO: Record<Operacao, string> = {
  sim: "Sim, ainda funciona",
  parcial: "Funciona com falhas",
  nao: "Não, está parado",
};

export const OPCOES_URGENCIA: {
  valor: Urgency;
  rotulo: string;
  descricao: string;
}[] = [
  { valor: "baixa", rotulo: "Baixa", descricao: "Dá para agendar com calma" },
  { valor: "normal", rotulo: "Normal", descricao: "Atrapalha, mas dá para trabalhar" },
  { valor: "alta", rotulo: "Alta", descricao: "Compromete o atendimento" },
  { valor: "parado", rotulo: "Parado", descricao: "Equipamento fora de uso" },
];

/* ------------------------------------------------------- pedido de orçamento */

export type TipoPedido = "compra" | "servico" | "plano";

export const ROTULO_TIPO_PEDIDO: Record<TipoPedido, string> = {
  compra: "Compra de equipamento",
  servico: "Serviço técnico",
  plano: "Plano de manutenção",
};

export const OPCOES_TIPO_PEDIDO: {
  valor: TipoPedido;
  rotulo: string;
  descricao: string;
}[] = [
  {
    valor: "compra",
    rotulo: "Comprar equipamento",
    descricao: "Novo, seminovo ou recondicionado",
  },
  {
    valor: "servico",
    rotulo: "Contratar serviço",
    descricao: "Instalação, reparo, visita técnica",
  },
  {
    valor: "plano",
    rotulo: "Plano de manutenção",
    descricao: "Preventiva programada na clínica",
  },
];

export const PRAZOS = [
  "O quanto antes",
  "Nas próximas duas semanas",
  "Neste mês",
  "Nos próximos três meses",
  "Ainda estou pesquisando",
] as const;

/* --------------------------------------------------------- tipos de serviço */

export const ROTULO_SERVICO: Record<ServiceKind, string> = {
  instalacao: "Instalação",
  visita_tecnica: "Visita técnica",
  manutencao_preventiva: "Manutenção preventiva",
  manutencao_corretiva: "Manutenção corretiva",
  treinamento: "Treinamento",
  retirada_equipamento: "Retirada de equipamento",
  outro: "Outros serviços",
};

/** Ordem em que os grupos aparecem na página de serviços. */
export const ORDEM_SERVICO: ServiceKind[] = [
  "manutencao_corretiva",
  "manutencao_preventiva",
  "visita_tecnica",
  "instalacao",
  "treinamento",
  "retirada_equipamento",
  "outro",
];

/* ------------------------------------------------- situação do chamado */

export type Situacao = {
  /** O que está acontecendo, em uma frase de cliente. */
  texto: string;
  /** O que a JB espera da pessoa agora. Vazio = nada. */
  pedido: string;
  tom: "andamento" | "aguardando" | "ok" | "alerta" | "neutro";
};

/**
 * Cada um dos catorze status traduzido para quem está do lado de fora, com o
 * pedido explícito. "Nada agora" também é resposta: o cliente precisa saber
 * quando pode simplesmente esperar.
 */
export const SITUACAO_CHAMADO: Record<ServiceRequestStatus, Situacao> = {
  solicitacao_recebida: {
    texto: "Seu chamado entrou na fila da equipe técnica.",
    pedido: "Nada agora. Guarde o número do chamado para acompanhar.",
    tom: "andamento",
  },
  triagem: {
    texto: "Estamos lendo o relato para definir técnico, peça e prazo.",
    pedido: "Deixe o telefone por perto: podemos ligar para confirmar detalhes.",
    tom: "andamento",
  },
  aguardando_cliente: {
    texto: "O atendimento está parado esperando uma resposta sua.",
    pedido: "Responda a mensagem da equipe no campo abaixo para seguirmos.",
    tom: "aguardando",
  },
  visita_agendada: {
    texto: "A visita técnica está marcada.",
    pedido: "Garanta acesso ao equipamento no horário combinado.",
    tom: "andamento",
  },
  tecnico_a_caminho: {
    texto: "O técnico já saiu para o atendimento.",
    pedido: "Deixe o local do equipamento livre para o trabalho.",
    tom: "andamento",
  },
  em_diagnostico: {
    texto: "O técnico está avaliando a causa da falha.",
    pedido: "Nada agora. O orçamento sai assim que o diagnóstico fechar.",
    tom: "andamento",
  },
  orcamento_enviado: {
    texto: "O orçamento do reparo foi enviado para você.",
    pedido: "Confira o orçamento e responda com a aprovação ou com suas dúvidas.",
    tom: "aguardando",
  },
  aguardando_aprovacao: {
    texto: "Estamos aguardando sua aprovação para executar o reparo.",
    pedido: "Sem a aprovação nenhuma peça é trocada. Responda aqui para liberar.",
    tom: "aguardando",
  },
  aprovado: {
    texto: "Orçamento aprovado. O serviço entrou na programação da equipe.",
    pedido: "Nada agora.",
    tom: "andamento",
  },
  aguardando_peca: {
    texto: "O reparo depende de uma peça que está a caminho.",
    pedido: "Nada agora. Avisamos assim que a peça chegar.",
    tom: "aguardando",
  },
  em_manutencao: {
    texto: "O reparo está em execução.",
    pedido: "Nada agora.",
    tom: "andamento",
  },
  testes: {
    texto: "O equipamento está em teste antes da devolução.",
    pedido: "Nada agora.",
    tom: "andamento",
  },
  concluido: {
    texto: "Atendimento concluído e equipamento em funcionamento.",
    pedido: "Se algo voltar a falhar, abra um novo chamado citando este número.",
    tom: "ok",
  },
  cancelado: {
    texto: "Este chamado foi cancelado.",
    pedido: "Se ainda precisar do atendimento, abra um novo chamado.",
    tom: "neutro",
  },
};

/* ----------------------------------------------------- como funciona */

/**
 * As seis etapas que o cliente vê, na mesma compressão que
 * `passosDoChamado` faz com os catorze status do fluxo interno. Serve à
 * página de venda do serviço; a linha do tempo real vem do banco.
 */
export const ETAPAS_PUBLICAS: { titulo: string; texto: string }[] = [
  {
    titulo: "Você abre o chamado",
    texto:
      "Em cinco passos, com fotos do problema quando der. Sai com número na hora, e é por ele que tudo é acompanhado.",
  },
  {
    titulo: "A equipe faz a triagem",
    texto:
      "Lemos o relato, definimos a urgência e escolhemos quem atende. Se faltar informação, perguntamos pelo próprio chamado.",
  },
  {
    titulo: "Visita agendada com você",
    texto:
      "Dia e período combinados conforme a sua disponibilidade. O técnico chega identificado e com o histórico do equipamento em mãos.",
  },
  {
    titulo: "Diagnóstico e orçamento",
    texto:
      "O técnico identifica a causa e envia o orçamento com peças e serviço detalhados. Nada é trocado antes da sua aprovação.",
  },
  {
    titulo: "Reparo e testes",
    texto:
      "Com o orçamento aprovado, o reparo é executado e o equipamento passa por teste antes de voltar ao uso.",
  },
  {
    titulo: "Conclusão registrada",
    texto:
      "O atendimento fecha com o que foi feito registrado no prontuário do equipamento — disponível sempre que precisar.",
  },
];
