import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Quem pode assinar ou revisar um artigo da Central Técnica.
 *
 * A lista é fechada de propósito: sai do cadastro de usuários internos ativos,
 * e não de um campo de texto. Um campo livre no lugar disto seria o caminho
 * mais curto para uma assinatura que ninguém deu — e o escopo proíbe
 * nomeadamente publicar autoria ou revisão que não aconteceram.
 *
 * `tecnico` entra porque é quem tem a bancada; `editor`, `gestor` e `admin`
 * entram porque são quem escreve e responde pelo conteúdo. `comercial` fica
 * de fora: vender o equipamento não é conhecer o defeito dele.
 */
export async function equipeQuePodeAssinar() {
  return prisma.user.findMany({
    where: { active: true, role: { in: ["admin", "gestor", "editor", "tecnico"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
