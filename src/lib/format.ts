/**
 * Formatação para o público brasileiro.
 *
 * Dinheiro trafega e é guardado em CENTAVOS (Int). Estas funções são o único
 * lugar que converte para exibição — nada de dividir por 100 espalhado pelo código.
 */

const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 489000 → "R$ 4.890,00" */
export function formatarPreco(centavos: number) {
  return moeda.format(centavos / 100);
}

/** 489000 → "4.890,00" (sem o símbolo, para tabelas e campos) */
export function formatarValor(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "4.890,00" ou "4890,00" ou "4890.00" → 489000 */
export function paraCentavos(entrada: string | number): number {
  if (typeof entrada === "number") return Math.round(entrada * 100);
  const limpo = entrada.trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  // com vírgula, o ponto é separador de milhar
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

/**
 * Parcelamento sem juros. Só exibe quando o valor da parcela fica acima do
 * mínimo configurado — nada de "12x de R$ 3,00".
 */
export function calcularParcelas(
  totalCents: number,
  maxParcelas = 12,
  minParcelaCents = 5000,
): { parcelas: number; valorCents: number } | null {
  if (totalCents <= 0) return null;
  for (let n = maxParcelas; n >= 2; n--) {
    const valor = Math.floor(totalCents / n);
    if (valor >= minParcelaCents) return { parcelas: n, valorCents: valor };
  }
  return null;
}

/* ------------------------------------------------------------------ datas */

export function formatarData(data: Date | string | null | undefined) {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

export function formatarDataHora(data: Date | string | null | undefined) {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

export function formatarDataExtensa(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data));
}

/** "em 22 dias", "hoje", "há 3 dias" */
export function distanciaEmDias(data: Date | string | null | undefined) {
  if (!data) return "—";
  const alvo = new Date(data);
  const hoje = new Date();
  const dias = Math.round(
    (Date.UTC(alvo.getFullYear(), alvo.getMonth(), alvo.getDate()) -
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) /
      86400000,
  );
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`;
}

/** Para <input type="date">, no fuso de São Paulo. */
export function paraInputDate(data: Date | string | null | undefined) {
  if (!data) return "";
  const d = new Date(data);
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return partes;
}

/* --------------------------------------------------------------- documentos */

export function somenteDigitos(valor: string) {
  return (valor ?? "").replace(/\D/g, "");
}

export function formatarTelefone(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

export function formatarCep(valor: string) {
  const d = somenteDigitos(valor);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor;
}

export function formatarDocumento(valor: string) {
  const d = somenteDigitos(valor);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return valor;
}

/** Validação real de CPF pelos dígitos verificadores. */
export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (posicao - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

/** Validação real de CNPJ pelos dígitos verificadores. */
export function cnpjValido(valor: string) {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calcular = (tamanho: number) => {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calcular(12) === Number(cnpj[12]) && calcular(13) === Number(cnpj[13]);
}

export function documentoValido(valor: string, tipo: "fisica" | "juridica") {
  return tipo === "fisica" ? cpfValido(valor) : cnpjValido(valor);
}

/* ------------------------------------------------------------------ texto */

export function gerarSlug(entrada: string) {
  return entrada
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function whatsappHref(telefone: string, mensagem?: string) {
  const d = somenteDigitos(telefone);
  if (!d) return "";
  const completo = d.startsWith("55") ? d : `55${d}`;
  const q = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${completo}${q}`;
}

export function telHref(telefone: string) {
  const d = somenteDigitos(telefone);
  return d ? `tel:+${d.startsWith("55") ? d : `55${d}`}` : "";
}

/** "1 item" / "3 itens" */
export function plural(n: number, singular: string, plural_: string) {
  return `${n} ${n === 1 ? singular : plural_}`;
}
