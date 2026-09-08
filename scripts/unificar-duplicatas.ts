/* ============================================================================
   Unificação de cadastros duplicados — categorias e marcas

   O catálogo publicado tem dois cadastros para a mesma coisa, herdados de
   cargas diferentes:

     Categoria  "Biossegurança"  →  `bioseguranca`   (carga do site em PHP)
                "Biossegurança"  →  `biosseguranca`  (catálogo do protótipo)
     Marca      "Schuster"       →  `schuster`       (catálogo do protótipo)
                "Schuster"       →  `demo-schuster`  (demonstração de operação)

   Na tela isso aparecia como duas caixas idênticas na barra de filtros, duas
   pastilhas iguais nos atalhos, duas placas "Schuster" na parede de marcas e
   duas opções iguais na escolha do tipo de equipamento do chamado.

   A loja pública já junta cadastros de mesmo nome na hora de exibir (ver
   `src/lib/homonimos.ts`), então o site está correto mesmo sem esta limpeza.
   O que ela conserta é o CADASTRO: enquanto houver dois registros, o painel
   continua oferecendo os dois na hora de publicar um equipamento, e o
   problema volta a nascer a cada produto novo.

   O que o script faz
   ------------------
   · Agrupa categorias e marcas publicadas pelo nome normalizado.
   · Elege a canônica: a que tem mais equipamentos publicados; empate resolve
     pela ordem editorial (`order`) e, por fim, pela mais antiga.
   · Move para a canônica tudo que aponta para as duplicadas — produtos,
     chamados e equipamentos de cliente.
   · Despublica a duplicada, que fica vazia.

   O que ele NÃO faz, de propósito
   -------------------------------
   · Não apaga linha. `Category` e `Brand` saem com `published: false` e
     continuam no painel: apagar levaria junto o histórico de quem apontava
     para elas, e um `SetNull` em cascata é bem pior do que um cadastro a mais
     escondido.
   · Não junta grafias diferentes. "Biosegurança" com um "s" só continua sendo
     outro cadastro — corrigir grafia é trabalho de
     `scripts/conteudo-categorias.ts`, e juntar por semelhança esconderia o
     erro em vez de mostrá-lo.
   · Não roda sozinho. Sem `--aplicar` ele só imprime o plano.

       pnpm duplicatas:prever     # mostra o que mudaria
       pnpm duplicatas:unificar   # aplica

   O banco alvo é o de `DATABASE_URL`. Para o preview da plataforma, aponte
   a variável para o banco do preview antes de rodar.
   ============================================================================ */
import { PrismaClient } from "@prisma/client";

import { chaveDeNome } from "../src/lib/homonimos";

const prisma = new PrismaClient();
const APLICAR = process.argv.includes("--aplicar");

type Registro = {
  id: string;
  slug: string;
  name: string;
  order: number;
  createdAt: Date;
  produtos: number;
};

/** Grupos de mesmo nome com mais de um cadastro. */
function duplicados(registros: Registro[]): Registro[][] {
  const porNome = new Map<string, Registro[]>();
  for (const registro of registros) {
    const chave = chaveDeNome(registro.name);
    porNome.set(chave, [...(porNome.get(chave) ?? []), registro]);
  }
  return [...porNome.values()].filter((grupo) => grupo.length > 1);
}

/**
 * A canônica é a que a loja já usa de fato.
 *
 * Mais equipamentos publicados ganha — é a que tem mais a perder num link
 * trocado e a que os visitantes já encontram. Empate cai na ordem editorial
 * definida no painel e, se ainda empatar, na mais antiga: o cadastro que
 * existe há mais tempo é o que tem mais chance de estar em índice de busca e
 * em link de terceiro.
 */
function eleger(grupo: Registro[]): Registro {
  return [...grupo].sort(
    (a, b) =>
      b.produtos - a.produtos ||
      a.order - b.order ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];
}

async function categorias() {
  const linhas = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      order: true,
      createdAt: true,
      _count: { select: { products: { where: { status: "active" } } } },
    },
  });

  const grupos = duplicados(
    linhas.map((l) => ({ ...l, produtos: l._count.products })),
  );

  for (const grupo of grupos) {
    const canonica = eleger(grupo);
    const extras = grupo.filter((r) => r.id !== canonica.id);

    console.log(`\ncategoria "${canonica.name}"`);
    console.log(`  fica:  ${canonica.slug} (${canonica.produtos} equipamentos publicados)`);

    for (const extra of extras) {
      const [produtos, chamados, equipamentos] = await Promise.all([
        prisma.product.count({ where: { categoryId: extra.id } }),
        prisma.serviceRequest.count({ where: { categoryId: extra.id } }),
        prisma.equipment.count({ where: { categoryId: extra.id } }),
      ]);

      console.log(
        `  junta: ${extra.slug} → ${produtos} produtos, ${chamados} chamados, ${equipamentos} equipamentos de cliente`,
      );

      if (!APLICAR) continue;

      await prisma.$transaction([
        prisma.product.updateMany({
          where: { categoryId: extra.id },
          data: { categoryId: canonica.id },
        }),
        prisma.serviceRequest.updateMany({
          where: { categoryId: extra.id },
          data: { categoryId: canonica.id },
        }),
        prisma.equipment.updateMany({
          where: { categoryId: extra.id },
          data: { categoryId: canonica.id },
        }),
        prisma.category.update({
          where: { id: extra.id },
          data: { published: false },
        }),
      ]);
      console.log(`         aplicado — ${extra.slug} despublicada`);
    }
  }

  return grupos.length;
}

async function marcas() {
  const linhas = await prisma.brand.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      order: true,
      createdAt: true,
      _count: { select: { products: { where: { status: "active" } } } },
    },
  });

  const grupos = duplicados(
    linhas.map((l) => ({ ...l, produtos: l._count.products })),
  );

  for (const grupo of grupos) {
    const canonica = eleger(grupo);
    const extras = grupo.filter((r) => r.id !== canonica.id);

    console.log(`\nmarca "${canonica.name}"`);
    console.log(`  fica:  ${canonica.slug} (${canonica.produtos} equipamentos publicados)`);

    for (const extra of extras) {
      const produtos = await prisma.product.count({ where: { brandId: extra.id } });
      console.log(`  junta: ${extra.slug} → ${produtos} produtos`);

      if (!APLICAR) continue;

      await prisma.$transaction([
        prisma.product.updateMany({
          where: { brandId: extra.id },
          data: { brandId: canonica.id },
        }),
        prisma.brand.update({ where: { id: extra.id }, data: { published: false } }),
      ]);
      console.log(`         aplicado — ${extra.slug} despublicada`);
    }
  }

  return grupos.length;
}

async function main() {
  console.log(APLICAR ? "→ unificando duplicatas" : "→ prévia (nada será alterado)");

  const total = (await categorias()) + (await marcas());

  if (total === 0) {
    console.log("\nNenhum cadastro duplicado. Nada a fazer.");
  } else if (!APLICAR) {
    console.log("\nRode com --aplicar para efetivar (pnpm duplicatas:unificar).");
  } else {
    console.log(
      "\nPronto. Revise as categorias e marcas despublicadas no painel antes de removê-las.",
    );
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
