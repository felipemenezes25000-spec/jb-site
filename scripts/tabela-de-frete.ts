/* ============================================================================
   Tabela de frete — instala as faixas que faltam

   A auditoria de 15/09/2026 fechou um pedido de R$ 4.380,00 com "Entrega: a
   combinar". Testados dois CEPs, o da Avenida Paulista (01310-100) e o da
   própria rua da JB (05107-000), os dois responderam a mesma coisa: fora das
   faixas de entrega da tabela.

   O código de frete estava certo. O que não existia era a TABELA: o banco
   tinha uma única faixa cadastrada, e ela pertencia a um perfil criado por
   teste automatizado. Os perfis reais — "Peças e acessórios" e "Equipamento de
   grande porte" — não tinham nenhuma faixa. Sem faixa, `faixaParaCep` devolve
   nulo e todo CEP do Brasil cai em "orçar depois".

   E havia um segundo buraco, maior: NENHUM produto ativo tinha perfil de frete
   preenchido, e o perfil marcado como padrão era justamente "Equipamento de
   grande porte", que é `sob_orcamento` por definição. Ou seja: mesmo com
   tabela, todo produto cairia em "a combinar", porque o padrão do catálogo era
   não ter preço de frete.

   Este script faz duas coisas, nessa ordem:

     1. Instala uma tabela nacional de partida, saindo de São Paulo, nos perfis
        que cobram frete e ainda não têm faixa alguma.
     2. Atribui perfil aos produtos ativos que estão sem nenhum, usando peso e
        medida cadastrados: o que cabe em transportadora vai para a tabela; o
        que é grande demais — cadeira, raio-x de parede — continua sendo orçado
        caso a caso, que é a política correta para esses.

   Produto sem peso e sem medida NÃO recebe perfil. Chutar uma faixa de frete
   para um equipamento cujas dimensões ninguém cadastrou seria inventar preço.

   O que ele NÃO faz, de propósito
   -------------------------------
   · Não toca em perfil que já tem faixa. Preço de frete é decisão comercial;
     sobrescrever a tabela de quem já cadastrou seria pior do que não rodar.
   · Não mexe em perfil `retirada`, `gratis`, `nao_aplicavel` nem
     `sob_orcamento`. Equipamento de grande porte é orçado caso a caso por
     política, não por falta de cadastro.
   · Não roda sozinho. Sem `--aplicar` só imprime o plano.

       pnpm frete:prever    # mostra o que seria criado
       pnpm frete:aplicar   # cria

   Os valores abaixo são ponto de partida conferível, não tabela fechada: a
   equipe ajusta no painel, em /admin/frete, e a partir daí o script nunca mais
   mexe naquele perfil.

   O banco alvo é o de `DATABASE_URL`. Para o preview da plataforma, aponte a
   variável para o banco do preview antes de rodar.
   ============================================================================ */
import { PrismaClient, type ShippingKind } from "@prisma/client";

const prisma = new PrismaClient();
const APLICAR = process.argv.includes("--aplicar");

/** Perfis que cobram transporte e, portanto, precisam de tabela. */
const COBRAM_FRETE: ShippingKind[] = ["transportadora", "entrega_local"];

type Faixa = {
  nome: string;
  inicio: string;
  fim: string;
  precoCents: number;
  prazoDias: number;
};

/**
 * Faixas por CEP, saindo de São Paulo.
 *
 * A divisão acompanha a numeração dos Correios: 01–09 é a Grande São Paulo,
 * 10–19 o interior paulista, 20–39 o restante do Sudeste, 80–99 o Sul, 70–79 o
 * Centro-Oeste, 40–65 o Nordeste e 66–69 o Norte. Faixa que atravessa dois
 * blocos de numeração vira duas linhas — o intervalo é literal, e um intervalo
 * único de 20 a 99 engoliria Centro-Oeste, Nordeste e Norte pelo caminho.
 */
const FAIXAS: Faixa[] = [
  {
    nome: "Grande São Paulo",
    inicio: "01000000",
    fim: "09999999",
    precoCents: 8_990,
    prazoDias: 3,
  },
  {
    nome: "Interior de São Paulo",
    inicio: "10000000",
    fim: "19999999",
    precoCents: 14_990,
    prazoDias: 5,
  },
  {
    nome: "Sudeste (RJ, ES e MG)",
    inicio: "20000000",
    fim: "39999999",
    precoCents: 21_990,
    prazoDias: 7,
  },
  {
    nome: "Sul (PR, SC e RS)",
    inicio: "80000000",
    fim: "99999999",
    precoCents: 23_990,
    prazoDias: 8,
  },
  {
    nome: "Centro-Oeste (DF, GO, TO, MT e MS)",
    inicio: "70000000",
    fim: "79999999",
    precoCents: 28_990,
    prazoDias: 9,
  },
  {
    nome: "Nordeste",
    inicio: "40000000",
    fim: "65999999",
    precoCents: 34_990,
    prazoDias: 12,
  },
  {
    nome: "Norte",
    inicio: "66000000",
    fim: "69999999",
    precoCents: 42_990,
    prazoDias: 15,
  },
];

/* Teto do que uma transportadora comum leva sem projeto de carga. Acima
   disso é caminhão com ajudante, agendamento e, às vezes, içamento — e o
   preço disso não cabe em faixa de CEP. */
const PESO_MAXIMO_GRAMAS = 60_000;
const MEDIDA_MAXIMA_MM = 1_200;

function cabeEmTransportadora(produto: {
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
}): boolean | null {
  const medidas = [produto.widthMm, produto.heightMm, produto.depthMm];
  if (produto.weightGrams === null || medidas.some((medida) => medida === null)) {
    return null; // sem cadastro físico não dá para decidir
  }
  if (produto.weightGrams > PESO_MAXIMO_GRAMAS) return false;
  return medidas.every((medida) => (medida ?? 0) <= MEDIDA_MAXIMA_MM);
}

/**
 * Atribui perfil ao produto que está sem nenhum.
 *
 * `comTabela` vem de fora de propósito. A versão anterior perguntava ao banco
 * quem tinha faixa — e perguntava DEPOIS de instalar as faixas, mas numa
 * prévia nada foi instalado, e na primeira execução contra um banco zerado a
 * consulta corria antes do commit ser visível para ela. O efeito prático: num
 * banco novo, a primeira rodada criava a tabela e deixava dez de doze produtos
 * sem perfil; só a segunda rodada completava. Script que precisa rodar duas
 * vezes para convergir é script que mente na primeira.
 */
async function atribuirPerfis(comTabela: { id: string; name: string } | null) {
  const grandePorte = await prisma.shippingProfile.findFirst({
    where: { kind: "sob_orcamento" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const transportadora = comTabela;

  const semPerfil = await prisma.product.findMany({
    where: { status: "active", shippingProfileId: null },
    select: {
      id: true,
      slug: true,
      weightGrams: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
    },
    orderBy: { slug: "asc" },
  });

  if (semPerfil.length === 0) {
    console.log("\n  Todos os produtos ativos já têm perfil de frete.");
    return 0;
  }

  console.log(`\n  ${semPerfil.length} produto(s) ativo(s) sem perfil de frete:`);

  let atribuidos = 0;

  for (const produto of semPerfil) {
    const cabe = cabeEmTransportadora(produto);

    if (cabe === null) {
      console.log(`    · ${produto.slug} — sem peso/medida cadastrados. Deixado sem perfil.`);
      continue;
    }

    const alvo = cabe ? transportadora : grandePorte;
    if (!alvo) {
      console.log(
        `    · ${produto.slug} — não há perfil ${cabe ? "de transportadora com tabela" : "sob orçamento"} cadastrado.`,
      );
      continue;
    }

    console.log(`    · ${produto.slug} → ${alvo.name}`);
    if (APLICAR) {
      await prisma.product.update({
        where: { id: produto.id },
        data: { shippingProfileId: alvo.id },
      });
    }
    atribuidos += 1;
  }

  return atribuidos;
}

async function main() {
  console.log(APLICAR ? "→ instalando tabela de frete" : "→ prévia (nada será alterado)");

  const perfis = await prisma.shippingProfile.findMany({
    where: { kind: { in: COBRAM_FRETE } },
    select: {
      id: true,
      name: true,
      kind: true,
      _count: { select: { zones: true } },
    },
    orderBy: { name: "asc" },
  });

  if (perfis.length === 0) {
    console.log(
      "\nNenhum perfil de frete que cobre transporte. Cadastre um em /admin/frete primeiro.",
    );
    return;
  }

  let criadas = 0;
  /** Quem termina esta execução com tabela — já tinha, ou acabou de ganhar. */
  let comTabela: { id: string; name: string } | null = null;

  for (const perfil of perfis) {
    if (perfil._count.zones > 0) {
      comTabela ??= { id: perfil.id, name: perfil.name };
      console.log(
        `  · ${perfil.name} (${perfil.kind}) — já tem ${perfil._count.zones} faixa(s). Intocado.`,
      );
      continue;
    }

    comTabela ??= { id: perfil.id, name: perfil.name };
    console.log(`\n  ${perfil.name} (${perfil.kind}) — sem faixa. Instalando ${FAIXAS.length}:`);
    for (const [indice, faixa] of FAIXAS.entries()) {
      const reais = (faixa.precoCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      console.log(
        `    ${faixa.inicio}–${faixa.fim}  ${reais}  ${faixa.prazoDias} dias  ${faixa.nome}`,
      );

      if (APLICAR) {
        await prisma.shippingZone.create({
          data: {
            profileId: perfil.id,
            name: faixa.nome,
            zipStart: faixa.inicio,
            zipEnd: faixa.fim,
            priceCents: faixa.precoCents,
            etaDays: faixa.prazoDias,
            order: indice,
          },
        });
      }
      criadas += 1;
    }
  }

  const atribuidos = await atribuirPerfis(comTabela);

  if (criadas === 0 && atribuidos === 0) {
    console.log("\nTabela e perfis já estão completos. Nada a fazer.");
  } else if (!APLICAR) {
    console.log(
      `\n${criadas} faixa(s) e ${atribuidos} atribuição(ões) de perfil seriam feitas. Rode com --aplicar (pnpm frete:aplicar).`,
    );
  } else {
    console.log(
      `\nPronto: ${criadas} faixa(s) criadas e ${atribuidos} produto(s) com perfil. Revise em /admin/frete — o script não volta a mexer em perfil que já tem tabela nem em produto que já tem perfil.`,
    );
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
