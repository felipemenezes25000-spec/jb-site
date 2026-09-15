import { PrismaClient } from "@prisma/client";

import { exigirAmbienteSeguro, urlsBancoEfetivas } from "@/lib/seguranca-ambiente";

/**
 * Qual banco a aplicação usa.
 *
 * Os deploys de preview (branches) apontam para um Postgres separado, para que
 * uma demonstração ou um teste jamais escreva no banco de produção. A escolha
 * da conexão vive em `seguranca-ambiente.ts` e é compartilhada com o Prisma
 * CLI, evitando runtime em preview e migrations em produção por acidente.
 */
function urlDoBanco() {
  exigirAmbienteSeguro(process.env, "database");
  return urlsBancoEfetivas(process.env).runtime;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: urlDoBanco(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
