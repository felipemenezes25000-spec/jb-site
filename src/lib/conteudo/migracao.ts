import { createHash } from "node:crypto";

/* ============================================================================
   Migração de conteúdo do CMS — a decisão, separada do banco

   Reescrever texto institucional pelo código é uma operação perigosa por um
   motivo só: alguém da JB pode ter editado aquela página no painel ontem. Uma
   migração que sobrescreve sem olhar apaga trabalho humano sem deixar rastro,
   e o autor descobre semanas depois.

   A regra desta camada é, então, conservadora por padrão:

     • se o corpo atual já é o corpo alvo, não faz nada (idempotência);
     • se a página nunca passou por migração, o conteúdo é o legado importado
       do site em PHP — pode ser substituído, com cópia guardada antes;
     • se a página já passou por migração E o corpo mudou desde então, alguém
       editou. Não sobrescreve. Reporta.

   O que sustenta a terceira regra é `Page.systemHash`: o SHA-256 do corpo na
   última vez que uma migração escreveu ali. Divergência entre ele e o hash do
   corpo atual é a assinatura de uma edição humana — não precisa de flag, de
   data ou de confiança no `updatedAt`, que muda por qualquer motivo.

   Este módulo é puro de propósito: nada de Prisma, nada de `server-only`.
   Assim a decisão é testável sem banco, que é onde os erros dela doem.
   ============================================================================ */

/**
 * Marca que o painel grava em `Page.systemHash` quando uma pessoa salva ou
 * restaura a página.
 *
 * Não é um hash e nunca vai ser igual a um: é justamente por isso que funciona.
 * Sem ela, uma página escrita à mão que nunca passou por migração ficaria com
 * `systemHash` nulo e seria tratada como conteúdo legado na próxima execução —
 * o único caminho pelo qual o script apagaria trabalho humano.
 */
export const MARCA_MANUAL = "manual";

/** SHA-256 do corpo, normalizado só no que não é significativo. */
export function hashDeCorpo(corpo: string): string {
  // \r\n vs \n é diferença de editor, não de conteúdo: sem normalizar, a
  // mesma página salva no Windows e no Linux pareceria editada.
  const normalizado = (corpo ?? "").replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}

/** O estado da página no banco, reduzido ao que a decisão precisa. */
export type PaginaAtual = {
  slug: string;
  body: string;
  /** `null` em página que nunca passou por migração de conteúdo. */
  systemHash: string | null;
};

export type Acao =
  /** Página inexistente no banco: a migração cria. */
  | "criar"
  /** Corpo vazio ou legado, sem migração anterior: substitui, guardando cópia. */
  | "substituir-legado"
  /** Já passou por migração e ninguém tocou desde então: atualiza. */
  | "atualizar"
  /** O corpo atual já é o alvo: nada a fazer. */
  | "em-dia"
  /** Alguém editou no painel depois da última migração: não mexe. */
  | "editada-por-humano";

export type Decisao = {
  slug: string;
  acao: Acao;
  /** Verdadeiro quando a migração vai escrever no banco. */
  escreve: boolean;
  /** Verdadeiro quando há conteúdo anterior que precisa ir para `PageRevision`. */
  guardaCopia: boolean;
  /** Hash que ficará em `Page.systemHash` depois da escrita. */
  hashAlvo: string;
  motivo: string;
};

/**
 * O que fazer com uma página, dado o estado atual e o conteúdo alvo.
 *
 * Não escreve nada e não conhece o banco — devolve a decisão para quem
 * executa. É essa separação que permite ao script ter modo de prévia sem
 * duplicar a regra.
 */
export function decidirMigracao(
  atual: PaginaAtual | null,
  corpoAlvo: string,
  slug: string,
): Decisao {
  const hashAlvo = hashDeCorpo(corpoAlvo);

  if (!atual) {
    return {
      slug,
      acao: "criar",
      escreve: true,
      guardaCopia: false,
      hashAlvo,
      motivo: "A página não existe no banco e será criada.",
    };
  }

  const hashAtual = hashDeCorpo(atual.body);

  if (hashAtual === hashAlvo) {
    return {
      slug,
      acao: "em-dia",
      escreve: false,
      guardaCopia: false,
      hashAlvo,
      motivo: "O conteúdo publicado já é o desta migração.",
    };
  }

  if (atual.systemHash === MARCA_MANUAL) {
    return {
      slug,
      acao: "editada-por-humano",
      escreve: false,
      guardaCopia: false,
      hashAlvo,
      motivo:
        "Esta página foi salva ou restaurada pelo painel. O conteúdo dela é decisão da equipe, " +
        "não da migração.",
    };
  }

  if (atual.systemHash === null) {
    const temConteudo = atual.body.trim().length > 0;
    return {
      slug,
      acao: "substituir-legado",
      escreve: true,
      guardaCopia: temConteudo,
      hashAlvo,
      motivo: temConteudo
        ? "Conteúdo herdado do site anterior. Será substituído, com cópia guardada em PageRevision."
        : "A página está vazia e receberá o conteúdo novo.",
    };
  }

  if (atual.systemHash !== hashAtual) {
    return {
      slug,
      acao: "editada-por-humano",
      escreve: false,
      guardaCopia: false,
      hashAlvo,
      motivo:
        "O corpo mudou depois da última migração: alguém editou esta página no painel. " +
        "A migração não sobrescreve edição humana.",
    };
  }

  return {
    slug,
    acao: "atualizar",
    escreve: true,
    guardaCopia: true,
    hashAlvo,
    motivo: "A página está como a migração anterior a deixou e será atualizada.",
  };
}
