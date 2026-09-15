import { PrismaClient } from "@prisma/client";

import { exigirAmbienteSeguro } from "@/lib/seguranca-ambiente";

/**
 * Qual banco a aplicação usa.
 *
 * Os deploys de preview (branches) apontam para um Postgres separado, para que
 * uma demonstração ou um teste jamais escreva no banco de produção. A Vercel
 * expõe as duas conexões no mesmo ambiente, então a escolha é explícita aqui.
 *
 * Configuração perigosa agora falha cedo: preview sem banco próprio e produção
 * com JBPREV_DATABASE_URL não são mais mascarados silenciosamente.
 */
function urlDoBanco() {
  exigirAmbienteSeguro(process.env, "database");

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
