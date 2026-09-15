import { PrismaClient } from "@prisma/client";

/* ============================================================================
   Correções de nome no catálogo publicado

   O nome do produto é a única parte da ficha que a ficha técnica não consegue
   corrigir: ele aparece no título da página, no cartão da vitrine, na trilha,
   no carrinho, no pedido e na nota. Quando ele contradiz uma especificação do
   mesmo produto, quem lê tem duas afirmações e nenhuma forma de saber qual
   vale.

   Foi o caso do fotopolimerizador: o nome dizia "1200 mW" e a ficha do MESMO
   produto dizia "1.200 mW/cm²". Não é a mesma grandeza — miliwatt é potência,
   miliwatt por centímetro quadrado é irradiância, que é o que se mede num
   fotopolimerizador e o que decide o tempo de fotoativação. O nome estava
   errado; a ficha estava certa.

   O arquivo de seed já foi corrigido, mas seed só alcança banco novo. Este
   script alcança os que já existem — preview e produção — e é idempotente:
   roda quantas vezes for preciso, corrige o que ainda estiver errado e não
   toca no que já está certo.

   Uso: `pnpm catalogo:nomes`
   ============================================================================ */

const prisma = new PrismaClient();

type Correcao = {
  slug: string;
  de: string;
  para: string;
  /** Por que o nome estava errado. Fica no log e no histórico do commit. */
  motivo: string;
};

const CORRECOES: Correcao[] = [
  {
    slug: "fotopolimerizador-led-1200",
    de: "Fotopolimerizador LED 1200 mW",
    para: "Fotopolimerizador LED 1.200 mW/cm²",
    motivo:
      "a ficha do mesmo produto diz 1.200 mW/cm² — irradiância, não potência — e o número no nome vinha sem separador de milhar",
  },
];

async function main() {
  let corrigidos = 0;
  let jaCertos = 0;
  let ausentes = 0;

  for (const correcao of CORRECOES) {
    const produto = await prisma.product.findUnique({
      where: { slug: correcao.slug },
      select: { id: true, name: true },
    });

    if (!produto) {
      ausentes += 1;
      console.log(`· ${correcao.slug}: não existe neste banco, nada a fazer.`);
      continue;
    }

    if (produto.name === correcao.para) {
      jaCertos += 1;
      console.log(`· ${correcao.slug}: já está "${correcao.para}".`);
      continue;
    }

    /* Só corrige o nome que se conhece. Se a equipe renomeou o produto por
       conta própria, a decisão é dela — sobrescrever seria este script
       decidindo sobre o catálogo de alguém. */
    if (produto.name !== correcao.de) {
      console.log(
        `· ${correcao.slug}: o nome atual é "${produto.name}", não "${correcao.de}". Deixado como está.`,
      );
      continue;
    }

    await prisma.product.update({
      where: { id: produto.id },
      data: { name: correcao.para },
    });
    corrigidos += 1;
    console.log(`✓ ${correcao.slug}: "${correcao.de}" → "${correcao.para}" (${correcao.motivo})`);
  }

  console.log(
    `\n[catalogo/nomes] ${corrigidos} corrigido(s), ${jaCertos} já correto(s), ${ausentes} ausente(s).`,
  );
}

main()
  .catch((erro) => {
    console.error("[catalogo/nomes] falhou:", erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
