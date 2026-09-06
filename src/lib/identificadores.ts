/* ============================================================================
   Identificadores de produto — GTIN e MPN

   O escopo tem uma frase curta sobre isto e ela é a razão deste arquivo
   existir: "não transforme SKU interno em GTIN". É um erro fácil de cometer e
   caro de descobrir — o feed é aceito, os anúncios rodam, e um dia o Google
   casa o código com o produto de outra empresa. GTIN não é um campo de texto:
   é um número com dígito verificador, emitido por quem fabrica.

   Por isso a validação mora aqui, pura e testada, e não numa regex no
   formulário. O painel usa a mesma função que o feed e que o JSON-LD, e as
   três respostas são necessariamente iguais.
   ============================================================================ */

/** Comprimentos que o padrão admite: GTIN-8, UPC-12, EAN-13 e ITF-14. */
const COMPRIMENTOS = new Set([8, 12, 13, 14]);

export type ProblemaDeGtin =
  | "vazio"
  | "nao_numerico"
  | "comprimento"
  | "digito_verificador"
  | "sequencia_vazia"
  | "igual_ao_sku";

export const EXPLICACAO_DO_GTIN: Record<ProblemaDeGtin, string> = {
  vazio: "Informe o código de barras do fabricante ou deixe o campo em branco.",
  nao_numerico: "O GTIN é só dígitos — sem hífen, espaço ou letra.",
  comprimento: "Um GTIN válido tem 8, 12, 13 ou 14 dígitos.",
  digito_verificador:
    "O dígito verificador não confere. Confira o número impresso na embalagem: " +
    "um dígito trocado passa despercebido aqui e casa o produto com o de outra empresa lá.",
  sequencia_vazia: "Esse número não identifica produto nenhum.",
  igual_ao_sku:
    "Esse é o SKU interno da JB, não o código do fabricante. GTIN é emitido por quem " +
    "fabrica; usar o código interno no lugar dele anuncia o produto errado.",
};

/** Tira máscara e espaço. Não valida — só deixa o valor comparável. */
export function normalizarGtin(bruto: string | null | undefined): string {
  return (bruto ?? "").replace(/\D/g, "");
}

/**
 * O dígito verificador do GTIN.
 *
 * Da direita para a esquerda, sobre tudo menos o próprio dígito: pesos 3 e 1
 * alternados. O resto para completar a dezena é o dígito.
 */
function digitoEsperado(payload: string): number {
  let soma = 0;
  for (let i = payload.length - 1, peso = 3; i >= 0; i -= 1, peso = peso === 3 ? 1 : 3) {
    soma += Number(payload[i]) * peso;
  }
  return (10 - (soma % 10)) % 10;
}

/**
 * Confere um GTIN.
 *
 * Devolve `null` quando está bom, ou o problema. Campo vazio não é erro aqui:
 * GTIN é opcional, e o escopo manda não inventá-lo. Quem chama decide se a
 * ausência importa.
 */
export function conferirGtin(
  bruto: string | null | undefined,
  opcoes: { sku?: string | null } = {},
): ProblemaDeGtin | null {
  const original = (bruto ?? "").trim();
  if (!original) return null;

  if (!/^\d+$/.test(original)) return "nao_numerico";
  if (!COMPRIMENTOS.has(original.length)) return "comprimento";

  /* Zeros à esquerda são legítimos num GTIN, mas um número inteiro de zeros
     não identifica nada — é o valor que aparece quando alguém preenche o
     campo só para tirá-lo do vermelho. */
  if (/^0+$/.test(original)) return "sequencia_vazia";

  const sku = normalizarGtin(opcoes.sku);
  if (sku && sku === original) return "igual_ao_sku";

  const payload = original.slice(0, -1);
  const informado = Number(original.slice(-1));
  if (digitoEsperado(payload) !== informado) return "digito_verificador";

  return null;
}

/** Atalho para quem só quer saber se pode publicar o número. */
export function gtinValido(bruto: string | null | undefined, sku?: string | null): boolean {
  return Boolean((bruto ?? "").trim()) && conferirGtin(bruto, { sku }) === null;
}

/* ------------------------------------------------------------------- MPN */

export type ProblemaDeMpn = "comprimento" | "igual_ao_sku";

export const EXPLICACAO_DO_MPN: Record<ProblemaDeMpn, string> = {
  comprimento: "O MPN tem no máximo 70 caracteres.",
  igual_ao_sku:
    "Esse é o SKU interno da JB. O MPN é o código que o fabricante dá à peça — " +
    "se ele não estiver na etiqueta ou no manual, deixe em branco.",
};

/** No máximo 70 caracteres, e nunca o código interno da JB. */
export function conferirMpn(
  bruto: string | null | undefined,
  opcoes: { sku?: string | null } = {},
): ProblemaDeMpn | null {
  const valor = (bruto ?? "").trim();
  if (!valor) return null;
  if (valor.length > 70) return "comprimento";

  const sku = (opcoes.sku ?? "").trim();
  if (sku && sku.toLowerCase() === valor.toLowerCase()) return "igual_ao_sku";

  return null;
}
