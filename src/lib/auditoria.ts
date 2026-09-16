import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { formatarDataHora, formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";

/**
 * Trilha de auditoria — quem mexeu, em quê, quando e o que mudou.
 *
 * `AuditLog` guarda um resumo em texto, não um par de JSONs. Isso é de
 * propósito: o que se lê no painel é "preço: R$ 4.890,00 → R$ 5.190,00", não
 * um despejo do registro inteiro. Por isso o diff é calculado aqui e só os
 * campos que realmente mudaram entram no resumo. Campo sigiloso (senha, token,
 * hash) nunca é gravado nem sequer mencionado com valor.
 */

/* ------------------------------------------------------------------- ações */

export const ACOES = {
  criar: "Criou",
  editar: "Editou",
  excluir: "Excluiu",
  publicar: "Publicou",
  arquivar: "Arquivou",
  restaurar: "Restaurou",
  status: "Mudou o status",
  pagamento: "Registrou pagamento",
  cancelar: "Cancelou",
  atribuir: "Atribuiu",
  enviar: "Enviou",
  importar: "Importou",
  exportar: "Exportou",
  entrar: "Entrou",
  sair: "Saiu",
} as const;

export type AcaoAuditoria = keyof typeof ACOES;

/** Registros antigos gravaram a ação em inglês; o painel continua legível. */
const ACOES_ANTIGAS: Record<string, string> = {
  create: "Criou",
  update: "Editou",
  delete: "Excluiu",
  login: "Entrou",
  logout: "Saiu",
};

export function rotuloAcao(acao: string) {
  if (acao in ACOES) return ACOES[acao as AcaoAuditoria];
  return ACOES_ANTIGAS[acao] ?? acao;
}

/* -------------------------------------------------------------------- diff */

export type RegistroAuditavel = Record<string, unknown>;

export type Mudanca = {
  campo: string;
  rotulo: string;
  antes: string;
  depois: string;
};

/** Ruído de infraestrutura: muda sempre e não diz nada a ninguém. */
const IGNORADOS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "searchVector",
]);

/** Nunca sai daqui com valor, nem no resumo. */
const SIGILOSO = /senha|password|passwordhash|token|secret|hash|cvv|cartao/i;

const ROTULOS_CAMPO: Record<string, string> = {
  name: "nome",
  title: "título",
  slug: "endereço",
  sku: "SKU",
  model: "modelo",
  status: "status",
  condition: "condição",
  description: "descrição",
  shortDescription: "resumo",
  priceCents: "preço",
  compareAtCents: "preço anterior",
  costCents: "custo",
  totalCents: "total",
  subtotalCents: "subtotal",
  discountCents: "desconto",
  shippingCents: "frete",
  stock: "estoque",
  featured: "destaque",
  published: "publicado",
  publishedAt: "publicação",
  active: "ativo",
  role: "papel",
  email: "e-mail",
  phone: "telefone",
  document: "documento",
  quantity: "quantidade",
  notes: "observações",
  paymentMethod: "forma de pagamento",
  paidAt: "pagamento",
  canceledAt: "cancelamento",
  technicianId: "técnico",
  categoryId: "categoria",
  brandId: "marca",
  customerId: "cliente",
  passwordHash: "senha",
  tokenHash: "token",
};

export function rotuloCampo(campo: string) {
  return ROTULOS_CAMPO[campo] ?? campo;
}

function comparavel(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "object") {
    try {
      return JSON.stringify(valor);
    } catch {
      return String(valor);
    }
  }
  return String(valor);
}

/** Como o valor aparece no painel. */
export function exibirValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (SIGILOSO.test(campo)) return "•••";
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (valor instanceof Date) return formatarDataHora(valor);
  if (typeof valor === "number") {
    if (campo.endsWith("Cents")) return formatarPreco(valor);
    return String(valor);
  }
  if (typeof valor === "string") {
    if (/At$/.test(campo) && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return formatarDataHora(valor);
    const limpo = valor.replace(/\s+/g, " ").trim();
    return limpo.length > 60 ? `${limpo.slice(0, 60)}…` : limpo;
  }
  const serializado = comparavel(valor);
  return serializado.length > 60 ? `${serializado.slice(0, 60)}…` : serializado;
}

/**
 * Só os campos que mudaram. Sem `antes`, tudo que veio em `depois` conta como
 * mudança — é o caso de uma criação.
 */
export function diffEnxuto(
  antes?: RegistroAuditavel | null,
  depois?: RegistroAuditavel | null,
): Mudanca[] {
  const de = antes ?? {};
  const para = depois ?? {};
  const campos = new Set([...Object.keys(de), ...Object.keys(para)]);
  const mudancas: Mudanca[] = [];

  for (const campo of campos) {
    if (IGNORADOS.has(campo)) continue;
    if (typeof de[campo] === "function" || typeof para[campo] === "function") continue;

    const valorAntes = de[campo];
    const valorDepois = para[campo];
    if (comparavel(valorAntes) === comparavel(valorDepois)) continue;

    // que a senha mudou é informação de auditoria; o valor, nem antes nem depois
    if (SIGILOSO.test(campo)) {
      mudancas.push({
        campo,
        rotulo: rotuloCampo(campo),
        antes: "•••",
        depois: "alterado",
      });
      continue;
    }

    // criação: campo que nasceu vazio não vira linha de diff
    if (!antes && (valorDepois === null || valorDepois === undefined || valorDepois === "")) {
      continue;
    }

    mudancas.push({
      campo,
      rotulo: rotuloCampo(campo),
      antes: exibirValor(campo, valorAntes),
      depois: exibirValor(campo, valorDepois),
    });
  }

  return mudancas.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

const MAX_MUDANCAS_NO_RESUMO = 10;
const MAX_RESUMO = 900;

export function resumirMudancas(mudancas: Mudanca[]) {
  if (!mudancas.length) return "";
  const mostradas = mudancas.slice(0, MAX_MUDANCAS_NO_RESUMO);
  const restantes = mudancas.length - mostradas.length;
  const texto = mostradas.map((m) => `${m.rotulo}: ${m.antes} → ${m.depois}`).join("; ");
  return restantes > 0 ? `${texto}; e mais ${restantes} campo(s)` : texto;
}

/* --------------------------------------------------------------- gravação */

export type EntradaAuditoria = {
  userId?: string | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string;
  antes?: RegistroAuditavel | null;
  depois?: RegistroAuditavel | null;
  /** Quando ausente, é lido do cabeçalho da requisição. */
  ip?: string | null;
  /** Texto pronto. Quando ausente, sai do diff. */
  resumo?: string;
};

/** IP de quem fez a ação. Fora de uma requisição, devolve vazio. */
export async function ipAtual() {
  try {
    const h = await headers();
    // ipDoPedido já percorre x-vercel-forwarded-for, cf-connecting-ip,
    // x-real-ip e x-forwarded-for, nessa ordem de confiança
    return ipDoPedido(h);
  } catch {
    return "";
  }
}

/**
 * Grava a linha de auditoria. Nunca lança: perder o registro de auditoria é
 * ruim, mas derrubar a operação que estava sendo auditada é pior.
 */
export async function registrarAuditoria(
  entrada: EntradaAuditoria,
): Promise<{ id: string | null; mudancas: Mudanca[] }> {
  const mudancas =
    entrada.antes || entrada.depois ? diffEnxuto(entrada.antes, entrada.depois) : [];

  const ip = entrada.ip ?? (await ipAtual());
  const partes = [entrada.resumo?.trim() || resumirMudancas(mudancas)].filter(Boolean);
  if (ip) partes.push(`IP ${ip}`);
  const summary = partes.join(" · ").slice(0, MAX_RESUMO);

  try {
    const criado = await prisma.auditLog.create({
      data: {
        userId: entrada.userId ?? null,
        action: entrada.acao,
        entity: entrada.entidade,
        entityId: entrada.entidadeId ?? "",
        summary,
      },
      select: { id: true },
    });
    return { id: criado.id, mudancas };
  } catch (erro) {
    console.error("Falha ao registrar auditoria", erro);
    return { id: null, mudancas };
  }
}

/* ---------------------------------------------------------------- consulta */

export type FiltroAuditoria = {
  entidade?: string;
  entidadeId?: string;
  userId?: string;
  acao?: string;
  /** Procura no resumo e no id da entidade. */
  busca?: string;
  de?: Date;
  ate?: Date;
  pagina?: number;
  porPagina?: number;
};

export const SELECAO_AUDITORIA = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  summary: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.AuditLogSelect;

export type LinhaAuditoria = Prisma.AuditLogGetPayload<{
  select: typeof SELECAO_AUDITORIA;
}>;

export function montarFiltroAuditoria(filtro: FiltroAuditoria): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filtro.entidade) where.entity = filtro.entidade;
  if (filtro.entidadeId) where.entityId = filtro.entidadeId;
  if (filtro.userId) where.userId = filtro.userId;
  if (filtro.acao) where.action = filtro.acao;

  if (filtro.de || filtro.ate) {
    where.createdAt = {
      ...(filtro.de ? { gte: filtro.de } : {}),
      ...(filtro.ate ? { lte: filtro.ate } : {}),
    };
  }

  const busca = filtro.busca?.trim();
  if (busca) {
    where.OR = [
      { summary: { contains: busca, mode: "insensitive" } },
      { entityId: { contains: busca, mode: "insensitive" } },
      { entity: { contains: busca, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listarAuditoria(filtro: FiltroAuditoria = {}) {
  const porPagina = Math.min(Math.max(filtro.porPagina ?? 50, 1), 200);
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const where = montarFiltroAuditoria(filtro);

  const [registros, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: SELECAO_AUDITORIA,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    registros,
    total,
    pagina,
    porPagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

/** Histórico de um registro só — para a linha do tempo da ficha. */
export async function historicoDe(entidade: string, entidadeId: string, limite = 20) {
  return prisma.auditLog.findMany({
    where: { entity: entidade, entityId: entidadeId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limite, 1), 100),
    select: SELECAO_AUDITORIA,
  });
}
