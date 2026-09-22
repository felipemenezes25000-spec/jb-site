/* ============================================================================
   Diagnóstico em 3 toques

   Equipamento, defeito e situação da clínica viram uma mensagem de WhatsApp
   já escrita. A pessoa revisa e envia; o site não manda nada sozinho.

   Módulo puro de propósito: sem banco, sem `server-only`. É lido pela abertura
   da home (cliente) e pelos testes unitários.

   A lista de equipamentos começa pelas linhas da EVOXX, de quem a JB é
   assistência técnica autorizada (lista oficial em evoxx.com.br/assistencia),
   e segue com o que toda clínica tem. Um defeito aqui é o que o dentista vê,
   não o laudo do técnico: "não pressuriza", e não "falha na válvula".
   ============================================================================ */

export type IdEquipamento =
  | "autoclave"
  | "compressor"
  | "bomba-vacuo"
  | "cadeira"
  | "seladora"
  | "destilador"
  | "lavadora"
  | "outro";

export type Equipamento = {
  id: IdEquipamento;
  nome: string;
  /** Linha fabricada pela EVOXX, coberta pela autorização da JB. */
  evoxx: boolean;
  defeitos: readonly string[];
};

export const EQUIPAMENTOS: readonly Equipamento[] = [
  {
    id: "autoclave",
    nome: "Autoclave",
    evoxx: true,
    defeitos: [
      "Não pressuriza",
      "Não esquenta",
      "Vaza água ou vapor",
      "Material sai molhado",
      "Mostra erro no painel",
      "Não liga",
    ],
  },
  {
    id: "compressor",
    nome: "Compressor",
    evoxx: true,
    defeitos: [
      "Não liga",
      "Não chega na pressão",
      "Liga e desliga sem parar",
      "Barulho ou vibração forte",
      "Sai água ou óleo no ar",
      "Vazamento de ar",
    ],
  },
  {
    id: "bomba-vacuo",
    nome: "Bomba de vácuo",
    evoxx: true,
    defeitos: [
      "Sem sucção",
      "Sucção fraca",
      "Barulho anormal",
      "Não liga",
      "Vazamento",
    ],
  },
  {
    id: "cadeira",
    nome: "Cadeira e equipo",
    evoxx: false,
    defeitos: [
      "Não sobe ou não desce",
      "Pedal não responde",
      "Refletor não acende",
      "Canetas sem força ou sem spray",
      "Vazamento de água",
      "Não liga",
    ],
  },
  {
    id: "seladora",
    nome: "Seladora",
    evoxx: true,
    defeitos: ["Não sela direito", "Não esquenta", "Queima o papel", "Não liga"],
  },
  {
    id: "destilador",
    nome: "Destilador",
    evoxx: true,
    defeitos: ["Não destila", "Vazamento", "Não desliga sozinho", "Não liga"],
  },
  {
    id: "lavadora",
    nome: "Lavadora ultrassônica",
    evoxx: true,
    defeitos: ["Não vibra", "Não esquenta", "Vazamento", "Não liga"],
  },
  {
    id: "outro",
    nome: "Outro equipamento",
    evoxx: false,
    defeitos: [
      "Não liga",
      "Liga e desliga sozinho",
      "Vazamento",
      "Barulho ou vibração",
      "Mostra erro no painel",
      "Preciso de revisão",
    ],
  },
];

export type IdSituacao = "parado" | "falhando" | "revisao";

export type Situacao = {
  id: IdSituacao;
  /** O que a pessoa toca. */
  rotulo: string;
  /** Como a frase entra na mensagem. */
  naMensagem: string;
};

export const SITUACOES: readonly Situacao[] = [
  {
    id: "parado",
    rotulo: "Parado, não consigo atender",
    naMensagem: "está parado e não consigo atender",
  },
  {
    id: "falhando",
    rotulo: "Funciona, mas com falha",
    naMensagem: "ainda funciona, mas com falha",
  },
  {
    id: "revisao",
    rotulo: "Quero revisar antes que pare",
    naMensagem: "quero uma revisão antes que pare",
  },
];

export function equipamentoPorId(id: string | null | undefined): Equipamento | null {
  return EQUIPAMENTOS.find((equipamento) => equipamento.id === id) ?? null;
}

export function situacaoPorId(id: string | null | undefined): Situacao | null {
  return SITUACOES.find((situacao) => situacao.id === id) ?? null;
}

export type Escolhas = {
  equipamento?: IdEquipamento | null;
  defeito?: string | null;
  situacao?: IdSituacao | null;
  cidade?: string | null;
};

/** Primeira mensagem, quando ninguém tocou em nada. */
export const MENSAGEM_PADRAO =
  "Olá, JB! Vim pelo site e preciso de assistência técnica para um equipamento odontológico.";

/** Cidade digitada vira texto curto: sem quebra de linha e sem textão. */
function limparCidade(cidade: string | null | undefined) {
  return (cidade ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Monta a mensagem com o que já foi escolhido.
 *
 * Cada linha só entra quando existe. O negrito usa a marcação do próprio
 * WhatsApp (`*assim*`), que chega formatada para a equipe e continua legível
 * se alguém colar o texto em outro lugar.
 */
export function montarMensagem(escolhas: Escolhas): string {
  const equipamento = equipamentoPorId(escolhas.equipamento);
  const situacao = situacaoPorId(escolhas.situacao);
  const defeito = equipamento?.defeitos.includes(escolhas.defeito ?? "")
    ? escolhas.defeito
    : null;
  const cidade = limparCidade(escolhas.cidade);

  if (!equipamento) return MENSAGEM_PADRAO;

  const linhas = ["Olá, JB! Vim pelo site e preciso de assistência técnica.", ""];
  linhas.push(`*Equipamento:* ${equipamento.nome}`);
  if (defeito) linhas.push(`*Problema:* ${defeito}`);
  if (situacao) linhas.push(`*Situação:* ${situacao.naMensagem}`);
  if (cidade) linhas.push(`*Cidade:* ${cidade}`);

  return linhas.join("\n");
}

/** Quantos dos 3 toques já foram dados. A cidade é opcional e não conta. */
export function toquesDados(escolhas: Escolhas): number {
  const equipamento = equipamentoPorId(escolhas.equipamento);
  if (!equipamento) return 0;
  if (!escolhas.defeito || !equipamento.defeitos.includes(escolhas.defeito)) return 1;
  if (!situacaoPorId(escolhas.situacao)) return 2;
  return 3;
}
