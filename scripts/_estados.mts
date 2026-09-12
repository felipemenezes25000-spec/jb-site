/**
 * Vira o produto de ensaio entre os estados que o catálogo local não tem.
 * TEMPORÁRIO. `restaurar` devolve o estado original.
 *
 *   npx tsx scripts/_estados.mts sem-estoque | so-orcamento | arquivado | restaurar
 */
import { prisma } from "../src/lib/prisma";

const ALVO = "autoclave-vertical-18l-classe-b";
const estado = process.argv[2] || "restaurar";

type EstadoProduto = {
  status: "active" | "archived" | "draft";
  stock: number;
  trackInventory: boolean;
  allowDirectPurchase: boolean;
  allowQuoteRequest: boolean;
};

const original: EstadoProduto = {
  status: "active",
  stock: 12,
  trackInventory: true,
  allowDirectPurchase: true,
  allowQuoteRequest: true,
};

const mapa: Record<string, Partial<EstadoProduto>> = {
  "sem-estoque": { stock: 0, trackInventory: true },
  "so-orcamento": { allowDirectPurchase: false },
  arquivado: { status: "archived" },
  restaurar: original,
};

const dados = mapa[estado];
if (!dados) throw new Error(`estado desconhecido: ${estado}`);

const antes = await prisma.product.findUniqueOrThrow({
  where: { slug: ALVO },
  select: { status: true, stock: true, trackInventory: true, allowDirectPurchase: true },
});

await prisma.product.update({
  where: { slug: ALVO },
  data: estado === "restaurar" ? original : { ...original, ...dados },
});

console.log(`${estado}: antes ${JSON.stringify(antes)}`);
await prisma.$disconnect();
