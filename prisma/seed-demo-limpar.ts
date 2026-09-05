/**
 * Remove tudo que os seeds de demonstração criaram.
 *
 * Nada de dado real é tocado: o filtro é sempre o prefixo `demo` — no slug do
 * produto, no e-mail da pessoa, ou na nota interna do registro.
 *
 * A ordem aqui importa. Boa parte das relações da plataforma é `SetNull` de
 * propósito (um pedido não desaparece porque o cliente foi apagado), então
 * apagar o cliente NÃO leva junto pedido, chamado, orçamento, OS nem ticket.
 * Esses precisam ser removidos explicitamente, dos filhos para os pais.
 *
 *   pnpm db:demo:limpar
 */
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAILS_CLIENTE = [
  "demo@jbteste.local",
  "demo.sorriso@jbteste.local",
  "demo.paulo@jbteste.local",
];

const MARCA = "[DEMO] gerado por seed-demo-operacao";

const contagem: Record<string, number> = {};

function contar(rotulo: string, quantidade: number) {
  if (quantidade > 0) contagem[rotulo] = (contagem[rotulo] ?? 0) + quantidade;
}

async function main() {
  const clientes = await prisma.customer.findMany({
    where: { email: { in: EMAILS_CLIENTE } },
    select: { id: true },
  });
  const clienteIds = clientes.map((c) => c.id);

  /* ---------------------------------------------------------------- pedidos */
  const pedidos = await prisma.order.findMany({
    where: {
      OR: [
        { internalNote: { contains: MARCA } },
        { buyerEmail: { in: EMAILS_CLIENTE } },
        ...(clienteIds.length ? [{ customerId: { in: clienteIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const pedidoIds = pedidos.map((p) => p.id);

  if (pedidoIds.length) {
    // a agenda aponta para a instalação com SetNull: apaga antes
    const tarefas = await prisma.installationTask.findMany({
      where: { orderId: { in: pedidoIds } },
      select: { id: true },
    });
    contar(
      "compromissos",
      (
        await prisma.serviceAppointment.deleteMany({
          where: { installTaskId: { in: tarefas.map((t) => t.id) } },
        })
      ).count,
    );
    // Equipment.orderId é SetNull; os equipamentos caem junto com o cliente
    contar("pedidos", (await prisma.order.deleteMany({ where: { id: { in: pedidoIds } } })).count);
  }

  /* --------------------------------------------------------------- chamados */
  const chamados = await prisma.serviceRequest.findMany({
    where: {
      OR: [
        { internalNote: { contains: MARCA } },
        { contactEmail: { in: EMAILS_CLIENTE } },
        ...(clienteIds.length ? [{ customerId: { in: clienteIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const chamadoIds = chamados.map((c) => c.id);

  if (chamadoIds.length) {
    contar(
      "compromissos",
      (await prisma.serviceAppointment.deleteMany({ where: { requestId: { in: chamadoIds } } }))
        .count,
    );

    // a OS referencia o chamado com SetNull: some do filtro se apagarmos antes
    const ordens = await prisma.workOrder.findMany({
      where: { OR: [{ requestId: { in: chamadoIds } }, { notes: { contains: MARCA } }] },
      select: { id: true },
    });
    contar(
      "ordens de serviço",
      (await prisma.workOrder.deleteMany({ where: { id: { in: ordens.map((o) => o.id) } } })).count,
    );

    contar(
      "orçamentos",
      (
        await prisma.quote.deleteMany({
          where: {
            OR: [
              { requestId: { in: chamadoIds } },
              { internalNote: { contains: MARCA } },
              ...(clienteIds.length ? [{ customerId: { in: clienteIds } }] : []),
            ],
          },
        })
      ).count,
    );

    contar(
      "chamados",
      (await prisma.serviceRequest.deleteMany({ where: { id: { in: chamadoIds } } })).count,
    );
  }

  /* orçamentos que não vieram de chamado nenhum */
  contar(
    "orçamentos",
    (
      await prisma.quote.deleteMany({
        where: {
          OR: [
            { internalNote: { contains: MARCA } },
            ...(clienteIds.length ? [{ customerId: { in: clienteIds } }] : []),
          ],
        },
      })
    ).count,
  );

  /* --------------------------------------------------------------- suporte */
  if (clienteIds.length) {
    contar(
      "tickets",
      (await prisma.supportTicket.deleteMany({ where: { customerId: { in: clienteIds } } })).count,
    );
  }

  /* -------------------------------------------------------------- clientes */
  // daqui em diante o cascade dá conta: endereços, equipamentos, documentos,
  // favoritos, avisos, contratos e visitas
  contar(
    "clientes",
    (await prisma.customer.deleteMany({ where: { email: { in: EMAILS_CLIENTE } } })).count,
  );

  /* ----------------------------------------------------------------- equipe */
  contar(
    "usuários",
    (await prisma.user.deleteMany({ where: { email: { endsWith: "@jbteste.local" } } })).count,
  );

  /* ---------------------------------------------------------------- catálogo */
  contar(
    "planos",
    (await prisma.maintenancePlan.deleteMany({ where: { slug: { startsWith: "demo-" } } })).count,
  );
  contar(
    "cupons",
    (await prisma.coupon.deleteMany({ where: { code: { in: ["DEMO10", "DEMO500"] } } })).count,
  );
  contar(
    "leads",
    (await prisma.lead.deleteMany({ where: { email: { endsWith: "@jbteste.local" } } })).count,
  );
  contar(
    "produtos",
    (await prisma.product.deleteMany({ where: { slug: { startsWith: "demo-" } } })).count,
  );
  contar(
    "marcas",
    (await prisma.brand.deleteMany({ where: { slug: { startsWith: "demo-" } } })).count,
  );
  contar("mídias", (await prisma.media.deleteMany({ where: { folder: "demo" } })).count);

  /* --------------------------------------------------------------- arquivos */
  const pasta = path.join(process.cwd(), "public", "uploads", "demo");
  if (fs.existsSync(pasta)) {
    const arquivos = fs.readdirSync(pasta);
    fs.rmSync(pasta, { recursive: true, force: true });
    contar("arquivos", arquivos.length);
  }

  const linhas = Object.entries(contagem).map(([rotulo, n]) => `${n} ${rotulo}`);
  console.log(linhas.length ? `removidos: ${linhas.join(", ")}` : "nada de demonstração encontrado");

  await prisma.$disconnect();
}

void main();
