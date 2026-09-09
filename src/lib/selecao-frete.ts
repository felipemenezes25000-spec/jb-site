export const COOKIE_ESCOLHA_FRETE = "jb_frete_escolha";

export type EscolhaFrete =
  | { kind: "retirada" }
  | { kind: "melhor_envio"; serviceId: number }
  | { kind: "tabela" };

export function serializarEscolhaFrete(escolha: EscolhaFrete) {
  if (escolha.kind === "retirada") return "retirada";
  if (escolha.kind === "tabela") return "tabela";
  return `me:${Math.trunc(escolha.serviceId)}`;
}

export function lerEscolhaFrete(valor: string | null | undefined): EscolhaFrete | null {
  const bruto = (valor ?? "").trim();
  if (bruto === "retirada") return { kind: "retirada" };
  if (bruto === "tabela") return { kind: "tabela" };
  const achou = bruto.match(/^me:(\d+)$/);
  if (!achou) return null;
  const serviceId = Number(achou[1]);
  return Number.isSafeInteger(serviceId) && serviceId > 0
    ? { kind: "melhor_envio", serviceId }
    : null;
}
