import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Códigos legíveis: JB-001054, OS-001842, ORC-002841, AT-001205.
 *
 * O contador vive em DocumentSequence e é incrementado com UPDATE ... RETURNING,
 * que é atômico no Postgres. `count + 1` colidiria sob concorrência.
 *
 * A premissa é que TODO número passa por aqui. Se linhas entrarem por fora —
 * importação do sistema antigo, restauração de backup parcial, INSERT manual —
 * o contador fica atrás do que já existe e o próximo código colide com um
 * número gravado. Nesse caso, chame `sincronizarSequencia` antes de voltar a
 * emitir: ela empurra o contador para o maior número já usado.
 */

export const PREFIXOS = {
  pedido: "JB",
  ordemServico: "OS",
  orcamento: "ORC",
  chamado: "AT",
  contrato: "CT",
  ticket: "SUP",
} as const;

export type TipoDocumento = keyof typeof PREFIXOS;

type Cliente = PrismaClient | Prisma.TransactionClient;

/**
 * Próximo código da sequência. Aceita um cliente de transação para que o
 * número seja reservado dentro da mesma transação que cria o registro.
 */
export async function proximoCodigo(
  tipo: TipoDocumento,
  cliente: Cliente = prisma,
): Promise<string> {
  const prefixo = PREFIXOS[tipo];

  const linhas = await cliente.$queryRaw<{ current: number }[]>`
    INSERT INTO "DocumentSequence" ("prefix", "current", "updatedAt")
    VALUES (${prefixo}, 1, now())
    ON CONFLICT ("prefix")
    DO UPDATE SET "current" = "DocumentSequence"."current" + 1, "updatedAt" = now()
    RETURNING "current"
  `;

  const numero = linhas[0]?.current ?? 1;
  return `${prefixo}-${String(numero).padStart(6, "0")}`;
}

/**
 * Alinha o contador ao maior número já gravado.
 *
 * Use depois de importar histórico ou restaurar backup, uma vez por prefixo.
 * `GREATEST` garante que a chamada nunca ande para trás — rodar duas vezes, ou
 * rodar com um número menor que o atual, não faz nada.
 */
export async function sincronizarSequencia(
  tipo: TipoDocumento,
  maiorNumero: string | null | undefined,
  cliente: Cliente = prisma,
): Promise<void> {
  const prefixo = PREFIXOS[tipo];
  const atual = Number(maiorNumero?.split("-")[1] ?? 0);
  if (!Number.isFinite(atual) || atual <= 0) return;

  await cliente.$executeRaw`
    INSERT INTO "DocumentSequence" ("prefix", "current", "updatedAt")
    VALUES (${prefixo}, ${atual}, now())
    ON CONFLICT ("prefix")
    DO UPDATE SET
      "current" = GREATEST("DocumentSequence"."current", ${atual}),
      "updatedAt" = now()
  `;
}

/** Token opaco para carrinho de visitante e afins. */
export function tokenAleatorio(bytes = 24) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
