/* ============================================================================
   Ficha técnica — o contrato único

   Antes deste arquivo, o mesmo dado técnico era digitado em sete lugares da
   página do produto e lido por três telas com três formatos diferentes. A
   auditoria mediu: "220 V" aparecia cinco vezes, com três rótulos (Tensão,
   Alimentação, Voltagem) e dois formatos ("220" e "220 V"); a garantia saía
   como "6 meses" numa tela e "1 ano" na outra; o comparador anunciava "8 de 10
   atributos mudam" sem mostrar capacidade, ciclo ou bandejas — justamente os
   três que decidem a compra de uma autoclave.

   A causa nunca foi de layout. Era a falta de um objeto tipado: cada produto
   inventava as próprias chaves em seis pares livres de texto, e por isso nada
   comparava, nada filtrava e tudo precisava ser repetido à mão.

   Este módulo é a fonte única.

   - `SpecDefinition` declara o atributo UMA vez: chave estável, rótulo único,
     grupo, unidade, se entra no comparador e se é decisivo.
   - `SpecValue` é o valor daquele atributo neste produto, com a procedência
     (fabricante, medido pela JB, estimado) — o selo "medido pela JB" é o
     diferencial competitivo que nenhum concorrente de seminovo tem.
   - Rótulo, unidade e ordem NUNCA vêm do produto: vêm da definição.

   Quem renderiza (`@/components/specs/*`) só lê. Quem escreve (`construir.ts`)
   normaliza o que já existe no banco para estas chaves.
   ============================================================================ */

/** Unidades reconhecidas. O valor guarda o número; a unidade vem daqui. */
export type SpecUnit =
  | "V"
  | "Hz"
  | "W"
  | "A"
  | "L"
  | "mL"
  | "kg"
  | "g"
  | "mm"
  | "cm"
  | "min"
  | "s"
  | "h"
  | "meses"
  | "anos"
  | "bar"
  | "°C"
  | "rpm"
  | "kHz"
  | "nm"
  | "dB"
  | "N.cm"
  | "mW/cm²"
  | "L/min"
  | "un"
  | "ciclos";

/**
 * Os cinco grupos da ficha, sempre nesta ordem, em toda a plataforma.
 *
 * `unidade` só existe para equipamento que não é novo: é o que descreve ESTA
 * unidade física — número de série, uso acumulado e o laudo item a item.
 */
export type SpecGroupId =
  | "identidade"
  | "desempenho"
  | "instalacao"
  | "comercial"
  | "unidade";

export const GRUPOS_DA_FICHA: readonly {
  id: SpecGroupId;
  titulo: string;
  resumo: string;
}[] = [
  {
    id: "identidade",
    titulo: "Identidade",
    resumo: "Quem fabricou, qual modelo e sob qual registro sanitário.",
  },
  {
    id: "desempenho",
    titulo: "Desempenho",
    resumo: "Os números que definem o que este equipamento faz.",
  },
  {
    id: "instalacao",
    titulo: "Instalação e espaço",
    resumo: "O que a clínica precisa ter para receber o equipamento.",
  },
  {
    id: "comercial",
    titulo: "O que vem junto",
    resumo: "Garantia, itens inclusos e o que é cobrado à parte.",
  },
  {
    id: "unidade",
    titulo: "Esta unidade",
    resumo: "Histórico e inspeção da unidade física que sai daqui.",
  },
] as const;

export type FormatoSpec =
  | "numero"
  | "faixa"
  | "texto"
  | "booleano"
  | "enum"
  | "dimensao";

/** Famílias de equipamento. `generico` atende cadastro sem família reconhecida. */
export type FamiliaEquipamento =
  | "autoclave"
  | "seladora"
  | "fotopolimerizador"
  | "ultrassom"
  | "compressor"
  | "cadeira"
  | "motor-implante"
  | "aspirador"
  | "imagem"
  | "lavadora"
  | "generico";

export type SpecDefinition = {
  /** Chave única e estável no sistema. Nunca traduzida, nunca duplicada. */
  key: string;
  /** Rótulo ÚNICO. Sinônimo é bug: "Tensão" existe, "Alimentação" não. */
  label: string;
  group: SpecGroupId;
  unit?: SpecUnit;
  format?: FormatoSpec;
  /** Entra na tabela do comparador. */
  comparable: boolean;
  /** Sobe para o resumo de três linhas no topo da PDP. */
  decisive: boolean;
  /** Explica o atributo para quem não é técnico. */
  helpText?: string;
  /** Em que famílias este atributo faz sentido. Vazio = todas. */
  appliesTo?: readonly FamiliaEquipamento[];
  /**
   * Rótulos livres já cadastrados que significam este atributo. É o que
   * permite unificar o acervo existente sem reescrever produto a produto.
   */
  aliases?: readonly RegExp[];
  /** Ordem dentro do grupo. Menor aparece antes. */
  order: number;
};

export type ProcedenciaSpec = "fabricante" | "inspecao-jb" | "estimado";

export const PROCEDENCIA: Record<
  ProcedenciaSpec,
  { rotulo: string; descricao: string }
> = {
  fabricante: {
    rotulo: "fabricante",
    descricao: "Informado pelo fabricante no catálogo ou no manual do equipamento.",
  },
  "inspecao-jb": {
    rotulo: "medido pela JB",
    descricao: "Conferido na bancada da JB durante a inspeção desta unidade.",
  },
  estimado: {
    rotulo: "estimado",
    descricao: "Estimativa da equipe. Não substitui a medição do fabricante.",
  },
};

export type ValorSpec =
  | string
  | number
  | boolean
  | readonly [number, number]
  | null;

export type SpecValue = {
  key: string;
  value: ValorSpec;
  /** Sobrepõe a unidade da definição quando o cadastro trouxe outra. */
  unit?: SpecUnit;
  source: ProcedenciaSpec;
  /** Ex.: "medido na inspeção de 08/09/2026". */
  note?: string;
};

/** Uma linha pronta para renderizar: definição + valor, já casados. */
export type LinhaDaFicha = {
  definicao: SpecDefinition;
  valor: SpecValue | null;
  /** Texto final, com unidade. `null` quando não há dado. */
  texto: string | null;
};

export type GrupoDaFicha = {
  id: SpecGroupId;
  titulo: string;
  resumo: string;
  linhas: LinhaDaFicha[];
};

export type FichaDeEspecificacoes = {
  familia: FamiliaEquipamento;
  grupos: GrupoDaFicha[];
  /** Total de linhas COM dado. É o número que a página pode prometer. */
  total: number;
  /** As três decisivas da família, para o topo da PDP. */
  decisivas: LinhaDaFicha[];
  /** Procedências realmente presentes na ficha. */
  procedencias: ProcedenciaSpec[];
};
