export const COOKIE_ESCOLHA_FRETE = "jb_frete_escolha";

export type EscolhaFrete =
  | { kind: "retirada" }
  | { kind: "melhor_envio"; serviceId: number; companyId?: number }
  | { kind: "tabela" };

export function serializarEscolhaFrete(escolha: EscolhaFrete) {
  if (escolha.kind === "retirada") return "retirada";
  if (escolha.kind === "tabela") return "tabela";
  return escolha.companyId
    ? `me:${Math.trunc(escolha.serviceId)}:${Math.trunc(escolha.companyId)}`
    : `me:${Math.trunc(escolha.serviceId)}`;
}

export function lerEscolhaFrete(valor: string | null | undefined): EscolhaFrete | null {
  const bruto = (valor ?? "").trim();
  if (bruto === "retirada") return { kind: "retirada" };
  if (bruto === "tabela") return { kind: "tabela" };

  // Formato novo: me:<serviceId>:<companyId>. O formato antigo sem companyId
  // continua válido para não expulsar quem já estava com checkout aberto.
  const achou = bruto.match(/^me:(\d+)(?::(\d+))?$/);
  if (!achou) return null;
  const serviceId = Number(achou[1]);
  const companyId = achou[2] ? Number(achou[2]) : undefined;
  if (!Number.isSafeInteger(serviceId) || serviceId <= 0) return null;
  if (companyId !== undefined && (!Number.isSafeInteger(companyId) || companyId <= 0)) return null;
  return { kind: "melhor_envio", serviceId, ...(companyId ? { companyId } : {}) };
}
