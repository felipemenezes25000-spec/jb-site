/**
 * Dados de ENSAIO — só no banco local, só para ver caminhos que o catálogo
 * local nunca exercita: galeria com várias fotos e cross-sell com relações.
 * TEMPORÁRIO. `--limpar` desfaz tudo.
 *
 *   npx tsx scripts/_ensaio.mts
 *   npx tsx scripts/_ensaio.mts --limpar
 */
import { prisma } from "../src/lib/prisma";
import { codificarOrdemRelacao } from "../src/lib/marketplace/relacionamentos-produto";

const ALVO = "autoclave-vertical-18l-classe-b";
const limpar = process.argv.includes("--limpar");

const produto = await prisma.product.findUniqueOrThrow({
  where: { slug: ALVO },
  select: { id: true, media: { select: { id: true, mediaId: true, order: true } } },
});

const extras = ["/catalogo-demo/cuba-ultrassonica.jpg", "/catalogo-demo/seladora.jpg", "/catalogo-demo/compressor.jpg"];
const midias = await prisma.media.findMany({ where: { url: { in: extras } }, select: { id: true, url: true } });

const relacionados: Array<[string, "acessorio" | "complemento" | "alternativa", number]> = [
  ["seladora-de-embalagens-30cm", "acessorio", 0],
  ["cuba-lavadora-ultrassonica-7l", "complemento", 0],
  ["compressor-isento-de-oleo-40l", "complemento", 1],
  ["autoclave-12l-revisada", "alternativa", 0],
];

if (limpar) {
  const apagadas = await prisma.productMedia.deleteMany({
    where: { productId: produto.id, mediaId: { in: midias.map((m) => m.id) } },
  });
  const semRelacao = await prisma.productRelation.deleteMany({ where: { sourceId: produto.id } });
  console.log(`limpo: ${apagadas.count} fotos de ensaio, ${semRelacao.count} relações de ensaio`);
} else {
  let ordem = produto.media.length;
  for (const midia of midias) {
    await prisma.productMedia.upsert({
      where: { productId_mediaId: { productId: produto.id, mediaId: midia.id } },
      create: { productId: produto.id, mediaId: midia.id, order: ordem++, alt: "Foto de ensaio" },
      update: {},
    });
  }

  for (const [slug, tipo, posicao] of relacionados) {
    const alvo = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!alvo) continue;
    await prisma.productRelation.upsert({
      where: { sourceId_targetId: { sourceId: produto.id, targetId: alvo.id } },
      create: { sourceId: produto.id, targetId: alvo.id, order: codificarOrdemRelacao(tipo, posicao) },
      update: { order: codificarOrdemRelacao(tipo, posicao) },
    });
  }
  console.log(`ensaio: ${midias.length} fotos extras, ${relacionados.length} relações`);
}

await prisma.$disconnect();
