/**
 * Remove o que o QA do checkout deixou no banco LOCAL. TEMPORÁRIO.
 *   npx tsx scripts/_limpar-qa.mts            → só lista
 *   npx tsx scripts/_limpar-qa.mts --aplicar  → apaga
 */
import { prisma } from "../src/lib/prisma";

const aplicar = process.argv.includes("--aplicar");

const clientes = await prisma.customer.findMany({
  where: { email: { startsWith: "qa." } },
  select: { id: true, email: true, name: true, _count: { select: { orders: true } } },
});

console.log(`clientes de QA: ${clientes.length}`);
for (const c of clientes) console.log(`  ${c.email}  pedidos=${c._count.orders}`);

const ids = clientes.map((c) => c.id);
const pedidos = ids.length
  ? await prisma.order.findMany({
      where: { customerId: { in: ids } },
      select: { id: true, number: true, status: true, totalCents: true },
    })
  : [];
console.log(`pedidos de QA: ${pedidos.length}`);
for (const p of pedidos) console.log(`  #${p.number}  ${p.status}  ${p.totalCents}`);

if (!aplicar) {
  console.log("\n(nada apagado — rode com --aplicar)");
} else if (ids.length) {
  const r = await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  console.log(`\napagados ${r.count} clientes de QA (pedidos vão junto por cascata)`);
} else {
  console.log("\nnada a apagar");
}

await prisma.$disconnect();
