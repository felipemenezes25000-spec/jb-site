import { PrismaClient } from "@prisma/client";

/**
 * Qual banco a aplicação usa.
 *
 * Os deploys de preview (branches) apontam para um Postgres separado, para que
 * uma demonstração ou um teste jamais escreva no banco de produção. A Vercel
 * expõe as duas conexões no mesmo ambiente, então a escolha é explícita aqui:
 * havendo JBPREV_DATABASE_URL, é preview e ele vence.
 */
function urlDoBanco() {
  const preview = process.env.JBPREV_DATABASE_URL;
  if (preview && process.env.VERCEL_ENV !== "production") return preview;
  return process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: urlDoBanco(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
