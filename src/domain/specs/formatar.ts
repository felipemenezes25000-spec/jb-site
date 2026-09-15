import type {
  SpecDefinition,
  SpecUnit,
  SpecValue,
  ValorSpec,
} from "@/domain/specs/schema";

/* ============================================================================
   Um valor, um formato — em toda tela

   Este arquivo existe por causa de uma única célula da tabela do comparador,
   medida na auditoria:

       Voltagem:  220  ·  220  ·  bivolt
       Garantia:  6 meses  ·  1 ano  ·  1 ano

   Número sem unidade ao lado de texto em minúscula; meses ao lado de anos.
   Assim não dá para ordenar, filtrar nem comparar — nem por máquina nem por
   olho humano.

   A correção é separar o número da unidade na leitura e juntar os dois de um
   jeito só na escrita. `interpretarValor` faz a primeira metade;
   `formatarSpec` faz a segunda.

   Espaço fino (U+2009) antes da unidade: "220 V", nunca "220V". É o mesmo
   espaço que a tipografia técnica usa, e ele não quebra linha entre o número
   e a unidade.
   ============================================================================ */

/** Espaço fino, sem quebra, entre número e unidade. */
const ESPACO_UNIDADE = " ";

const SEPARADOR_MILHAR = /\B(?=(\d{3})+(?!\d))/g;

function numeroBr(valor: number, casas = 2) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/* --------------------------------------------------------- normalizações */

/** Bivolt, 110, 220 — um enum só, escrito de um jeito só. */
export function normalizarTensao(bruto: string): string | null {
  const texto = bruto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (/bivolt|110\s*\/\s*220|220\s*\/\s*110|automatic/.test(texto)) {
    return "Bivolt (110/220 V)";
  }

  /* Sem fronteira de palavra no fim: "127v" tem a letra colada no número, e
     `\b` exigiria um separador que o cadastro não escreveu. */
  const numero = texto.match(/\b(1[0-2]\d|2[0-4]\d)(?!\d)/);
  if (numero) return `${numero[1]}${ESPACO_UNIDADE}V`;

  return bruto.trim() || null;
}

/**
 * Garantia sempre em meses.
 *
 * "1 ano" e "12 meses" são o mesmo dado; guardá-los como textos diferentes é o
 * que faz o comparador mostrar uma coluna em anos e outra em meses.
 */
export function garantiaEmMeses(bruto: string | number | null): number | null {
  if (bruto === null) return null;
  if (typeof bruto === "number") return Number.isFinite(bruto) ? Math.trunc(bruto) : null;

  const texto = bruto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const anos = texto.match(/(\d+(?:[.,]\d+)?)\s*ano/);
  if (anos) return Math.round(Number(anos[1].replace(",", ".")) * 12);

  const meses = texto.match(/(\d+)\s*(?:mes|meses)/);
  if (meses) return Number(meses[1]);

  const soNumero = texto.match(/^\s*(\d+)\s*$/);
  if (soNumero) return Number(soNumero[1]);

  return null;
}

/** "6 meses" / "1 ano e 6 meses" — a leitura humana de um número de meses. */
export function textoDaGarantia(meses: number): string {
  if (meses <= 0) return "Sem garantia declarada";
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;

  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const parteAnos = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (resto === 0) return parteAnos;
  return `${parteAnos} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

/* ------------------------------------------------------ leitura do texto */

export type ValorInterpretado = {
  valor: ValorSpec;
  unidade?: SpecUnit;
};

const UNIDADES_NO_TEXTO: readonly { padrao: RegExp; unidade: SpecUnit }[] = [
  { padrao: /mw\s*\/\s*cm/i, unidade: "mW/cm²" },
  { padrao: /\bl\s*\/\s*min\b/i, unidade: "L/min" },
  { padrao: /\bn\.?\s?cm\b/i, unidade: "N.cm" },
  { padrao: /\bkhz\b/i, unidade: "kHz" },
  { padrao: /\brpm\b/i, unidade: "rpm" },
  { padrao: /\bbar\b/i, unidade: "bar" },
  { padrao: /°\s*c|graus/i, unidade: "°C" },
  { padrao: /\bdb\b/i, unidade: "dB" },
  { padrao: /\bnm\b/i, unidade: "nm" },
  { padrao: /\bhz\b/i, unidade: "Hz" },
  { padrao: /\bkg\b|quilos?/i, unidade: "kg" },
  { padrao: /\bml\b/i, unidade: "mL" },
  { padrao: /\bcm\b/i, unidade: "cm" },
  { padrao: /\bmm\b/i, unidade: "mm" },
  { padrao: /\bmin\b|minutos?/i, unidade: "min" },
  { padrao: /\bw\b|watts?/i, unidade: "W" },
  { padrao: /\bv\b|volts?/i, unidade: "V" },
  { padrao: /\bl\b|litros?/i, unidade: "L" },
] as const;

/**
 * As unidades que podem aparecer coladas ao número — e SÓ elas.
 *
 * Fechada de propósito. A versão anterior aceitava "qualquer palavra de até
 * cinco letras" e engolia o material da bandeja: "3 inox" virava "3 un".
 */
const UNIDADES_ESCRITAS = [
  "°\\s*C",
  "graus",
  "mW\\s*/\\s*cm²?",
  "L\\s*/\\s*min",
  "N\\.?\\s?cm",
  "kHz",
  "Hz",
  "rpm",
  "bar",
  "dB",
  "nm",
  "kV",
  "mA",
  "kg",
  "mL",
  "ml",
  "cm",
  "mm",
  "un",
  "pol",
  "min",
  "litros?",
  "minutos?",
  "segundos?",
  "quilos?",
  "gramas?",
  "volts?",
  "watts?",
  "amp[èe]res?",
  "ciclos?",
  "unidades?",
  "meses",
  "m[êe]s",
  "anos?",
  "horas?",
  "[VWALgshm]",
].join("|");

function numeroDe(texto: string): number | null {
  const casado = texto.replace(/\./g, "").match(/-?\d+(?:,\d+)?/);
  if (!casado) return null;
  const numero = Number(casado[0].replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Lê um valor livre do cadastro e devolve número + unidade quando dá.
 *
 * Quando não dá — "Aço inox 430", "LED com radiômetro" — devolve o texto
 * limpo. Preferimos texto honesto a número inventado.
 */
export function interpretarValor(
  bruto: string,
  definicao: SpecDefinition,
): ValorInterpretado {
  const texto = bruto.trim();
  if (!texto) return { valor: null };

  if (definicao.key === "tensao") {
    return { valor: normalizarTensao(texto) };
  }

  if (definicao.key === "garantia") {
    const meses = garantiaEmMeses(texto);
    return meses === null ? { valor: texto } : { valor: meses, unidade: "meses" };
  }

  const unidadeNoTexto = UNIDADES_NO_TEXTO.find((item) => item.padrao.test(texto));
  const unidade = unidadeNoTexto?.unidade ?? definicao.unit;

  if (definicao.format === "faixa") {
    const numeros = texto.match(/\d+(?:[.,]\d+)?/g);
    if (numeros && numeros.length >= 2) {
      const de = Number(numeros[0].replace(",", "."));
      const ate = Number(numeros[1].replace(",", "."));
      if (Number.isFinite(de) && Number.isFinite(ate)) {
        return { valor: [de, ate] as const, unidade };
      }
    }
  }

  if (definicao.format === "numero" || definicao.unit) {
    /* Só vira número quando o texto É o número, com no máximo uma UNIDADE
       CONHECIDA ao lado. Três casos que a auditoria expôs e que este
       casamento recusa:

         "121 °C e 134 °C"        duas temperaturas no campo "Ciclo" — um
                                  parser ingênuo devolvia "121" e a página
                                  passava a anunciar um ciclo que não existe;
         "12 L com secagem ativa" o texto diz mais que o número;
         "3 inox"                 "inox" NÃO é unidade, é o material da
                                  bandeja. Aceitar qualquer palavra curta como
                                  unidade transformava isto em "3 un" e
                                  apagava o inox da ficha.

       Por isso a lista é fechada e o padrão é ancorado nas duas pontas. O que
       não casar segue como texto, que é sempre a resposta segura. */
    const SO_NUMERO_E_UNIDADE = new RegExp(
      "^\\s*-?\\d+(?:[.,]\\d+)?\\s*(?:" + UNIDADES_ESCRITAS + ")?\\s*$",
      "i",
    );

    if (SO_NUMERO_E_UNIDADE.test(texto)) {
      const numero = numeroDe(texto);
      if (numero !== null) return { valor: numero, unidade };
    }
  }

  return { valor: texto, unidade: undefined };
}

/* ------------------------------------------------------- escrita na tela */

function comUnidade(corpo: string, unidade: SpecUnit | undefined) {
  if (!unidade) return corpo;
  return `${corpo}${ESPACO_UNIDADE}${unidade}`;
}

/**
 * O texto final de uma linha da ficha. Unidade vem da definição (ou do valor,
 * quando o cadastro trouxe outra) e nunca do texto digitado.
 */
export function formatarSpec(
  definicao: SpecDefinition,
  valor: SpecValue | null | undefined,
): string | null {
  if (!valor || valor.value === null || valor.value === "") return null;

  const unidade = valor.unit ?? definicao.unit;
  const bruto = valor.value;

  if (typeof bruto === "boolean") return bruto ? "Sim" : "Não";

  if (Array.isArray(bruto)) {
    const [de, ate] = bruto as readonly [number, number];
    return comUnidade(`${numeroBr(de)} a ${numeroBr(ate)}`, unidade);
  }

  if (typeof bruto === "number") {
    if (definicao.key === "garantia") return textoDaGarantia(bruto);
    if (definicao.key === "ano-fabricacao") return String(Math.trunc(bruto));
    if (unidade === "h" || unidade === "ciclos") {
      return comUnidade(String(Math.trunc(bruto)).replace(SEPARADOR_MILHAR, "."), unidade);
    }
    return comUnidade(numeroBr(bruto), unidade);
  }

  const texto = String(bruto).trim();
  if (!texto) return null;

  /* Texto que já carrega a unidade não a recebe de novo: "Bivolt (110/220 V)"
     não vira "Bivolt (110/220 V) V". */
  return texto;
}

/** Valor comparável entre produtos: número quando existe, senão texto normalizado. */
export function chaveDeComparacao(
  definicao: SpecDefinition,
  valor: SpecValue | null | undefined,
): number | string | null {
  if (!valor || valor.value === null) return null;
  const bruto = valor.value;
  if (typeof bruto === "number") return bruto;
  if (typeof bruto === "boolean") return bruto ? 1 : 0;
  if (Array.isArray(bruto)) return (bruto as readonly [number, number])[0];
  return String(bruto)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export { ESPACO_UNIDADE };
