import { prisma } from "../src/lib/prisma";
const c = await prisma.customer.findMany({
  select: {
    email: true, name: true,
    _count: { select: { orders: true, equipments: true, serviceRequests: true, quotes: true, documents: true, contracts: true, favorites: true } },
  },
  take: 10,
});
for (const x of c) {
  const n = x._count;
  console.log(`${x.email.padEnd(32)} pedidos=${n.orders} equip=${n.equipments} chamados=${n.serviceRequests} orc=${n.quotes} docs=${n.documents} contratos=${n.contracts} fav=${n.favorites}`);
}
