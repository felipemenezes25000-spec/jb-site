import "server-only";

import type { Prisma } from "@prisma/client";

import type { MidiaResumo } from "@/components/admin/conteudo/seletor-midia";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Consultas compartilhadas das telas de conteúdo

   `import "server-only"` no topo é proposital: este arquivo toca no banco e
   mora na pasta de componentes. Se alguém importá-lo de um componente cliente
   por engano, a build falha com uma mensagem clara em vez de arrastar o Prisma
   para o pacote do navegador.
   ============================================================================ */

export const SELECAO_MIDIA = {
  id: true,
  url: true,
  filename: true,
  alt: true,
  width: true,
  height: true,
} satisfies Prisma.MediaSelect;

/**
 * Imagens oferecidas no seletor. É uma janela das mais recentes, não a
 * biblioteca inteira: quem procura um arquivo antigo usa a busca dentro do
 * próprio seletor, e a tela não carrega milhares de linhas para desenhar uma
 * grade de miniaturas.
 */
export async function bibliotecaDeImagens(limite = 60): Promise<MidiaResumo[]> {
  return prisma.media.findMany({
    where: { mime: { startsWith: "image/" } },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: SELECAO_MIDIA,
  });
}

/** Produtos ativos para o campo de pergunta frequente ligada a produto. */
export async function produtosParaEscolha(limite = 300) {
  return prisma.product.findMany({
    where: { status: { not: "archived" } },
    orderBy: { name: "asc" },
    take: limite,
    select: { id: true, name: true, sku: true },
  });
}

/* ------------------------------------------------------------------ leads */

export type ParametrosDeLead = {
  q?: string;
  status?: string;
  data_de?: string;
  data_ate?: string;
};

/**
 * Filtro da listagem de leads.
 *
 * Vive aqui porque a tela e a exportação em CSV precisam responder ao MESMO
 * recorte: exportar tem que devolver exatamente o que está na tela, senão o
 * arquivo não bate com o que a pessoa viu.
 */
export function montarFiltroDeLeads(parametros: ParametrosDeLead): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  const busca = parametros.q?.trim();
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { email: { contains: busca, mode: "insensitive" } },
      { telefone: { contains: busca, mode: "insensitive" } },
      { cidade: { contains: busca, mode: "insensitive" } },
      { obs: { contains: busca, mode: "insensitive" } },
    ];
  }

  const status = parametros.status?.trim();
  if (status) where.status = status;

  const de = dataDoParametro(parametros.data_de);
  const ate = dataDoParametro(parametros.data_ate, true);
  if (de || ate) {
    where.createdAt = { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) };
  }

  return where;
}

/** AAAA-MM-DD do filtro, no fuso de São Paulo. */
export function dataDoParametro(valor: string | undefined, fimDoDia = false): Date | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}T${fimDoDia ? "23:59:59" : "00:00:00"}-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}
