/**
 * Remove as imagens do site antigo (`/images/online/`) e os registros que
 * apontam para elas.
 *
 * Roda contra o banco que `DATABASE_URL` apontar — foi aplicado no banco local
 * em 10/09/2026 e AINDA NÃO em preview nem em produção, que têm bancos Neon
 * próprios.
 *
 *   # confere o que sairia, sem apagar nada
 *   DATABASE_URL="<url do preview>" npx tsx scripts/_legado-imagens.mts
 *
 *   # aplica
 *   DATABASE_URL="<url do preview>" npx tsx scripts/_legado-imagens.mts --aplicar
 *
 * Os ARQUIVOS já saíram do repositório (90 deles, 8,69 MB) e desaparecem no
 * próximo deploy. O que este script resolve é o banco: sem ele, as páginas
 * continuam apontando para arquivos que não existem mais.
 *
 * O que sai junto, para não deixar imagem quebrada na tela:
 *   · slides que usam a mídia legada
 *   · seções da home do tipo `chamada_legado`
 *   · imagens dentro de página
 *   · capa de página (o campo é apenas zerado; a página continua)
 */
import { prisma } from "../src/lib/prisma";

const aplicar = process.argv.includes("--aplicar");

const legadas = await prisma.media.findMany({
  where: { url: { startsWith: "/images/online/" } },
  select: { id: true, url: true },
});

if (legadas.length === 0) {
  console.log("nada a fazer: nenhuma mídia de /images/online/ neste banco");
  await prisma.$disconnect();
  process.exit(0);
}

const ids = legadas.map((m) => m.id);
const [slides, secoes, capas, imagens] = await Promise.all([
  prisma.slide.count({ where: { imageId: { in: ids } } }),
  prisma.homeSection.count({ where: { mediaId: { in: ids } } }),
  prisma.page.count({ where: { coverId: { in: ids } } }),
  prisma.pageImage.count({ where: { mediaId: { in: ids } } }),
]);

console.log(`mídias do site antigo: ${ids.length}`);
for (const m of legadas) console.log(`  ${m.url}`);
console.log(`\nsairiam junto: ${slides} slides · ${secoes} seções da home · ${imagens} imagens de página`);
console.log(`capas de página zeradas: ${capas}`);

if (!aplicar) {
  console.log("\n(nada apagado — rode com --aplicar)");
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$transaction([
  prisma.page.updateMany({ where: { coverId: { in: ids } }, data: { coverId: null } }),
  prisma.pageImage.deleteMany({ where: { mediaId: { in: ids } } }),
  prisma.slide.deleteMany({ where: { imageId: { in: ids } } }),
  prisma.homeSection.deleteMany({ where: { mediaId: { in: ids } } }),
  prisma.media.deleteMany({ where: { id: { in: ids } } }),
]);

console.log("\nbanco limpo.");
await prisma.$disconnect();
