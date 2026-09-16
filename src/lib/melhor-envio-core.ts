import "server-only";

import crypto from "node:crypto";

import { somenteDigitos } from "@/lib/format";
import {
  escreverMetaMelhorEnvio,
  lerMetaMelhorEnvio,
  partesDoRotuloMelhorEnvio,
  type MetaMelhorEnvio,
  type PacoteMelhorEnvio,
  type ProviderShipmentMelhorEnvio,
} from "@/lib/logistica-meta";
import { prisma } from "@/lib/prisma";

export type ItemCotacaoMelhorEnvio = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
};

export type OpcaoMelhorEnvio = {
  key: string;
  companyId: number;
  serviceId: number;
  serviceName: string;
  companyName: string;
  priceCents: number;
  deliveryDays: number | null;
  packages: PacoteMelhorEnvio[];
};

type Configuracao = {
  enabled: boolean;
  environment: "sandbox" | "production";
  baseUrl: string;
  token: string;
  userAgent: string;
  fromPostalCode: string;
  services: string;
  nonCommercial: boolean;
  agencyByCompany: Map<number, number>;
  singleVolumeCompanyIds: Set<number>;
  commercialDisabledCompanyIds: Set<number>;
};

type PedidoParaEnvio = Awaited<ReturnType<typeof carregarPedido>>;
type PedidoValido = NonNullable<PedidoParaEnvio>;
type ItemPedido = PedidoValido["items"][number];

const LOCK_TTL_MS = 2 * 60_000;
const SERVICOS_SEM_VOLUME_AGRUPADO = new Set([1, 2, 17, 27]);

function sim(valor: string | undefined) {
  return ["1", "true", "sim", "on", "yes"].includes((valor ?? "").trim().toLowerCase());
}

function numerosCsv(valor: string | undefined): number[] {
  return (valor ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isSafeInteger(item) && item > 0);
}

function mapaAgencias(valor: string | undefined): Map<number, number> {
  const resultado = new Map<number, number>();
  const bruto = (valor ?? "").trim();
  if (!bruto) return resultado;

  if (bruto.startsWith("{")) {
    try {
      const json = JSON.parse(bruto) as Record<string, unknown>;
      for (const [empresa, agencia] of Object.entries(json)) {
        const companyId = Number(empresa);
        const agencyId = Number(agencia);
        if (Number.isSafeInteger(companyId) && companyId > 0 && Number.isSafeInteger(agencyId) && agencyId > 0) {
          resultado.set(companyId, agencyId);
        }
      }
      return resultado;
    } catch {
      return resultado;
    }
  }

  for (const par of bruto.split(",")) {
    const [empresa, agencia] = par.split(":");
    const companyId = Number(empresa?.trim());
    const agencyId = Number(agencia?.trim());
    if (Number.isSafeInteger(companyId) && companyId > 0 && Number.isSafeInteger(agencyId) && agencyId > 0) {
      resultado.set(companyId, agencyId);
    }
  }
  return resultado;
}

function config(): Configuracao {
  const environment =
    (process.env.MELHOR_ENVIO_ENV ?? "sandbox").trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  const token = (process.env.MELHOR_ENVIO_TOKEN ?? "").trim();
  const userAgent = (process.env.MELHOR_ENVIO_USER_AGENT ?? "").trim();
  const fromPostalCode = somenteDigitos(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE ?? "");
  const provider = (process.env.SHIPPING_PROVIDER ?? "").trim().toLowerCase();

  // A referência atual de cotação ainda proíbe compra comercial da Azul sem
  // XML da NF-e. A JB trabalha com chave, não com XML; por isso company 9 fica
  // fora por padrão. A variável existe para a lista acompanhar uma mudança da
  // API sem depender de release do site.
  const bloqueioComercial =
    process.env.MELHOR_ENVIO_COMMERCIAL_DISABLED_COMPANY_IDS === undefined
      ? "9"
      : process.env.MELHOR_ENVIO_COMMERCIAL_DISABLED_COMPANY_IDS;

  return {
    enabled: provider === "melhor_envio" || token !== "",
    environment,
    baseUrl:
      environment === "production"
        ? "https://melhorenvio.com.br"
        : "https://sandbox.melhorenvio.com.br",
    token,
    userAgent,
    fromPostalCode,
    services: (process.env.MELHOR_ENVIO_SERVICES ?? "").trim(),
    nonCommercial: sim(process.env.MELHOR_ENVIO_NON_COMMERCIAL),
    agencyByCompany: mapaAgencias(process.env.MELHOR_ENVIO_AGENCY_BY_COMPANY),
    singleVolumeCompanyIds: new Set(numerosCsv(process.env.MELHOR_ENVIO_SINGLE_VOLUME_COMPANY_IDS)),
    commercialDisabledCompanyIds: new Set(numerosCsv(bloqueioComercial)),
  };
}

const CAMPOS_REMETENTE = [
  "MELHOR_ENVIO_FROM_NAME",
  "MELHOR_ENVIO_FROM_EMAIL",
  "MELHOR_ENVIO_FROM_PHONE",
  "MELHOR_ENVIO_FROM_DOCUMENT",
  "MELHOR_ENVIO_FROM_ADDRESS",
  "MELHOR_ENVIO_FROM_NUMBER",
  "MELHOR_ENVIO_FROM_DISTRICT",
  "MELHOR_ENVIO_FROM_CITY",
  "MELHOR_ENVIO_FROM_STATE",
  "MELHOR_ENVIO_FROM_POSTAL_CODE",
] as const;

export function statusMelhorEnvio() {
  const c = config();
  const faltandoCotacao: string[] = [];
  if (!c.token) faltandoCotacao.push("MELHOR_ENVIO_TOKEN");
  if (!c.userAgent) faltandoCotacao.push("MELHOR_ENVIO_USER_AGENT");
  if (c.fromPostalCode.length !== 8) faltandoCotacao.push("MELHOR_ENVIO_FROM_POSTAL_CODE");

  const faltandoEtiqueta = [...faltandoCotacao];
  for (const nome of CAMPOS_REMETENTE) {
    if (!(process.env[nome] ?? "").trim() && !faltandoEtiqueta.includes(nome)) {
      faltandoEtiqueta.push(nome);
    }
  }
  if (!c.nonCommercial && !(process.env.MELHOR_ENVIO_FROM_STATE_REGISTER ?? "").trim()) {
    faltandoEtiqueta.push("MELHOR_ENVIO_FROM_STATE_REGISTER");
  }

  return {
    enabled: c.enabled,
    environment: c.environment,
    quoteReady: c.enabled && faltandoCotacao.length === 0,
    labelReady: c.enabled && faltandoEtiqueta.length === 0,
    nonCommercial: c.nonCommercial,
    missingQuote: faltandoCotacao,
    missingLabel: faltandoEtiqueta,
  };
}

export class ErroMelhorEnvio extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ErroMelhorEnvio";
  }
}

export class ErroDimensoesFrete extends Error {
  constructor(readonly produtos: string[]) {
    super(`Produtos sem peso/dimensões de transporte: ${produtos.join(", ")}`);
    this.name = "ErroDimensoesFrete";
  }
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() !== "") {
    const n = Number(valor.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

async function requisicao<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const c = config();
  if (!c.enabled) throw new ErroMelhorEnvio("Integração com Melhor Envio desativada.");
  if (!c.token || !c.userAgent) {
    throw new ErroMelhorEnvio("Credenciais do Melhor Envio incompletas.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const resposta = await fetch(`${c.baseUrl}${path}`, {
      method: init.method ?? "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": c.userAgent,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      cache: "no-store",
    });

    const bruto = await resposta.text();
    let dados: unknown = null;
    try {
      dados = bruto ? JSON.parse(bruto) : null;
    } catch {
      dados = bruto;
    }

    if (!resposta.ok) {
      const detalhe = typeof dados === "string" ? dados : JSON.stringify(dados ?? {});
      throw new ErroMelhorEnvio(
        `Melhor Envio respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 700)}` : ""}`,
        resposta.status,
      );
    }

    return dados as T;
  } catch (erro) {
    if (erro instanceof ErroMelhorEnvio) throw erro;
    if (erro instanceof Error && erro.name === "AbortError") {
      throw new ErroMelhorEnvio("Tempo esgotado ao falar com o Melhor Envio.");
    }
    throw new ErroMelhorEnvio("Não foi possível acessar o Melhor Envio agora.");
  } finally {
    clearTimeout(timeout);
  }
}

function produtoValido(item: ItemCotacaoMelhorEnvio) {
  return (
    item.quantity > 0 &&
    (item.weightGrams ?? 0) > 0 &&
    (item.widthMm ?? 0) > 0 &&
    (item.heightMm ?? 0) > 0 &&
    (item.depthMm ?? 0) > 0
  );
}

function pacotesDaResposta(bruto: unknown): PacoteMelhorEnvio[] {
  return lista(bruto)
    .map((item) => {
      const p = objeto(item);
      const d = objeto(p.dimensions);
      const height = numero(d.height ?? p.height) ?? 0;
      const width = numero(d.width ?? p.width) ?? 0;
      const length = numero(d.length ?? p.length) ?? 0;
      const weight = numero(p.weight) ?? 0;
      const insuranceValue = numero(p.insurance_value) ?? undefined;
      const products = lista(p.products)
        .flatMap((produto) => {
          const pr = objeto(produto);
          const id = texto(pr.id);
          const quantity = numero(pr.quantity);
          return id && quantity !== null && quantity > 0
            ? [{ id, quantity: Math.max(1, Math.trunc(quantity)) }]
            : [];
        });
      return {
        height,
        width,
        length,
        weight,
        ...(insuranceValue !== undefined ? { insuranceValue } : {}),
        ...(products.length > 0 ? { products } : {}),
      };
    })
    .filter((p) => p.height > 0 && p.width > 0 && p.length > 0 && p.weight > 0);
}

export async function cotacoesMelhorEnvio(entrada: {
  postalCode: string;
  items: readonly ItemCotacaoMelhorEnvio[];
}): Promise<OpcaoMelhorEnvio[]> {
  const c = config();
  const destino = somenteDigitos(entrada.postalCode);
  if (!statusMelhorEnvio().quoteReady) {
    throw new ErroMelhorEnvio("Cotação do Melhor Envio não configurada.");
  }
  if (destino.length !== 8) throw new ErroMelhorEnvio("CEP de destino inválido.");

  const fisicos = entrada.items.filter((item) => item.quantity > 0);
  const invalidos = fisicos.filter((item) => !produtoValido(item)).map((item) => item.name);
  if (invalidos.length > 0) throw new ErroDimensoesFrete(invalidos);
  if (fisicos.length === 0) return [];

  const body: Record<string, unknown> = {
    from: { postal_code: c.fromPostalCode },
    to: { postal_code: destino },
    products: fisicos.map((item) => ({
      id: item.id,
      width: Number(((item.widthMm ?? 0) / 10).toFixed(2)),
      height: Number(((item.heightMm ?? 0) / 10).toFixed(2)),
      length: Number(((item.depthMm ?? 0) / 10).toFixed(2)),
      weight: Number(((item.weightGrams ?? 0) / 1000).toFixed(3)),
      insurance_value: Number((Math.max(0, item.unitPriceCents) / 100).toFixed(2)),
      quantity: Math.max(1, Math.trunc(item.quantity)),
    })),
    options: { receipt: false, own_hand: false },
  };
  if (c.services) body.services = c.services;

  const resposta = await requisicao<unknown>("/api/v2/me/shipment/calculate", { body });

  return lista(resposta)
    .flatMap((item): OpcaoMelhorEnvio[] => {
      const r = objeto(item);
      if (r.error || r.errors) return [];

      const serviceId = numero(r.id);
      const price = numero(r.custom_price ?? r.price);
      const company = objeto(r.company);
      const companyId = numero(company.id);
      if (
        serviceId === null ||
        companyId === null ||
        price === null ||
        price < 0 ||
        (!c.nonCommercial && c.commercialDisabledCompanyIds.has(Math.trunc(companyId)))
      ) {
        return [];
      }

      const companyName = texto(company.name) || "Transportadora";
      const serviceName = texto(r.name) || `Serviço ${serviceId}`;
      const packages = pacotesDaResposta(r.packages);
      if (packages.length === 0) return [];

      const dias = numero(r.custom_delivery_time ?? r.delivery_time);
      return [
        {
          key: `me:${Math.trunc(serviceId)}`,
          companyId: Math.trunc(companyId),
          serviceId: Math.trunc(serviceId),
          serviceName,
          companyName,
          priceCents: Math.max(0, Math.round(price * 100)),
          deliveryDays: dias === null ? null : Math.max(0, Math.trunc(dias)),
          packages,
        },
      ];
    })
    .sort((a, b) => a.priceCents - b.priceCents || (a.deliveryDays ?? 999) - (b.deliveryDays ?? 999));
}

function rotulo(opcao: Pick<OpcaoMelhorEnvio, "companyName" | "serviceName">) {
  return `Melhor Envio · ${opcao.companyName} · ${opcao.serviceName}`;
}

export function rotuloDaOpcaoMelhorEnvio(opcao: OpcaoMelhorEnvio) {
  return rotulo(opcao);
}

function remetente(nonCommercial: boolean) {
  const documento = somenteDigitos(process.env.MELHOR_ENVIO_FROM_DOCUMENT ?? "");
  const stateRegister = (process.env.MELHOR_ENVIO_FROM_STATE_REGISTER ?? "").trim();
  const base: Record<string, unknown> = {
    name: (process.env.MELHOR_ENVIO_FROM_NAME ?? "").trim(),
    email: (process.env.MELHOR_ENVIO_FROM_EMAIL ?? "").trim(),
    phone: somenteDigitos(process.env.MELHOR_ENVIO_FROM_PHONE ?? ""),
    state_register: nonCommercial ? stateRegister || "ISENTO" : stateRegister,
    economic_activity_code: (process.env.MELHOR_ENVIO_FROM_ECONOMIC_ACTIVITY_CODE ?? "").trim(),
    address: (process.env.MELHOR_ENVIO_FROM_ADDRESS ?? "").trim(),
    complement: (process.env.MELHOR_ENVIO_FROM_COMPLEMENT ?? "").trim(),
    number: (process.env.MELHOR_ENVIO_FROM_NUMBER ?? "").trim(),
    district: (process.env.MELHOR_ENVIO_FROM_DISTRICT ?? "").trim(),
    city: (process.env.MELHOR_ENVIO_FROM_CITY ?? "").trim(),
    postal_code: somenteDigitos(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE ?? ""),
    state_abbr: (process.env.MELHOR_ENVIO_FROM_STATE ?? "").trim().toUpperCase(),
  };
  if (documento.length === 14) base.company_document = documento;
  else base.document = documento;
  return base;
}

function destinatario(pedido: PedidoValido) {
  const documento = somenteDigitos(pedido.buyerDocument);
  const base: Record<string, unknown> = {
    name: pedido.personType === "juridica" && pedido.companyName ? pedido.companyName : pedido.buyerName,
    email: pedido.buyerEmail,
    phone: somenteDigitos(pedido.buyerPhone),
    address: pedido.shipStreet,
    complement: pedido.shipComplement,
    number: pedido.shipNumber,
    district: pedido.shipDistrict,
    city: pedido.shipCity,
    postal_code: somenteDigitos(pedido.shipZip),
    state_abbr: pedido.shipState.toUpperCase(),
    country_id: "BR",
  };
  if (pedido.personType === "juridica" || documento.length === 14) base.company_document = documento;
  else base.document = documento;
  return base;
}

async function carregarPedido(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { parentId: null, kind: "produto" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              weightGrams: true,
              widthMm: true,
              heightMm: true,
              depthMm: true,
            },
          },
        },
      },
    },
  });
}

/** Atualização otimista do bloco técnico, sem sobrescrever nota humana nem outra execução. */
async function atualizarMeta(
  orderId: string,
  patch: Partial<MetaMelhorEnvio>,
  lockToken?: string,
): Promise<MetaMelhorEnvio | null> {
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: { internalNote: true },
    });
    if (!pedido) return null;

    const atual = lerMetaMelhorEnvio(pedido.internalNote) ?? ({ provider: "melhor_envio" } satisfies MetaMelhorEnvio);
    if (lockToken && atual.lockToken !== lockToken) return null;

    const proxima: MetaMelhorEnvio = { ...atual, ...patch, provider: "melhor_envio" };
    const nota = escreverMetaMelhorEnvio(pedido.internalNote, proxima);
    const mudou = await prisma.order.updateMany({
      where: { id: orderId, internalNote: pedido.internalNote },
      data: { internalNote: nota },
    });
    if (mudou.count === 1) return proxima;
  }
  return null;
}

async function adquirirLock(orderId: string) {
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: { internalNote: true },
    });
    if (!pedido) return { token: null, meta: null, ausente: true } as const;

    const atual = lerMetaMelhorEnvio(pedido.internalNote) ?? ({ provider: "melhor_envio" } satisfies MetaMelhorEnvio);
    const adquiridoEm = atual.lockAcquiredAt ? new Date(atual.lockAcquiredAt).getTime() : 0;
    if (atual.lockToken && Number.isFinite(adquiridoEm) && Date.now() - adquiridoEm < LOCK_TTL_MS) {
      return { token: null, meta: atual, ausente: false } as const;
    }

    const token = crypto.randomUUID();
    const proxima: MetaMelhorEnvio = {
      ...atual,
      provider: "melhor_envio",
      lockToken: token,
      lockAcquiredAt: new Date().toISOString(),
      error: "",
    };
    const nota = escreverMetaMelhorEnvio(pedido.internalNote, proxima);
    const mudou = await prisma.order.updateMany({
      where: { id: orderId, internalNote: pedido.internalNote },
      data: { internalNote: nota },
    });
    if (mudou.count === 1) return { token, meta: proxima, ausente: false } as const;
  }
  return { token: null, meta: null, ausente: false } as const;
}

async function liberarLock(orderId: string, token: string) {
  await atualizarMeta(
    orderId,
    { lockToken: undefined, lockAcquiredAt: undefined },
    token,
  );
}

function idDoCarrinho(resposta: unknown) {
  const r = objeto(resposta);
  const direto = texto(r.id) || String(numero(r.id) ?? "");
  if (direto) return direto;
  const primeiro = objeto(lista(resposta)[0]);
  return texto(primeiro.id) || String(numero(primeiro.id) ?? "");
}

async function imprimir(ids: string[]) {
  let ultimaFalha: unknown = null;
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    if (tentativa > 0) await new Promise((resolve) => setTimeout(resolve, 850));
    try {
      const resposta = await requisicao<unknown>("/api/v2/me/shipment/print", {
        body: { mode: "public", orders: ids },
      });
      if (typeof resposta === "string" && resposta.startsWith("http")) return resposta;
      const r = objeto(resposta);
      const url = texto(r.url) || texto(r.link) || texto(r.file);
      if (url) return url;
      ultimaFalha = new ErroMelhorEnvio("O Melhor Envio ainda não liberou o link de impressão.");
    } catch (erro) {
      ultimaFalha = erro;
    }
  }
  if (ultimaFalha instanceof Error) throw ultimaFalha;
  throw new ErroMelhorEnvio("A etiqueta foi gerada, mas o link de impressão não ficou disponível.");
}

function normalizarStatus(status: string) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function rastreiosDaResposta(resposta: unknown, ids: string[]) {
  const raizBruta = objeto(resposta);
  const raiz = Object.keys(objeto(raizBruta.data)).length > 0 ? objeto(raizBruta.data) : raizBruta;

  return ids.map((id) => {
    const porId = objeto(raiz[id]);
    const candidato = Object.keys(porId).length > 0 ? porId : ids.length === 1 ? raiz : {};
    return {
      id,
      status: texto(candidato.status) || texto(candidato.state) || texto(candidato.event),
      tracking:
        texto(candidato.tracking) ||
        texto(candidato.tracking_code) ||
        texto(candidato.trackingCode) ||
        texto(candidato.code),
    };
  });
}

function statusAgregado(statuses: string[]) {
  const validos = statuses.map(normalizarStatus).filter(Boolean);
  if (validos.length === 0) return "";
  if (validos.every((s) => s === "delivered" || s.includes("entregue"))) return "delivered";
  if (validos.some((s) => s === "posted" || s.includes("postado") || s.includes("transit") || s.includes("transito"))) {
    return "posted";
  }
  if (validos.some((s) => s === "released" || s.includes("liberado"))) return "released";
  if (validos.some((s) => s === "suspended" || s.includes("suspenso"))) return "suspended";
  if (validos.some((s) => s === "undelivered" || s.includes("nao_entregue"))) return "undelivered";
  return validos[0] ?? "";
}

async function aplicarStatusDeRastreio(
  pedido: { id: string; status: string; shippedAt: Date | null; deliveredAt: Date | null },
  status: string,
) {
  const normal = normalizarStatus(status);
  if (!normal) return;

  if (normal === "delivered" || normal.includes("entregue")) {
    if (!["entregue", "cancelado", "reembolsado", "concluido"].includes(pedido.status)) {
      await prisma.order.update({
        where: { id: pedido.id },
        data: { status: "entregue", deliveredAt: pedido.deliveredAt ?? new Date() },
      });
      await prisma.orderStatusEvent.create({
        data: {
          orderId: pedido.id,
          status: "entregue",
          note: "Todos os volumes foram confirmados como entregues pela transportadora.",
          visibleToCustomer: true,
        },
      });
    }
    return;
  }

  const emTransito =
    normal === "posted" ||
    normal.includes("postado") ||
    normal.includes("transit") ||
    normal.includes("transito") ||
    normal.includes("shipped") ||
    normal.includes("enviado");

  if (
    emTransito &&
    ["pago", "separacao", "revisao_tecnica", "aguardando_frete", "pronto_retirada"].includes(pedido.status)
  ) {
    await prisma.order.update({
      where: { id: pedido.id },
      data: { status: "enviado", shippedAt: pedido.shippedAt ?? new Date() },
    });
    await prisma.orderStatusEvent.create({
      data: {
        orderId: pedido.id,
        status: "enviado",
        note: "Objeto postado; rastreamento atualizado pela transportadora.",
        visibleToCustomer: true,
      },
    });
  }
}

export async function atualizarRastreioMelhorEnvio(orderId: string) {
  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
      shippingLabel: true,
      internalNote: true,
    },
  });
  if (!pedido) return { ok: false as const, error: "Pedido não encontrado." };

  const meta = lerMetaMelhorEnvio(pedido.internalNote);
  const ids = meta?.providerOrderIds ?? meta?.providerShipments?.map((item) => item.id) ?? [];
  if (ids.length === 0) return { ok: false as const, error: "Etiqueta ainda não foi criada." };

  try {
    const resposta = await requisicao<unknown>("/api/v2/me/shipment/tracking", {
      body: { orders: ids },
    });
    const entradas = rastreiosDaResposta(resposta, ids);
    const trackingCodes = [...new Set(entradas.map((item) => item.tracking).filter(Boolean))];
    const status = statusAgregado(entradas.map((item) => item.status));

    const novaMeta = await atualizarMeta(orderId, {
      status: status || meta?.status || "emitido",
      trackingCode: trackingCodes[0] || meta?.trackingCode,
      trackingCodes: trackingCodes.length > 0 ? trackingCodes : meta?.trackingCodes,
      error: "",
    });
    if (!novaMeta) return { ok: false as const, error: "O pedido mudou durante a atualização do rastreio." };

    await aplicarStatusDeRastreio(pedido, status || novaMeta.status || "");

    if (trackingCodes.length > 0) {
      const base = pedido.shippingLabel.replace(/\s+·\s+Rastreios?\s+.*$/, "").trim();
      const sufixo =
        trackingCodes.length === 1
          ? `Rastreio ${trackingCodes[0]}`
          : `Rastreios ${trackingCodes.join(" / ")}`;
      const rotulo = `${base} · ${sufixo}`;
      if (rotulo !== pedido.shippingLabel) {
        await prisma.order.update({ where: { id: orderId }, data: { shippingLabel: rotulo } });
      }
    }

    return { ok: true as const, meta: novaMeta };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar rastreio.";
    await atualizarMeta(orderId, { error: mensagem.slice(0, 700) });
    return { ok: false as const, error: mensagem };
  }
}

function itensParaCotacao(pedido: PedidoValido): ItemCotacaoMelhorEnvio[] {
  return pedido.items.map((item) => ({
    id: item.productId ?? item.id,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    weightGrams: item.product?.weightGrams ?? null,
    widthMm: item.product?.widthMm ?? null,
    heightMm: item.product?.heightMm ?? null,
    depthMm: item.product?.depthMm ?? null,
  }));
}

function produtosDoPedido(itens: readonly ItemPedido[]) {
  return itens.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitary_value: Number((item.unitPriceCents / 100).toFixed(2)),
  }));
}

function produtosDoPacote(pacote: PacoteMelhorEnvio, itens: readonly ItemPedido[]) {
  const mapeamento = pacote.products ?? [];
  if (mapeamento.length === 0) {
    throw new ErroMelhorEnvio(
      "A cotação retornou vários volumes sem informar quais produtos pertencem a cada pacote. Refaça a cotação ou escolha outra modalidade.",
    );
  }

  return mapeamento.flatMap((referencia) => {
    const item = itens.find((candidato) => (candidato.productId ?? candidato.id) === referencia.id);
    if (!item) return [];
    return [{
      name: item.name,
      quantity: Math.min(item.quantity, Math.max(1, referencia.quantity)),
      unitary_value: Number((item.unitPriceCents / 100).toFixed(2)),
    }];
  });
}

function valorSegurado(produtos: { quantity: number; unitary_value: number }[]) {
  return Number(
    produtos.reduce((soma, item) => soma + item.quantity * item.unitary_value, 0).toFixed(2),
  );
}

function opcoesDoCarrinho(
  pedido: PedidoValido,
  nonCommercial: boolean,
  invoiceKey: string | undefined,
  insuranceValue: number,
) {
  const options: Record<string, unknown> = {
    platform: "JB Soluções Odontológicas",
    reminder: `Pedido ${pedido.number}`,
    insurance_value: insuranceValue,
    receipt: false,
    own_hand: false,
    reverse: false,
  };
  if (!nonCommercial) {
    options.invoice = { key: somenteDigitos(invoiceKey ?? "") };
  }
  return options;
}

async function inserirNoCarrinho(
  pedido: PedidoValido,
  opcao: OpcaoMelhorEnvio,
  produtos: { name: string; quantity: number; unitary_value: number }[],
  volumes: PacoteMelhorEnvio[],
) {
  const c = config();
  const body: Record<string, unknown> = {
    service: opcao.serviceId,
    from: remetente(c.nonCommercial),
    to: destinatario(pedido),
    products: produtos,
    volumes: volumes.map((pacote) => ({
      height: pacote.height,
      width: pacote.width,
      length: pacote.length,
      weight: pacote.weight,
    })),
    options: opcoesDoCarrinho(
      pedido,
      c.nonCommercial,
      lerMetaMelhorEnvio(pedido.internalNote)?.invoiceKey,
      valorSegurado(produtos),
    ),
  };

  const agency = c.agencyByCompany.get(opcao.companyId);
  if (agency) body.agency = agency;

  const resposta = await requisicao<unknown>("/api/v2/me/cart", { body });
  const id = idDoCarrinho(resposta);
  if (!id) throw new ErroMelhorEnvio("O Melhor Envio não devolveu o ID do frete inserido no carrinho.");
  return id;
}

function precisaSeparar(opcao: OpcaoMelhorEnvio) {
  const c = config();
  return (
    opcao.packages.length > 1 &&
    (SERVICOS_SEM_VOLUME_AGRUPADO.has(opcao.serviceId) || c.singleVolumeCompanyIds.has(opcao.companyId))
  );
}

function shipmentsDaMeta(meta: MetaMelhorEnvio): ProviderShipmentMelhorEnvio[] {
  if (meta.providerShipments?.length) return meta.providerShipments;
  return (meta.providerOrderIds ?? []).map((id) => ({ id, packageIndex: -1 }));
}

async function salvarShipments(
  orderId: string,
  meta: MetaMelhorEnvio,
  shipments: ProviderShipmentMelhorEnvio[],
  token: string,
) {
  const atualizada = await atualizarMeta(
    orderId,
    {
      ...meta,
      providerShipments: shipments,
      providerOrderIds: shipments.map((item) => item.id),
      status: "no_carrinho",
      error: "",
    },
    token,
  );
  if (!atualizada) throw new ErroMelhorEnvio("Outra execução assumiu este pedido durante a emissão.");
  return atualizada;
}

async function criarEtiquetasNoCarrinho(
  pedido: PedidoValido,
  opcao: OpcaoMelhorEnvio,
  meta: MetaMelhorEnvio,
  token: string,
) {
  let shipments = shipmentsDaMeta(meta);
  if (shipments.length > 0) return { meta, shipments };

  const todos = produtosDoPedido(pedido.items);
  const separar = precisaSeparar(opcao);

  if (!separar) {
    try {
      const id = await inserirNoCarrinho(pedido, opcao, todos, opcao.packages);
      shipments = [{ id, packageIndex: -1 }];
      const atualizada = await salvarShipments(pedido.id, meta, shipments, token);
      return { meta: atualizada, shipments };
    } catch (erro) {
      // A documentação proíbe agrupamento para Correios/J&T/Loggi e serviço 27.
      // Para serviços cuja identificação não está numa lista estável, um 422
      // explícito da API é seguro para tentar o formato pacote-a-pacote: o
      // servidor recusou o agrupado e portanto não criou uma etiqueta oculta.
      if (!(erro instanceof ErroMelhorEnvio) || erro.status !== 422 || opcao.packages.length <= 1) {
        throw erro;
      }
    }
  }

  for (let indice = 0; indice < opcao.packages.length; indice += 1) {
    if (shipments.some((item) => item.packageIndex === indice)) continue;
    const pacote = opcao.packages[indice];
    if (!pacote) continue;
    const produtos = produtosDoPacote(pacote, pedido.items);
    if (produtos.length === 0) {
      throw new ErroMelhorEnvio(`O pacote ${indice + 1} não possui produtos válidos para a declaração.`);
    }

    const id = await inserirNoCarrinho(pedido, opcao, produtos, [pacote]);
    shipments = [...shipments, { id, packageIndex: indice }];
    meta = await salvarShipments(pedido.id, meta, shipments, token);
  }

  return { meta, shipments };
}

function fase(status: string | undefined) {
  switch (status) {
    case "no_carrinho":
      return 1;
    case "comprado":
      return 2;
    case "gerado":
      return 3;
    case "emitido":
    case "released":
    case "posted":
    case "delivered":
      return 4;
    default:
      return 0;
  }
}

async function guardarFase(
  orderId: string,
  meta: MetaMelhorEnvio,
  status: string,
  token: string,
  extra: Partial<MetaMelhorEnvio> = {},
) {
  const atualizada = await atualizarMeta(orderId, { ...meta, ...extra, status, error: "" }, token);
  if (!atualizada) throw new ErroMelhorEnvio("Outra execução assumiu este pedido durante a emissão.");
  return atualizada;
}

export async function processarPedidoMelhorEnvio(orderId: string) {
  const pedidoInicial = await carregarPedido(orderId);
  if (!pedidoInicial) return { ok: false as const, error: "Pedido não encontrado." };
  const partes = partesDoRotuloMelhorEnvio(pedidoInicial.shippingLabel);
  if (!partes) return { ok: true as const, skipped: true as const };
  if (!pedidoInicial.paidAt) return { ok: false as const, error: "Pedido ainda não está pago." };

  const configuracao = statusMelhorEnvio();
  if (!configuracao.labelReady) {
    const mensagem = `Configuração de etiqueta incompleta: ${configuracao.missingLabel.join(", ")}`;
    await atualizarMeta(orderId, { status: "configuracao_pendente", error: mensagem });
    return { ok: false as const, error: mensagem };
  }

  const lock = await adquirirLock(orderId);
  if (lock.ausente) return { ok: false as const, error: "Pedido não encontrado." };
  if (!lock.token || !lock.meta) {
    return { ok: false as const, busy: true as const, error: "A logística deste pedido já está sendo processada." };
  }
  const token = lock.token;
  let meta = lock.meta;

  try {
    const pedido = await carregarPedido(orderId);
    if (!pedido) throw new ErroMelhorEnvio("Pedido não encontrado.");

    if (!configuracao.nonCommercial) {
      const chave = somenteDigitos(meta.invoiceKey ?? "");
      if (chave.length !== 44) {
        meta = await guardarFase(orderId, meta, "aguardando_nfe", token);
        return {
          ok: false as const,
          pendingInvoice: true as const,
          error: "Informe a chave de 44 dígitos da NF-e para emitir o frete comercial.",
        };
      }
    }

    let shipments = shipmentsDaMeta(meta);

    if (shipments.length === 0) {
      const opcoes = await cotacoesMelhorEnvio({ postalCode: pedido.shipZip, items: itensParaCotacao(pedido) });
      const opcao =
        (meta.serviceId ? opcoes.find((item) => item.serviceId === meta.serviceId) : undefined) ??
        opcoes.find((item) => item.companyName === partes.companyName && item.serviceName === partes.serviceName);
      if (!opcao) {
        throw new ErroMelhorEnvio("A modalidade escolhida não está mais disponível para este endereço.");
      }

      meta = await guardarFase(orderId, meta, meta.status ?? "pendente", token, {
        companyId: opcao.companyId,
        serviceId: opcao.serviceId,
        serviceName: opcao.serviceName,
        companyName: opcao.companyName,
        quotedPriceCents: opcao.priceCents,
        estimatedDays: opcao.deliveryDays,
        packages: opcao.packages,
      });

      const criadas = await criarEtiquetasNoCarrinho(pedido, opcao, meta, token);
      meta = criadas.meta;
      shipments = criadas.shipments;
    }

    const ids = shipments.map((item) => item.id);
    if (ids.length === 0) throw new ErroMelhorEnvio("Nenhuma etiqueta foi criada no carrinho do Melhor Envio.");

    if (fase(meta.status) < 2) {
      await requisicao("/api/v2/me/shipment/checkout", { body: { orders: ids } });
      meta = await guardarFase(orderId, meta, "comprado", token);
    }

    if (fase(meta.status) < 3) {
      await requisicao("/api/v2/me/shipment/generate", { body: { orders: ids } });
      meta = await guardarFase(orderId, meta, "gerado", token);
    }

    let labelUrl = meta.labelUrl ?? "";
    if (!labelUrl || fase(meta.status) < 4) {
      labelUrl = await imprimir(ids);
      meta = await guardarFase(orderId, meta, "emitido", token, { labelUrl });
    }

    await atualizarRastreioMelhorEnvio(orderId);
    return { ok: true as const, labelUrl, providerOrderId: ids[0], providerOrderIds: ids };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao emitir frete no Melhor Envio.";
    await atualizarMeta(
      orderId,
      { status: meta.status ?? "erro", error: mensagem.slice(0, 700) },
      token,
    );
    return { ok: false as const, error: mensagem };
  } finally {
    await liberarLock(orderId, token);
  }
}

export async function cancelarEtiquetasMelhorEnvio(orderId: string, motivo: string) {
  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: { internalNote: true, shippingLabel: true },
  });
  if (!pedido || !partesDoRotuloMelhorEnvio(pedido.shippingLabel)) {
    return { ok: true as const, skipped: true as const };
  }

  const meta = lerMetaMelhorEnvio(pedido.internalNote);
  const ids = meta?.providerOrderIds ?? meta?.providerShipments?.map((item) => item.id) ?? [];
  if (ids.length === 0) return { ok: true as const, skipped: true as const };

  const falhas: string[] = [];
  for (const id of ids) {
    try {
      await requisicao("/api/v2/me/shipment/cancel", {
        body: {
          order: {
            id,
            reason_id: 2,
            description: motivo.slice(0, 255) || "Pedido cancelado na JB",
          },
        },
      });
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro.message : `Não foi possível cancelar ${id}.`);
    }
  }

  if (falhas.length > 0) {
    const mensagem = falhas.join(" | ").slice(0, 700);
    await atualizarMeta(orderId, { status: "cancelamento_pendente", error: mensagem });
    return { ok: false as const, error: mensagem };
  }

  await atualizarMeta(orderId, { status: "cancelado", error: "" });
  return { ok: true as const };
}

export async function processarPendenciasMelhorEnvio(limite = 20) {
  if (!statusMelhorEnvio().enabled) return { processados: 0, ok: 0, falhas: 0 };

  const pedidos = await prisma.order.findMany({
    where: {
      paidAt: { not: null },
      shippingLabel: { startsWith: "Melhor Envio · " },
      status: { notIn: ["cancelado", "reembolsado", "concluido"] },
    },
    orderBy: { updatedAt: "asc" },
    take: Math.min(100, Math.max(1, limite)),
    select: { id: true },
  });

  let ok = 0;
  let falhas = 0;
  for (const pedido of pedidos) {
    const resultado = await processarPedidoMelhorEnvio(pedido.id);
    if (resultado.ok) ok += 1;
    else if ("busy" in resultado && resultado.busy) {
      // outro worker já está cuidando; não é falha operacional
    } else {
      falhas += 1;
    }
  }
  return { processados: pedidos.length, ok, falhas };
}
