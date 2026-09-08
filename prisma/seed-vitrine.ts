/**
 * Catálogo de demonstração da vitrine.
 *
 * Carrega os 12 equipamentos usados no protótipo aprovado (marca, categoria,
 * SKU, preço, estoque, ficha técnica e destaques) e arquiva o catálogo de
 * demonstração anterior, cujas fotos eram recortes com halo.
 *
 * O que este script NÃO faz, de propósito
 * ---------------------------------------
 * · Não apaga produto. Os anteriores vão para `status: "archived"` — somem da
 *   loja, continuam no painel e voltam com um clique. Apagar linha de produto
 *   levaria junto pedido, avaliação e histórico de estoque por cascata.
 * · Não copia nota nem número de avaliações do protótipo. Lá são inventadas;
 *   aqui avaliação só existe quando um cliente avalia.
 *
 * Sobre as imagens
 * ----------------
 * São ilustrações geradas por IA, 1024×1024, fundo branco. Não são fotos dos
 * equipamentos que a JB vende, e é por isso que cada uma entra com o crédito
 * escrito no acervo. Servem para o preview de aprovação; antes de o site
 * receber pedido de verdade elas precisam ser trocadas pelas fotos da JB —
 * a regra está em `public/images/CREDITOS.md`.
 *
 *   pnpm db:vitrine
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient, type ProductCondition } from "@prisma/client";

import { FICHA_DEMO } from "./ficha-demo";

const prisma = new PrismaClient();

const RAIZ = process.cwd();
const CREDITO = "Ilustração de demonstração gerada por IA — não é foto do equipamento vendido";

type ProdutoDoArquivo = {
  slug: string;
  name: string;
  short: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  listPrice?: number;
  condition: string;
  stock: number;
  leadTime: string;
  image: string;
  warranty: string;
  installedBy: string;
  specs: { label: string; value: string }[];
  highlights: string[];
};

type Arquivo = {
  categories: { slug: string; name: string; blurb: string; icon: string }[];
  brands: string[];
  products: ProdutoDoArquivo[];
};

/** "Dabi Atlante" → "dabi-atlante" */
function paraSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Meses a partir de "12 meses de garantia de fábrica". */
function garantiaEmMeses(texto: string): number | null {
  const achado = texto.match(/(\d+)\s*mes/i);
  return achado ? Number(achado[1]) : null;
}

/** A voltagem sai da própria ficha técnica, quando ela declara uma. */
function voltagemDaFicha(specs: { label: string; value: string }[]): string | null {
  const linha = specs.find((s) => /tens[ãa]o/i.test(s.label));
  if (!linha) return null;
  if (/bivolt/i.test(linha.value)) return "bivolt";
  if (/220/.test(linha.value)) return "220";
  if (/110|127/.test(linha.value)) return "110";
  return null;
}

async function main() {
  const arquivo = JSON.parse(
    readFileSync(join(RAIZ, "prisma", "catalogo-demo.json"), "utf8"),
  ) as Arquivo;

  /* ------------------------------------------------------------- categorias */
  for (const [ordem, categoria] of arquivo.categories.entries()) {
    await prisma.category.upsert({
      where: { slug: categoria.slug },
      update: { name: categoria.name, description: categoria.blurb, published: true },
      create: {
        slug: categoria.slug,
        name: categoria.name,
        description: categoria.blurb,
        order: ordem,
        published: true,
      },
    });
  }
  console.log(`categorias: ${arquivo.categories.length}`);

  /* ------------------------------------------------------------------ marcas */
  for (const [ordem, marca] of arquivo.brands.entries()) {
    await prisma.brand.upsert({
      where: { slug: paraSlug(marca) },
      update: { name: marca, published: true },
      create: { slug: paraSlug(marca), name: marca, order: ordem, published: true },
    });
  }
  console.log(`marcas: ${arquivo.brands.length}`);

  /* ---------------------------------------------------------------- produtos */
  const slugsNovos: string[] = [];

  for (const produto of arquivo.products) {
    const nomeDoArquivo = produto.image.split(/[\\/]/).pop() ?? "";
    const caminhoPublico = `/catalogo-demo/${nomeDoArquivo}`;
    const caminhoNoDisco = join(RAIZ, "public", "catalogo-demo", nomeDoArquivo);

    let tamanho = 0;
    try {
      tamanho = statSync(caminhoNoDisco).size;
    } catch {
      console.warn(`  ! imagem ausente: ${caminhoPublico}`);
    }

    const midia = await prisma.media.upsert({
      where: { id: `vitrine-${nomeDoArquivo}` },
      update: { url: caminhoPublico, alt: produto.name, credit: CREDITO },
      create: {
        id: `vitrine-${nomeDoArquivo}`,
        filename: nomeDoArquivo,
        url: caminhoPublico,
        alt: produto.name,
        mime: "image/jpeg",
        size: tamanho,
        width: 1024,
        height: 1024,
        folder: "catalogo-demo",
        credit: CREDITO,
      },
    });

    const marca = await prisma.brand.findUnique({ where: { slug: paraSlug(produto.brand) } });
    const categoria = await prisma.category.findUnique({ where: { slug: produto.category } });
    const seminovo = produto.condition === "seminovo";

    /* A descrição junta o resumo com o que o protótipo chamava de
       "highlights": são as frases que a JB assina sobre o equipamento. */
    const descricao = [
      `<p>${produto.short}</p>`,
      "<ul>",
      ...produto.highlights.map((linha) => `<li>${linha}</li>`),
      `<li>${produto.warranty}</li>`,
      `<li>${produto.installedBy}</li>`,
      "</ul>",
    ].join("");

    /* O resto da ficha — medida, peso, o que vem na caixa e o que a clínica
       precisa ter pronto. Sem isso três seções da página abrem vazias, e a
       ficha parece pela metade num site que existe para apresentar. */
    const ficha = FICHA_DEMO[produto.slug];

    const dados = {
      name: produto.name,
      shortDescription: produto.short,
      manufacturer: ficha?.fabricante ?? null,
      weightGrams: ficha?.pesoGramas ?? null,
      widthMm: ficha?.larguraMm ?? null,
      heightMm: ficha?.alturaMm ?? null,
      depthMm: ficha?.profundidadeMm ?? null,
      boxContents: ficha?.naCaixa ?? [],
      infrastructureNotes: ficha?.requisitos ?? [],
      description: descricao,
      status: "active" as const,
      condition: produto.condition as ProductCondition,
      brandId: marca?.id ?? null,
      categoryId: categoria?.id ?? null,
      priceCents: produto.price * 100,
      compareAtCents: produto.listPrice ? produto.listPrice * 100 : null,
      trackInventory: true,
      /* Seminovo é unidade única: uma peça revisada, não um lote. */
      unique: seminovo,
      stock: seminovo ? 1 : produto.stock,
      warrantyMonths: garantiaEmMeses(produto.warranty),
      voltage: voltagemDaFicha(produto.specs),
      allowDirectPurchase: true,
      allowQuoteRequest: true,
      seoTitle: produto.name,
      seoDescription: produto.short,
    };

    const criado = await prisma.product.upsert({
      where: { slug: produto.slug },
      update: dados,
      create: {
        ...dados,
        slug: produto.slug,
        sku: produto.sku,
        model: "",
        publishedAt: new Date(),
      },
    });

    await prisma.productMedia.upsert({
      where: { productId_mediaId: { productId: criado.id, mediaId: midia.id } },
      update: { alt: produto.name, order: 0 },
      create: { productId: criado.id, mediaId: midia.id, alt: produto.name, order: 0 },
    });

    await prisma.productSpec.deleteMany({ where: { productId: criado.id } });
    await prisma.productSpec.createMany({
      data: produto.specs.map((spec, indice) => ({
        productId: criado.id,
        label: spec.label,
        value: spec.value,
        order: indice,
      })),
    });

    /* As dúvidas frequentes do equipamento. A seção existe mesmo sem elas —
       ela oferece o formulário —, mas com pergunta respondida ela deixa de
       ser um campo em branco e passa a adiantar a conversa. */
    await prisma.faq.deleteMany({ where: { productId: criado.id } });
    if (ficha?.duvidas.length) {
      await prisma.faq.createMany({
        data: ficha.duvidas.map((duvida, indice) => ({
          productId: criado.id,
          question: duvida.pergunta,
          answer: duvida.resposta,
          group: "produto",
          order: indice,
          published: true,
        })),
      });
    }

    /* ------------------------------------------------- a unidade do seminovo

       Seminovo sem unidade cadastrada deixa a coleção muda: a página de
       /seminovos só promete o que encontra registrado, e a ficha só mostra
       "esta unidade" quando existe uma peça identificada. Sem isso o catálogo
       de demonstração exibiria a coleção com o discurso todo desligado.

       Os números são de demonstração, como o resto deste seed — o que não é
       de demonstração é a regra: eles moram na unidade, não no produto. */
    if (seminovo) {
      const unidadeExistente = await prisma.inventoryUnit.findFirst({
        where: { productId: criado.id },
        select: { id: true },
      });

      const serie = `JB-${produto.sku.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase()}-01`;

      const dadosDaUnidade = {
        serialNumber: serie,
        status: "disponivel" as const,
        manufactureYear: 2021,
        usageCycles: 1840,
        conditionNotes:
          "Marcas leves de uso na lateral direita, sem trinca nem oxidação. Painel e vedação sem intercorrência.",
        inspectionNotes:
          "Revisado na bancada da JB: teste de ciclo completo, conferência de vedação e calibração antes de voltar ao catálogo.",
        warrantyMonths: 6,
        acquiredFrom: "Troca por equipamento novo em clínica de São Paulo",
      };

      const unidade = unidadeExistente
        ? await prisma.inventoryUnit.update({
            where: { id: unidadeExistente.id },
            data: dadosDaUnidade,
          })
        : await prisma.inventoryUnit.create({
            data: { ...dadosDaUnidade, productId: criado.id },
          });

      const checklist = [
        ["Ciclo completo de teste", "verificado"],
        ["Vedação da câmara", "substituido"],
        ["Calibração de temperatura", "verificado"],
        ["Painel e comandos", "verificado"],
        ["Cabo e plugue", "verificado"],
      ] as const;

      await prisma.inventoryCheckItem.deleteMany({ where: { unitId: unidade.id } });
      await prisma.inventoryCheckItem.createMany({
        data: checklist.map(([label, result], indice) => ({
          unitId: unidade.id,
          label,
          result,
          order: indice,
        })),
      });
    }

    slugsNovos.push(produto.slug);
    console.log(`  · ${produto.slug}${seminovo ? " (com unidade e checklist)" : ""}`);
  }

  /* -------------------------------------------------- catálogo antigo sai do ar */
  const arquivados = await prisma.product.updateMany({
    where: { slug: { notIn: slugsNovos }, status: "active" },
    data: { status: "archived" },
  });

  console.log(`\nprodutos publicados: ${slugsNovos.length}`);
  console.log(`produtos arquivados (saíram da loja, seguem no painel): ${arquivados.count}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
