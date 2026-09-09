export const MARCADOR_MELHOR_ENVIO = "[[JB_MELHOR_ENVIO:";

export type PacoteMelhorEnvio = {
  height: number;
  width: number;
  length: number;
  weight: number;
};

export type MetaMelhorEnvio = {
  provider: "melhor_envio";
  serviceId?: number;
  serviceName?: string;
  companyName?: string;
  quotedPriceCents?: number;
  estimatedDays?: number | null;
  packages?: PacoteMelhorEnvio[];
  providerOrderIds?: string[];
  status?: string;
  trackingCode?: string;
  labelUrl?: string;
  invoiceKey?: string;
  error?: string;
  updatedAt?: string;
};

const REGEX = /\[\[JB_MELHOR_ENVIO:(\{.*?\})\]\]/s;

export function lerMetaMelhorEnvio(nota: string | null | undefined): MetaMelhorEnvio | null {
  const achou = (nota ?? "").match(REGEX);
  if (!achou?.[1]) return null;

  try {
    const bruto = JSON.parse(achou[1]) as unknown;
    if (!bruto || typeof bruto !== "object") return null;
    const meta = bruto as Partial<MetaMelhorEnvio>;
    return meta.provider === "melhor_envio" ? (meta as MetaMelhorEnvio) : null;
  } catch {
    return null;
  }
}

export function semMetaMelhorEnvio(nota: string | null | undefined): string {
  return (nota ?? "").replace(REGEX, "").trim();
}

export function escreverMetaMelhorEnvio(
  nota: string | null | undefined,
  meta: MetaMelhorEnvio,
): string {
  const humana = semMetaMelhorEnvio(nota);
  const atualizada: MetaMelhorEnvio = {
    ...meta,
    provider: "melhor_envio",
    updatedAt: new Date().toISOString(),
  };
  const bloco = `${MARCADOR_MELHOR_ENVIO}${JSON.stringify(atualizada)}]]`;
  return [humana, bloco].filter(Boolean).join("\n\n");
}

export function ehFreteMelhorEnvio(rotulo: string | null | undefined): boolean {
  return (rotulo ?? "").startsWith("Melhor Envio · ");
}

export function partesDoRotuloMelhorEnvio(rotulo: string | null | undefined) {
  if (!ehFreteMelhorEnvio(rotulo)) return null;
  const [, companyName = "", serviceName = ""] = (rotulo ?? "").split(" · ");
  return { companyName, serviceName };
}
