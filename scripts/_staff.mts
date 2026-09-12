import { prisma } from "../src/lib/prisma";
const us = await prisma.user.findMany({
  where: { email: { contains: "e2e" } },
  select: { email: true, name: true, role: true, active: true,  },
});
for (const u of us) console.log(JSON.stringify(u, null, 1));
console.log("--- papéis existentes entre usuários ativos ---");
const todos = await prisma.user.findMany({ select: { email: true, role: true }, take: 10 });
for (const t of todos) console.log(` ${t.role?.padEnd(14) ?? "-"} ${t.email}`);
await prisma.$disconnect();
