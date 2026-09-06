/* ============================================================================
   Migração do conteúdo institucional legado

   Substitui, no banco, o texto herdado do site em PHP pelo conteúdo de
   `scripts/conteudo-institucional.ts`. Alterar só o JSX não mudaria nada para
   quem visita o site: as páginas /sobre e /estrutura renderizam `Page.body`
   quando ele tem texto.

   Uso:

     pnpm conteudo:prever     # não escreve nada — diz o que faria
     pnpm conteudo:migrar     # aplica

   A prévia é o modo padrão de propósito. Para escrever é preciso passar
   `--aplicar` explicitamente.

   Três garantias, e é por elas que este script existe em vez de um UPDATE:

     1. Idempotente. Rodar duas vezes não gera segunda revisão nem novo
        `updatedAt`.
     2. Reversível. O corpo anterior vai inteiro para `PageRevision` antes de
        qualquer escrita — o painel mostra e restaura.
     3. Respeita edição humana. Página alterada no painel depois da última
        migração é reportada e deixada em paz.

   A regra das três está em `src/lib/conteudo/migracao.ts`, testada em
   `tests/unitarios/migracao-conteudo.test.ts`.
   ============================================================================ */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { decidirCategoria, decidirMigracao, hashDeCorpo } from "../src/lib/conteudo/migracao";
import { CONTEUDO_CATEGORIAS } from "./conteudo-categorias";
import { CONTEUDO_INSTITUCIONAL } from "./conteudo-institucional";

const NOME_DA_MIGRACAO = "institucional-2026-09";

const prisma = new PrismaClient();

const aplicar = process.argv.includes("--aplicar");

function alvoDoBanco(url: string | undefined) {
  if (!url) return "(DATABASE_URL ausente)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL ilegível)";
  }
}

/**
 * Descrições de categoria.
 *
 * A regra vive em `decidirCategoria`, no módulo puro, pelo mesmo motivo que a
 * das páginas: decisão escrita no meio de um laço com `await` não é testada, e
 * foi exatamente ali que passou despercebido por semanas que descrição vazia
 * era classificada como edição humana — a migração se recusava a preencher
 * categoria que ninguém tinha tocado, alegando que alguém a tinha tocado.
 *
 * A cópia de segurança vai para um arquivo, não para `PageRevision`: aquela
 * tabela é de páginas e tem chave estrangeira para `Page`. Descrição de
 * categoria é texto público curto; um JSON datado ao lado da documentação
 * cobre o que precisa cobrir, sem inventar tabela para seis linhas.
 */
async function migrarCategorias() {
  console.log("  Categorias");
  console.log("  ----------");

  const backup: Record<string, { name: string; description: string }> = {};
  let escritas = 0;
  let bloqueadas = 0;

  for (const alvo of CONTEUDO_CATEGORIAS) {
    const atual = await prisma.category.findUnique({
      where: { slug: alvo.slug },
      select: { slug: true, name: true, description: true },
    });

    if (!atual) {
      console.log(`  ? /categoria/${alvo.slug} — não existe no banco, ignorada.`);
      continue;
    }

    const decisao = decidirCategoria(atual.description, alvo);

    if (!decisao.escreve) {
      const marca = decisao.acao === "em-dia" ? "·" : "!";
      console.log(`  ${marca} /categoria/${alvo.slug} — ${decisao.motivo}`);
      if (decisao.acao === "editada-por-humano") bloqueadas++;
      continue;
    }

    if (decisao.guardaCopia) {
      backup[alvo.slug] = { name: atual.name, description: atual.description };
    }

    if (!aplicar) {
      console.log(`  → /categoria/${alvo.slug} — ${decisao.motivo}`);
      escritas++;
      continue;
    }

    await prisma.category.update({
      where: { slug: alvo.slug },
      data: {
        description: alvo.description,
        ...(alvo.name ? { name: alvo.name } : {}),
      },
    });
    escritas++;
    console.log(`  → /categoria/${alvo.slug} — corrigida.`);
  }

  if (aplicar && Object.keys(backup).length > 0) {
    const pasta = join(process.cwd(), "docs", "evolucao-jb", "backups");
    mkdirSync(pasta, { recursive: true });
    const nome = `categorias-antes-de-${NOME_DA_MIGRACAO}.json`;
    writeFileSync(join(pasta, nome), `${JSON.stringify(backup, null, 2)}
`, "utf8");
    console.log(`  Cópia do texto anterior: docs/evolucao-jb/backups/${nome}`);
  }

  console.log("");
  return { escritas, bloqueadas };
}

async function principal() {
  console.log("");
  console.log("  Migração de conteúdo institucional");
  console.log(`  Banco: ${alvoDoBanco(process.env.DATABASE_URL)}`);
  console.log(`  Modo:  ${aplicar ? "APLICAR (escreve no banco)" : "prévia (não escreve nada)"}`);
  console.log("");

  let escritas = 0;
  let bloqueadas = 0;

  for (const alvo of CONTEUDO_INSTITUCIONAL) {
    const atual = await prisma.page.findUnique({
      where: { slug: alvo.slug },
      select: { slug: true, body: true, systemHash: true, title: true, editable: true, coverId: true },
    });

    const decisao = decidirMigracao(
      atual ? { slug: atual.slug, body: atual.body, systemHash: atual.systemHash } : null,
      alvo.body,
      alvo.slug,
    );

    const marca =
      decisao.acao === "editada-por-humano" ? "!" : decisao.escreve ? "→" : "·";
    console.log(`  ${marca} /${alvo.slug}  [${decisao.acao}]`);
    console.log(`      ${decisao.motivo}`);

    if (decisao.acao === "editada-por-humano") {
      bloqueadas++;
      console.log(
        "      Para aplicar mesmo assim, edite a página no painel ou apague o corpo atual.",
      );
      console.log("");
      continue;
    }

    /* A capa é avaliada à parte do corpo, e de propósito.
       Corpo e imagem mudam por motivos diferentes: uma página pode estar com o
       texto em dia e continuar exibindo uma foto que afirma o que não é. Se
       isto ficasse dentro da decisão do corpo, a remoção nunca aconteceria
       depois de a primeira migração rodar. */
    if (alvo.capa === "remover" && atual?.coverId) {
      if (aplicar) {
        await prisma.page.update({
          where: { slug: alvo.slug },
          data: { coverId: null },
        });
        console.log(`      Capa removida (a mídia ${atual.coverId} continua na biblioteca).`);
      } else {
        console.log(`      (prévia) a capa ${atual.coverId} seria removida da página.`);
      }
    }

    if (!decisao.escreve) {
      console.log("");
      continue;
    }

    if (decisao.guardaCopia && atual) {
      console.log(
        `      Cópia de segurança: ${atual.body.length} caracteres irão para PageRevision.`,
      );
    }

    if (!aplicar) {
      console.log(`      (prévia) o corpo novo tem ${alvo.body.length} caracteres.`);
      console.log("");
      escritas++;
      continue;
    }

    /* Cópia e escrita na mesma transação: uma revisão gravada sem a escrita
       correspondente polui o histórico, e uma escrita sem revisão perde o
       conteúdo anterior. As duas juntas, ou nenhuma. */
    await prisma.$transaction(async (tx) => {
      if (decisao.guardaCopia && atual) {
        const completa = await tx.page.findUnique({ where: { slug: alvo.slug } });
        if (completa) {
          await tx.pageRevision.create({
            data: {
              pageSlug: completa.slug,
              title: completa.title,
              eyebrow: completa.eyebrow,
              lead: completa.lead,
              body: completa.body,
              seoTitle: completa.seoTitle,
              seoDescription: completa.seoDescription,
              bodyHash: hashDeCorpo(completa.body),
              origin: `migracao:${NOME_DA_MIGRACAO}`,
              note: "Conteúdo anterior, guardado antes da migração institucional.",
            },
          });
        }
      }

      const campos = {
        title: alvo.title,
        eyebrow: alvo.eyebrow,
        lead: alvo.lead,
        body: alvo.body,
        seoTitle: alvo.seoTitle,
        seoDescription: alvo.seoDescription,
        systemHash: decisao.hashAlvo,
      };

      await tx.page.upsert({
        where: { slug: alvo.slug },
        create: { slug: alvo.slug, ...campos },
        update: campos,
      });
    });

    escritas++;
    console.log("      Gravado.");
    console.log("");
  }

  console.log("  ------------------------------------------------------------");
  console.log(
    aplicar
      ? `  ${escritas} página(s) gravada(s), ${bloqueadas} bloqueada(s) por edição humana.`
      : `  ${escritas} página(s) seriam gravadas, ${bloqueadas} bloqueada(s) por edição humana.`,
  );
  console.log("");

  const cat = await migrarCategorias();
  console.log("  ------------------------------------------------------------");
  console.log(
    aplicar
      ? `  ${cat.escritas} categoria(s) corrigida(s), ${cat.bloqueadas} ignorada(s) por edição humana.`
      : `  ${cat.escritas} categoria(s) seriam corrigidas, ${cat.bloqueadas} ignorada(s).`,
  );
  if (!aplicar && escritas + cat.escritas > 0) {
    console.log("  Para aplicar: pnpm conteudo:migrar");
  }
  console.log("");
}

principal()
  .catch((erro) => {
    console.error("Falha na migração de conteúdo:", erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
