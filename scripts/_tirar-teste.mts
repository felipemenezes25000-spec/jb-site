/**
 * Tira do catálogo público os produtos que a suíte de ponta a ponta publica.
 *
 * `tests/e2e/preparar.ts` faz `upsert` com `status: "active"` e `publishedAt`
 * em `e2e-equipamento-com-frete` — ou seja, cada execução da suíte publica um
 * produto comprável chamado "Equipamento de teste com frete" no banco que
 * `DATABASE_URL` apontar. Na CI isso é um Postgres descartável; no banco de
 * desenvolvimento fica na loja, junto dos equipamentos de verdade.
 *
 * Vai para `draft`, não para o lixo: a própria suíte reativa no próximo
 * `pnpm e2e`, e apagar levaria junto o perfil de frete que os testes de CEP
 * dependem.
 *
 *   npx tsx scripts/_tirar-teste.mts            # mostra o que sairia
 *   npx tsx scripts/_tirar-teste.mts --aplicar
 */
import { prisma } from "../src/lib/prisma";

const aplicar = process.argv.includes("--aplicar");

const alvos = await prisma.product.findMany({
  where: { slug: { startsWith: "e2e-" }, status: { not: "draft" } },
  select: { slug: true, name: true, status: true, priceCents: true },
});

if (alvos.length === 0) {
  console.log("nada a fazer: nenhum produto de teste publicado neste banco");
} else {
  for (const a of alvos) {
    console.log(`  ${a.status.padEnd(8)} ${a.slug.padEnd(30)} R$ ${(a.priceCents / 100).toFixed(2).padStart(10)}  ${a.name}`);
  }
  if (aplicar) {
    const r = await prisma.product.updateMany({
      where: { slug: { startsWith: "e2e-" }, status: { not: "draft" } },
      data: { status: "draft" },
    });
    console.log(`\n${r.count} produto(s) fora do catálogo.`);
  } else {
    console.log("\n(nada alterado — rode com --aplicar)");
  }
}
await prisma.$disconnect();
