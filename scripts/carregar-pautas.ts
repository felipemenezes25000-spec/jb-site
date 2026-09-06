/* ============================================================================
   Carga das pautas iniciais da Central Técnica

   Uso:

     pnpm pautas:prever     # não escreve nada — diz o que faria
     pnpm pautas:carregar   # aplica

   A prévia é o padrão. Para escrever é preciso `--aplicar`, explicitamente.

   Três garantias, e é por elas que este script existe em vez de um INSERT:

     1. Idempotente. Rodar duas vezes não cria duplicata nem mexe no que já
        está lá.
     2. Não sobrescreve trabalho humano. Artigo que alguém editou no painel —
        detectado por ter autor, revisor ou corpo diferente do de origem —
        é reportado e deixado em paz.
     3. Nunca publica. Todo artigo entra como `rascunho`, sem autor, sem
        revisor e sem data. É o estado verdadeiro deles: ninguém assinou.

   A terceira garantia é a que importa. O escopo é explícito em que ausência
   de revisão não autoriza nome de revisor fictício nem botão "revisado"
   marcado pelo agente — e a única forma de cumprir isso é este script não ter
   como marcar.
   ============================================================================ */

import { createHash } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import { PAUTAS } from "./pautas-central-tecnica";

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

function hash(texto: string) {
  return createHash("sha256").update(texto.trim(), "utf8").digest("hex");
}

function alvoDoBanco(url: string | undefined) {
  if (!url) return "(DATABASE_URL ausente)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL ilegível)";
  }
}

type Decisao = "criar" | "em-dia" | "editado-por-humano";

async function main() {
  console.log(`Banco: ${alvoDoBanco(process.env.DATABASE_URL)}`);
  console.log(aplicar ? "Modo: APLICAR\n" : "Modo: prévia (nada será escrito)\n");

  const resumo: Record<Decisao, string[]> = {
    criar: [],
    "em-dia": [],
    "editado-por-humano": [],
  };

  for (const pauta of PAUTAS) {
    const atual = await prisma.article.findUnique({
      where: { slug: pauta.slug },
      select: { id: true, body: true, authorId: true, reviewerId: true, status: true },
    });

    if (!atual) {
      resumo.criar.push(pauta.slug);
      if (aplicar) {
        await prisma.article.create({
          data: {
            slug: pauta.slug,
            title: pauta.title,
            lead: pauta.lead,
            body: pauta.body.trim(),
            topic: pauta.topic,
            status: "rascunho",
            /* Sem autor, sem revisor, sem data. Não há aqui um caminho
               "para agilizar": o esquema aceita nulo e a publicação recusa. */
            authorId: null,
            reviewerId: null,
            pendingNote: pauta.pendente,
            /* Vazio de propósito: a página avisa que a aplicabilidade não foi
               declarada. Preencher isso é trabalho da bancada, com manual. */
            appliesTo: [],
          },
        });
      }
      continue;
    }

    /* Artigo que já tem assinatura ou corpo diferente do de origem passou por
       gente. Reescrever aqui apagaria trabalho de redação — e, pior, poderia
       tirar do ar um texto revisado. */
    const mexido =
      Boolean(atual.authorId) ||
      Boolean(atual.reviewerId) ||
      hash(atual.body) !== hash(pauta.body);

    resumo[mexido ? "editado-por-humano" : "em-dia"].push(pauta.slug);
  }

  console.log("A criar:");
  for (const slug of resumo.criar) console.log(`  + ${slug}`);
  if (resumo.criar.length === 0) console.log("  (nenhum)");

  console.log("\nJá em dia:");
  for (const slug of resumo["em-dia"]) console.log(`  = ${slug}`);
  if (resumo["em-dia"].length === 0) console.log("  (nenhum)");

  console.log("\nEditados por gente — deixados em paz:");
  for (const slug of resumo["editado-por-humano"]) console.log(`  ! ${slug}`);
  if (resumo["editado-por-humano"].length === 0) console.log("  (nenhum)");

  console.log(
    `\n${PAUTAS.length} pautas no total. Todas entram como rascunho, sem autor e sem revisor.`,
  );
  console.log(
    "Nenhuma vai ao ar até alguém da JB assinar e alguém diferente revisar — a publicação recusa o resto.",
  );

  if (!aplicar) {
    console.log("\nPrévia. Rode com --aplicar para escrever.");
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
