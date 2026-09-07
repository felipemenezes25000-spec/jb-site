import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import {
  ARQUIVO_FIXTURES,
  SENHA_STAFF_E2E,
  SENHA_STAFF_TROCA_E2E,
  type Fixtures,
} from "./fixtures";

/**
 * Preparo único da suíte de ponta a ponta.
 *
 * Roda uma vez, antes de qualquer teste, e resolve o que a suíte não consegue
 * descobrir sozinha pelo navegador:
 *
 *  1. **Um produto comprável de verdade.** Prefere o que já está semeado — a
 *     suíte deve exercitar o catálogo real. Só cria um se o banco não tiver
 *     nenhum produto ativo, com preço, com estoque e sem ser peça única (uma
 *     unidade só acabaria no primeiro teste que comprasse).
 *
 *  2. **Um usuário da equipe com senha conhecida.** O `pnpm db:seed` gera senha
 *     aleatória de propósito, então não há como o teste adivinhá-la. Este
 *     usuário é dedicado, marcado no nome, e a senha nunca sai daqui.
 *
 *  3. **Uma segunda conta de equipe, só para a troca de senha.** O teste de
 *     `/admin/conta` altera a senha de quem está logado; feito na conta
 *     principal, ele derrubaria todo o resto da suíte. A senha desta conta é
 *     reescrita a cada execução, então ela volta ao estado conhecido mesmo se
 *     um teste morrer no meio.
 *
 *  4. **Um produto com tabela de frete própria.** O cálculo do frete precisa
 *     de faixa de CEP cadastrada, e a faixa precisa ser conhecida pelo teste.
 *     O produto ganha um `ShippingProfile` só dele — assim o resultado não
 *     depende do perfil padrão que a JB por acaso tenha cadastrado.
 *
 * O que for descoberto vai para um JSON que os testes leem — assim o dado
 * atravessa a fronteira entre este processo e os workers do Playwright sem
 * depender de variável de ambiente herdada.
 */

/** O `.env` do projeto não é carregado fora do Next. */
function carregarEnv() {
  if (process.env.DATABASE_URL) return;
  for (const arquivo of [".env.local", ".env"]) {
    const caminho = path.join(process.cwd(), arquivo);
    if (!fs.existsSync(caminho)) continue;
    try {
      process.loadEnvFile(caminho);
    } catch {
      // arquivo ilegível não pode derrubar a suíte antes da mensagem útil
    }
    if (process.env.DATABASE_URL) return;
  }
}

const SLUG_RESERVA = "e2e-equipamento-de-teste";
const EMAIL_STAFF = "e2e.equipe@jbteste.local";
const EMAIL_STAFF_TROCA = "e2e.senha@jbteste.local";

/* ------------------------------------------------------------------ frete */

const SLUG_FRETE = "e2e-equipamento-com-frete";
const NOME_PERFIL_FRETE = "E2E · entrega com faixa";
const PRECO_FRETE_CENTS = 123_400;

/**
 * A faixa cobre a capital paulista, onde mora o CEP conhecido do teste. O CEP
 * de fora é de outro estado, longe do intervalo — assim uma faixa cadastrada
 * na borda por outra pessoa não muda o resultado.
 */
const FAIXA = {
  nome: "Capital SP (teste automatizado)",
  cepInicio: "01000000",
  cepFim: "01999999",
  valorCents: 8_990,
  prazoDias: 5,
} as const;

const CEP_COM_FAIXA = "01310-100";
const CEP_SEM_FAIXA = "90010-000";

/* ------------------------------------------------------- trava do banco */

/**
 * Máquinas onde a suíte pode escrever à vontade.
 *
 * O `docker-compose.yml` deste repositório sobe o Postgres em
 * `localhost:5433`, e é contra ele que a suíte foi escrita. Qualquer outro
 * endereço é banco de outra pessoa até prova em contrário.
 */
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "db"]);

/** Escotilha para quem realmente quer rodar contra um banco remoto. */
const VARIAVEL_ESCAPE = "E2E_PERMITIR_BANCO_REMOTO";

/**
 * Recusa rodar contra banco que não seja local.
 *
 * Esta suíte não é leitora: ela cria marca, produto, perfil de frete e dois
 * usuários de equipe com senha conhecida — e os testes que vêm depois emitem
 * pedido, pagamento e chamado de verdade. Feito contra o banco errado, o
 * estrago não aparece como teste vermelho: aparece como catálogo com
 * "Equipamento de teste com frete" publicado e uma conta admin cuja senha
 * está versionada neste diretório.
 *
 * O perigo concreto tem nome e está documentado em `docs/operacao.md`:
 * `vercel env pull .env.local` escreve as variáveis de PRODUÇÃO num arquivo
 * que o `carregarEnv()` logo acima lê ANTES do `.env`. A mesma página avisa
 * que isso já aconteceu neste projeto — mas a lista de comandos perigosos
 * dela cita `pnpm dev`, `db:seed`, `db:demo` e `db:reset`, e não cita
 * `pnpm e2e`, que é o que escreve mais.
 *
 * A escotilha existe porque um banco de staging descartável é caso legítimo.
 * Ela é explícita de propósito: quem digita a variável sabe o que vai
 * acontecer, e um `.env.local` esquecido nunca a define sozinho.
 */
export function exigirBancoLocal(url: string) {
  if (process.env[VARIAVEL_ESCAPE] === "1") return;

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`DATABASE_URL não é uma URL válida. Confira o .env.`);
  }

  if (HOSTS_LOCAIS.has(host)) return;

  throw new Error(
    [
      `A suíte de ponta a ponta se recusou a rodar contra "${host}".`,
      "",
      "Ela SEMEIA E ESCREVE no banco: cria marca e produto de teste, um usuário",
      "admin com senha conhecida, e emite pedidos reais. Isso só pode acontecer",
      "num banco descartável.",
      "",
      "Rode contra o Postgres local do repositório:",
      "",
      "  docker compose up -d",
      '  DATABASE_URL="postgresql://jb:jb@localhost:5433/jb?schema=public" pnpm e2e',
      "",
      "Ou ponha essa URL num .env.local, que tem precedência sobre o .env.",
      "",
      `Se o banco remoto é mesmo descartável, use ${VARIAVEL_ESCAPE}=1.`,
    ].join("\n"),
  );
}

export default async function preparar() {
  carregarEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não encontrada. Suba o banco com `docker compose up -d` e confira o .env.",
    );
  }

  exigirBancoLocal(process.env.DATABASE_URL);

  const prisma = new PrismaClient();

  try {
    /* -------------------------------------------------------------- marca */

    // A marca dos produtos de teste é criada sempre: o produto de frete
    // depende dela, e o produto de reserva a reaproveita.
    const marca = await prisma.brand.upsert({
      where: { slug: "jb-testes" },
      update: {},
      create: { slug: "jb-testes", name: "JB Testes", published: true, order: 900 },
    });

    /* ------------------------------------------------------------ produto */

    let produto = await prisma.product.findFirst({
      where: {
        status: "active",
        allowDirectPurchase: true,
        priceCents: { gt: 0 },
        unique: false,
        // o produto do teste de frete tem perfil próprio e não representa o
        // catálogo: ele nunca deve virar o produto padrão da suíte
        slug: { not: SLUG_FRETE },
        OR: [{ trackInventory: false }, { stock: { gte: 5 } }],
      },
      orderBy: { priceCents: "asc" },
      select: { slug: true, name: true, priceCents: true },
    });

    if (!produto) {
      produto = await prisma.product.upsert({
        where: { slug: SLUG_RESERVA },
        update: { status: "active", stock: 99, priceCents: 250000 },
        create: {
          slug: SLUG_RESERVA,
          sku: "E2E-0001",
          name: "Equipamento de teste automatizado",
          shortDescription: "Item criado pela suíte de testes para exercitar a compra fim a fim.",
          status: "active",
          condition: "novo",
          publishedAt: new Date(),
          brandId: marca.id,
          priceCents: 250000,
          allowDirectPurchase: true,
          allowQuoteRequest: true,
          trackInventory: true,
          unique: false,
          stock: 99,
        },
        select: { slug: true, name: true, priceCents: true },
      });
    }

    // estoque é consumido a cada compra; a suíte precisa de folga para rodar
    // muitas vezes seguidas sem depender de quem semeou
    await prisma.product.updateMany({
      where: { slug: produto.slug, trackInventory: true, stock: { lt: 20 } },
      data: { stock: 99 },
    });

    /* --------------------------------------------- perfil e faixa de frete */

    /*
     * ShippingProfile não tem coluna única além do id, então a busca é pelo
     * nome — reservado a esta suíte. As faixas são apagadas e recriadas para
     * que uma execução interrompida não deixe faixa a mais no perfil.
     */
    const existente = await prisma.shippingProfile.findFirst({
      where: { name: NOME_PERFIL_FRETE },
      select: { id: true },
    });

    const perfil = existente
      ? await prisma.shippingProfile.update({
          where: { id: existente.id },
          data: {
            kind: "entrega_local",
            // sem mínimo de frete grátis: o teste precisa de um valor cobrado
            freeAboveCents: null,
            isDefault: false,
          },
          select: { id: true },
        })
      : await prisma.shippingProfile.create({
          data: {
            name: NOME_PERFIL_FRETE,
            kind: "entrega_local",
            description: "Perfil da suíte automatizada. Não usar em produto real.",
            freeAboveCents: null,
            isDefault: false,
          },
          select: { id: true },
        });

    await prisma.shippingZone.deleteMany({ where: { profileId: perfil.id } });
    await prisma.shippingZone.create({
      data: {
        profileId: perfil.id,
        name: FAIXA.nome,
        zipStart: FAIXA.cepInicio,
        zipEnd: FAIXA.cepFim,
        priceCents: FAIXA.valorCents,
        etaDays: FAIXA.prazoDias,
        order: 0,
      },
    });

    const produtoFrete = await prisma.product.upsert({
      where: { slug: SLUG_FRETE },
      update: {
        status: "active",
        publishedAt: new Date(),
        priceCents: PRECO_FRETE_CENTS,
        allowDirectPurchase: true,
        trackInventory: true,
        unique: false,
        stock: 99,
        shippingProfileId: perfil.id,
      },
      create: {
        slug: SLUG_FRETE,
        sku: "E2E-FRETE-1",
        name: "Equipamento de teste com frete",
        shortDescription:
          "Item criado pela suíte de testes para exercitar o cálculo de frete pelo CEP.",
        status: "active",
        condition: "novo",
        publishedAt: new Date(),
        brandId: marca.id,
        priceCents: PRECO_FRETE_CENTS,
        allowDirectPurchase: true,
        allowQuoteRequest: true,
        trackInventory: true,
        unique: false,
        stock: 99,
        shippingProfileId: perfil.id,
      },
      select: { slug: true, name: true, priceCents: true },
    });

    /* ---------------------------------------------------------- condições */

    const condicoes = await prisma.product.groupBy({
      by: ["condition"],
      where: { status: "active" },
      _count: { _all: true },
    });

    /* --------------------------------------------------- usuário da equipe */

    const senhaHash = await bcrypt.hash(SENHA_STAFF_E2E, 12);
    const staff = await prisma.user.upsert({
      where: { email: EMAIL_STAFF },
      update: { passwordHash: senhaHash, role: "admin", active: true },
      create: {
        name: "Equipe de testes E2E",
        email: EMAIL_STAFF,
        passwordHash: senhaHash,
        role: "admin",
        active: true,
      },
      select: { email: true },
    });

    // Conta descartável da troca de senha: o hash volta ao conhecido a cada
    // execução, então um teste que morreu no meio não deixa a conta perdida.
    const senhaTrocaHash = await bcrypt.hash(SENHA_STAFF_TROCA_E2E, 12);
    const staffTroca = await prisma.user.upsert({
      where: { email: EMAIL_STAFF_TROCA },
      update: { passwordHash: senhaTrocaHash, role: "gestor", active: true },
      create: {
        name: "Equipe de testes E2E — senha",
        email: EMAIL_STAFF_TROCA,
        passwordHash: senhaTrocaHash,
        role: "gestor",
        active: true,
      },
      select: { email: true },
    });

    /*
     * O freio de força bruta conta falhas dos últimos 15 minutos e não sabe
     * que a senha foi reescrita aqui. Sem esta limpeza, duas execuções
     * seguidas em que o teste errou a senha trancariam a conta de teste — e a
     * falha seguinte não diria nada sobre a aplicação.
     */
    await prisma.loginAttempt.deleteMany({
      where: {
        success: false,
        identifier: {
          in: [
            `staff:${EMAIL_STAFF}`,
            `staff:${EMAIL_STAFF_TROCA}`,
            `troca-senha:${EMAIL_STAFF_TROCA}`,
          ],
        },
      },
    });

    /*
     * Os leads que a suíte cria contam no freio do formulário de contato, que
     * é lastreado no banco (Lead por IP e por e-mail). Sem esta limpeza, a
     * terceira execução seguida esbarra no próprio rastro da segunda e o teste
     * falha por acúmulo, não por defeito. Só o que é da suíte sai daqui.
     */
    await prisma.lead.deleteMany({ where: { email: { endsWith: "@jbteste.local" } } });

    /*
     * As marcas e os produtos que a suíte cria ficavam no banco para sempre —
     * e marca aparece no filtro do catálogo e na página pública de marcas. Uma
     * semana de execuções e a loja mostraria dezenas de "Marca Teste" para
     * quem estivesse comprando. Some tudo pelo prefixo, que só a suíte usa.
     */
    await prisma.product.deleteMany({ where: { sku: { startsWith: "TESTE-" } } });
    await prisma.brand.deleteMany({ where: { name: { startsWith: "Marca Teste " } } });

    const fixtures: Fixtures = {
      produto: {
        slug: produto.slug,
        nome: produto.name,
        precoCents: produto.priceCents,
      },
      condicoes: condicoes
        .map((c) => c.condition)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
      staff: { email: staff.email, senha: SENHA_STAFF_E2E },
      staffSenha: { email: staffTroca.email, senha: SENHA_STAFF_TROCA_E2E },
      frete: {
        slug: produtoFrete.slug,
        nome: produtoFrete.name,
        precoCents: produtoFrete.priceCents,
        cepComFaixa: CEP_COM_FAIXA,
        cepSemFaixa: CEP_SEM_FAIXA,
        valorCents: FAIXA.valorCents,
        prazoDias: FAIXA.prazoDias,
        nomeDaFaixa: FAIXA.nome,
      },
    };

    fs.mkdirSync(path.dirname(ARQUIVO_FIXTURES), { recursive: true });
    fs.writeFileSync(ARQUIVO_FIXTURES, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");

    console.log(
      `[e2e] produto "${fixtures.produto.nome}" · ${fixtures.condicoes.length} condição(ões) · equipe ${fixtures.staff.email} · frete "${fixtures.frete.nome}"`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
