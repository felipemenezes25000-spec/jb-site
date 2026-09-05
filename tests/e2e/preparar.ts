import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { ARQUIVO_FIXTURES, SENHA_STAFF_E2E, type Fixtures } from "./fixtures";

/**
 * Preparo único da suíte de ponta a ponta.
 *
 * Roda uma vez, antes de qualquer teste, e resolve duas coisas que a suíte não
 * consegue descobrir sozinha pelo navegador:
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

export default async function preparar() {
  carregarEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não encontrada. Suba o banco com `docker compose up -d` e confira o .env.",
    );
  }

  const prisma = new PrismaClient();

  try {
    /* ------------------------------------------------------------ produto */

    let produto = await prisma.product.findFirst({
      where: {
        status: "active",
        allowDirectPurchase: true,
        priceCents: { gt: 0 },
        unique: false,
        OR: [{ trackInventory: false }, { stock: { gte: 5 } }],
      },
      orderBy: { priceCents: "asc" },
      select: { slug: true, name: true, priceCents: true },
    });

    if (!produto) {
      const marca = await prisma.brand.upsert({
        where: { slug: "jb-testes" },
        update: {},
        create: { slug: "jb-testes", name: "JB Testes", published: true, order: 900 },
      });

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

    /* ------------------------------------------------------- condições */

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
    };

    fs.mkdirSync(path.dirname(ARQUIVO_FIXTURES), { recursive: true });
    fs.writeFileSync(ARQUIVO_FIXTURES, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");

    console.log(
      `[e2e] produto "${fixtures.produto.nome}" · ${fixtures.condicoes.length} condição(ões) · equipe ${fixtures.staff.email}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
