import "server-only";

import { prisma } from "@/lib/prisma";
import {
  escreverMetaMelhorEnvio,
  lerMetaMelhorEnvio,
  partesDoRotuloMelhorEnvio,
  type MetaMelhorEnvio,
  type PacoteMelhorEnvio,
} from "@/lib/logistica-meta";
import { somenteDigitos } from "@/lib/format";

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
};

function sim(valor: string | undefined) {
  return ["1", "true", "sim", "on", "yes"].includes((valor ?? "").trim().toLowerCase());
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
  constructor(message: string) {
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
        `Melhor Envio respondeu ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 500)}` : ""}`,
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
      return { height, width, length, weight };
    })
    .filter((p) => p.height > 0 && p.width > 0 && p.length > 0 && p.weight > 0);
}

function transportadoraSemMultivolume(nome: string) {
  const n = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return n.includes("correios") || n.includes("j&t") || n.includes("jnt") || n.includes("loggi");
}

export async function cotacoesMelhorEnvio(entrada: {
  postalCode: string;
  items: readonly ItemCotacaoMelhorEnvio[];
}): Promise<OpcaoMelhorEnvio[]> {
  const c = config();
  const destino = somenteDigitos(entrada.postalCode);
  if (!statusMelhorEnvio().quoteReady) throw new ErroMelhorEnvio("Cotação do Melhor Envio não configurada.");
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
      if (serviceId === null || price === null || price < 0) return [];

      const company = objeto(r.company);
      const companyName = texto(company.name) || "Transportadora";
      const serviceName = texto(r.name) || `Serviço ${serviceId}`;
      const packages = pacotesDaResposta(r.packages);

      // A API não aceita vários volumes num único carrinho para estas empresas.
      // Sem mapa produto→pacote, duplicar declaração fiscal seria pior do que
      // ocultar uma modalidade que não conseguimos emitir corretamente.
      if (packages.length > 1 && transportadoraSemMultivolume(companyName)) return [];

      const dias = numero(r.custom_delivery_time ?? r.delivery_time);
      return [
        {
          key: `me:${Math.trunc(serviceId)}`,
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

function remetente() {
  const documento = somenteDigitos(process.env.MELHOR_ENVIO_FROM_DOCUMENT ?? "");
  const base: Record<string, unknown> = {
    name: (process.env.MELHOR_ENVIO_FROM_NAME ?? "").trim(),
    email: (process.env.MELHOR_ENVIO_FROM_EMAIL ?? "").trim(),
    phone: somenteDigitos(process.env.MELHOR_ENVIO_FROM_PHONE ?? ""),
    state_register: (process.env.MELHOR_ENVIO_FROM_STATE_REGISTER ?? "").trim() || "ISENTO",
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

function destinatario(pedido: {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDocument: string;
  personType: string;
  companyName: string;
  shipZip: string;
  shipStreet: string;
  shipNumber: string;
  shipComplement: string;
  shipDistrict: string;
  shipCity: string;
  shipState: string;
}) {
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

async function salvarMeta(orderId: string, meta: MetaMelhorEnvio) {
  const atual = await prisma.order.findUnique({ where: { id: orderId }, select: { internalNote: true } });
  if (!atual) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { internalNote: escreverMetaMelhorEnvio(atual.internalNote, meta) },
  });
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
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    if (tentativa > 0) await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      const resposta = await requisicao<unknown>("/api/v2/me/shipment/print", {
        body: { mode: "public", orders: ids },
      });
      if (typeof resposta === "string" && resposta.startsWith("http")) return resposta;
      const r = objeto(resposta);
      const url = texto(r.url) || texto(r.link) || texto(r.file);
      if (url) return url;
    } catch (erro) {
      ultimaFalha = erro;
    }
  }
  if (ultimaFalha instanceof Error) throw ultimaFalha;
  return "";
}

function extrairTracking(resposta: unknown, ids: string[]) {
  const procurar = (valor: unknown): { status: string; tracking: string } | null => {
    const r = objeto(valor);
    const status = texto(r.status) || texto(r.state) || texto(r.event);
    const tracking =
      texto(r.tracking) || texto(r.tracking_code) || texto(r.trackingCode) || texto(r.code);
    if (status || tracking) return { status, tracking };
    return null;
  };

  const raiz = objeto(resposta);
  for (const id of ids) {
    const achou = procurar(raiz[id]);
    if (achou) return achou;
  }
  const direto = procurar(resposta);
  if (direto) return direto;
  for (const item of lista(resposta)) {
    const achou = procurar(item);
    if (achou) return achou;
  }
  return { status: "", tracking: "" };
}

function statusNormalizado(status: string) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

async function aplicarStatusDeRastreio(
  pedido: { id: string; status: string; shippedAt: Date | null; deliveredAt: Date | null },
  status: string,
) {
  const normal = statusNormalizado(status);
  if (!normal) return;

  if (normal.includes("delivered") || normal.includes("entregue")) {
    if (!["cancelado", "reembolsado", "concluido"].includes(pedido.status)) {
      await prisma.order.update({
        where: { id: pedido.id },
        data: { status: "entregue", deliveredAt: pedido.deliveredAt ?? new Date() },
      });
      await prisma.orderStatusEvent.create({
        data: {
          orderId: pedido.id,
          status: "entregue",
          note: "Entrega confirmada pelo rastreamento da transportadora.",
          visibleToCustomer: true,
        },
      });
    }
    return;
  }

  const emTransito =
    normal.includes("posted") ||
    normal.includes("postado") ||
    normal.includes("transit") ||
    normal.includes("transito") ||
    normal.includes("shipped") ||
    normal.includes("enviado");

  if (
    emTransito &&
    ["pago", "separacao", "revisao_tecnica", "aguardando_frete", "pronto_retirada"].includes(
      pedido.status,
    )
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
      number: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
      shippingLabel: true,
      internalNote: true,
    },
  });
  if (!pedido) return { ok: false as const, error: "Pedido não encontrado." };

  const meta = lerMetaMelhorEnvio(pedido.internalNote);
  const ids = meta?.providerOrderIds ?? [];
  if (ids.length === 0) return { ok: false as const, error: "Etiqueta ainda não foi criada." };

  try {
    const resposta = await requisicao<unknown>("/api/v2/me/shipment/tracking", {
      body: { orders: ids },
    });
    const tracking = extrairTracking(resposta, ids);
    const novaMeta: MetaMelhorEnvio = {
      ...(meta ?? { provider: "melhor_envio" }),
      status: tracking.status || meta?.status || "emitido",
      trackingCode: tracking.tracking || meta?.trackingCode,
      error: "",
    };
    await salvarMeta(orderId, novaMeta);
    await aplicarStatusDeRastreio(pedido, novaMeta.status ?? "");

    if (novaMeta.trackingCode && !pedido.shippingLabel.includes("Rastreio")) {
      await prisma.order.update({
        where: { id: orderId },
        data: { shippingLabel: `${pedido.shippingLabel} · Rastreio ${novaMeta.trackingCode}` },
      });
    }

    return { ok: true as const, meta: novaMeta };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar rastreio.";
    await salvarMeta(orderId, {
      ...(meta ?? { provider: "melhor_envio" }),
      error: mensagem.slice(0, 500),
    });
    return { ok: false as const, error: mensagem };
  }
}

export async function processarPedidoMelhorEnvio(orderId: string) {
  const pedido = await prisma.order.findUnique({
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
  if (!pedido) return { ok: false as const, error: "Pedido não encontrado." };
  const partes = partesDoRotuloMelhorEnvio(pedido.shippingLabel);
  if (!partes) return { ok: true as const, skipped: true as const };
  if (!pedido.paidAt) return { ok: false as const, error: "Pedido ainda não está pago." };

  const configuracao = statusMelhorEnvio();
  if (!configuracao.labelReady) {
    const mensagem = `Configuração de etiqueta incompleta: ${configuracao.missingLabel.join(", ")}`;
    const existente = lerMetaMelhorEnvio(pedido.internalNote) ?? { provider: "melhor_envio" as const };
    await salvarMeta(orderId, { ...existente, status: "configuracao_pendente", error: mensagem });
    return { ok: false as const, error: mensagem };
  }

  const existente = lerMetaMelhorEnvio(pedido.internalNote) ?? { provider: "melhor_envio" as const };

  if ((existente.providerOrderIds?.length ?? 0) > 0) {
    try {
      let labelUrl = existente.labelUrl ?? "";
      if (!labelUrl) {
        await requisicao("/api/v2/me/shipment/generate", {
          body: { orders: existente.providerOrderIds },
        });
        labelUrl = await imprimir(existente.providerOrderIds ?? []);
        await salvarMeta(orderId, { ...existente, labelUrl, status: "emitido", error: "" });
      }
      await atualizarRastreioMelhorEnvio(orderId);
      return { ok: true as const, labelUrl };
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha ao recuperar etiqueta.";
      await salvarMeta(orderId, { ...existente, error: mensagem.slice(0, 500) });
      return { ok: false as const, error: mensagem };
    }
  }

  if (!configuracao.nonCommercial) {
    const chave = somenteDigitos(existente.invoiceKey ?? "");
    if (chave.length !== 44) {
      await salvarMeta(orderId, { ...existente, status: "aguardando_nfe", error: "" });
      return {
        ok: false as const,
        pendingInvoice: true as const,
        error: "Informe a chave de 44 dígitos da NF-e para emitir o frete comercial.",
      };
    }
  }

  const itens: ItemCotacaoMelhorEnvio[] = pedido.items.map((item) => ({
    id: item.productId ?? item.id,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    weightGrams: item.product?.weightGrams ?? null,
    widthMm: item.product?.widthMm ?? null,
    heightMm: item.product?.heightMm ?? null,
    depthMm: item.product?.depthMm ?? null,
  }));

  try {
    const opcoes = await cotacoesMelhorEnvio({ postalCode: pedido.shipZip, items: itens });
    const opcao =
      (existente.serviceId
        ? opcoes.find((o) => o.serviceId === existente.serviceId)
        : undefined) ??
      opcoes.find(
        (o) => o.companyName === partes.companyName && o.serviceName === partes.serviceName,
      );
    if (!opcao) throw new ErroMelhorEnvio("A modalidade escolhida não está mais disponível para este endereço.");
    if (opcao.packages.length === 0) {
      throw new ErroMelhorEnvio("A transportadora não devolveu os volumes necessários para emitir a etiqueta.");
    }

    const produtos = pedido.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitary_value: Number((item.unitPriceCents / 100).toFixed(2)),
    }));
    const valorSegurado = Number(
      (pedido.items.reduce((soma, item) => soma + item.totalCents, 0) / 100).toFixed(2),
    );
    const options: Record<string, unknown> = {
      platform: "JB Soluções Odontológicas",
      reminder: `Pedido ${pedido.number}`,
      insurance_value: valorSegurado,
      receipt: false,
      own_hand: false,
      reverse: false,
    };
    if (!configuracao.nonCommercial) {
      options.invoice = { key: somenteDigitos(existente.invoiceKey ?? "") };
    }

    const inserido = await requisicao<unknown>("/api/v2/me/cart", {
      body: {
        service: opcao.serviceId,
        from: remetente(),
        to: destinatario(pedido),
        products: produtos,
        volumes: opcao.packages,
        options,
      },
    });
    const providerOrderId = idDoCarrinho(inserido);
    if (!providerOrderId) throw new ErroMelhorEnvio("O Melhor Envio não devolveu o ID do frete inserido no carrinho.");

    const metaComprado: MetaMelhorEnvio = {
      ...existente,
      serviceId: opcao.serviceId,
      serviceName: opcao.serviceName,
      companyName: opcao.companyName,
      quotedPriceCents: opcao.priceCents,
      estimatedDays: opcao.deliveryDays,
      packages: opcao.packages,
      providerOrderIds: [providerOrderId],
      status: "no_carrinho",
      error: "",
    };
    await salvarMeta(orderId, metaComprado);

    await requisicao("/api/v2/me/shipment/checkout", {
      body: { orders: [providerOrderId] },
    });
    await salvarMeta(orderId, { ...metaComprado, status: "comprado" });

    await requisicao("/api/v2/me/shipment/generate", {
      body: { orders: [providerOrderId] },
    });
    const labelUrl = await imprimir([providerOrderId]);
    const metaEmitido: MetaMelhorEnvio = {
      ...metaComprado,
      status: "emitido",
      labelUrl,
      error: "",
    };
    await salvarMeta(orderId, metaEmitido);
    await atualizarRastreioMelhorEnvio(orderId);

    return { ok: true as const, labelUrl, providerOrderId };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao emitir frete no Melhor Envio.";
    await salvarMeta(orderId, {
      ...existente,
      status: existente.status ?? "erro",
      error: mensagem.slice(0, 500),
    });
    return { ok: false as const, error: mensagem };
  }
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
    else falhas += 1;
  }
  return { processados: pedidos.length, ok, falhas };
}
