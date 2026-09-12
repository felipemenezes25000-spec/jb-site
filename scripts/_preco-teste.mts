/**
 * Ajusta o preço do produto de teste para disparar cada desfecho do provedor
 * `mock` (centavos 01 = recusado, 02 = em análise, 00 = aprovado). TEMPORÁRIO.
 *   npx tsx scripts/_preco-teste.mts 123401
 */
import { prisma } from "../src/lib/prisma";

const ALVO = process.env.SLUG || "e2e-equipamento-com-frete";
const centavos = Number(process.argv[2] || 123400);

const antes = await prisma.product.findUniqueOrThrow({
  where: { slug: ALVO },
  select: { priceCents: true, name: true },
});

await prisma.product.update({ where: { slug: ALVO }, data: { priceCents: centavos } });
console.log(`${ALVO}: ${antes.priceCents} → ${centavos} (final ${centavos % 100})`);
await prisma.$disconnect();
