/**
 * Remove tudo que o seed de demonstração criou.
 * Nada de dado real é tocado: o filtro é o prefixo `demo`.
 *
 *   pnpm db:demo:limpar
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cliente = await prisma.customer.findUnique({ where: { email: "demo@jbteste.local" } });
  if (cliente) {
    // as relações caem por cascade a partir do cliente
    await prisma.customer.delete({ where: { id: cliente.id } });
    console.log("cliente de demonstração removido");
  }

  // ServiceRequest referencia o cliente com SetNull: sem isto sobra órfão
  const chamados = await prisma.serviceRequest.deleteMany({
    where: { customerId: null, contactEmail: "demo@jbteste.local" },
  });
  if (chamados.count) console.log(`${chamados.count} chamado(s) órfão(s) removido(s)`);

  const produtos = await prisma.product.deleteMany({ where: { slug: { startsWith: "demo-" } } });
  const marcas = await prisma.brand.deleteMany({ where: { slug: { startsWith: "demo-" } } });
  const midias = await prisma.media.deleteMany({ where: { folder: "demo" } });

  console.log(
    `removidos: ${produtos.count} produtos, ${marcas.count} marcas, ${midias.count} mídias`,
  );
  await prisma.$disconnect();
}

void main();
