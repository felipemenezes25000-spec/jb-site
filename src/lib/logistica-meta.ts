export const MARCADOR_MELHOR_ENVIO = "[[JB_MELHOR_ENVIO:";

export type ProdutoPacoteMelhorEnvio = {
  id: string;
  quantity: number;
};

export type PacoteMelhorEnvio = {
  height: number;
  width: number;
  length: number;
  weight: number;
  insuranceValue?: number;
  /** Mapeamento devolvido pela cotação. Necessário para separar etiquetas multivolume. */
  products?: ProdutoPacoteMelhorEnvio[];
};

export type ProviderShipmentMelhorEnvio = {
  id: string;
  /** -1 = uma etiqueta agrupando todos os volumes; >= 0 = índice do pacote isolado. */
  packageIndex: number;
};

export type MetaMelhorEnvio = {
  provider: "melhor_envio";
  companyId?: number;
  serviceId?: number;
  serviceName?: string;
  companyName?: string;
  quotedPriceCents?: number;
  estimatedDays?: number | null;
  packages?: PacoteMelhorEnvio[];

  /** Compatibilidade com pedidos gravados antes do suporte a múltiplas etiquetas. */
  providerOrderIds?: string[];
  /** Estrutura nova: permite retomar pacote a pacote sem comprar o mesmo volume duas vezes. */
  providerShipments?: ProviderShipmentMelhorEnvio[];

  status?: string;
  trackingCode?: string;
  trackingCodes?: string[];
  labelUrl?: string;
  invoiceKey?: string;
  error?: string;

  /** Lock otimista. Fica na própria linha do pedido; não mantém transação aberta durante HTTP. */
  lockToken?: string;
  lockAcquiredAt?: string;
  updatedAt?: string;
};

// Evita a flag `s` para continuar compatível com o target TS atual do projeto.
// O JSON gerado é uma linha, mas [\s\S] também tolera blocos legados quebrados
// em várias linhas sem depender de ES2018.
const REGEX = /\[\[JB_MELHOR_ENVIO:(\{[\s\S]*?\})\]\]/;

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
