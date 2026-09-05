import "server-only";

import type { ProvedorDeEmail } from "@/lib/email/tipos";

/**
 * Adapter SMTP — DECLARADO INDISPONÍVEL NESTA VERSÃO.
 *
 * POR QUE NÃO EXISTE IMPLEMENTAÇÃO AQUI
 *
 * SMTP não é HTTP: é um protocolo de socket, com STARTTLS, negociação de
 * autenticação (PLAIN/LOGIN/CRAM-MD5), codificação MIME e quoted-printable. O
 * runtime do Next não traz cliente SMTP nenhum, e `fetch` não fala TCP puro —
 * não há como escrever este adapter sem uma biblioteca (`nodemailer`).
 *
 * Instalar dependência está fora do escopo deste bloco (`package.json` é
 * somente leitura), então em vez de fingir um envio que não acontece, o módulo
 * é honesto: `SMTP_DISPONIVEL` é `false` e a fábrica de `@/lib/email` cai no
 * provedor de registro, avisando o motivo na tela da fila.
 *
 * PARA LIGAR SMTP DE VERDADE, DEPOIS
 *
 *   1. `pnpm add nodemailer` e `pnpm add -D @types/nodemailer`;
 *   2. implemente `ProvedorSmtp` neste arquivo, criando o transporte com
 *      `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_SEGURO`
 *      (as variáveis já estão documentadas em `.env.example`);
 *   3. troque o corpo de `criarProvedorSmtp()` para devolver a instância e
 *      passe `SMTP_DISPONIVEL` para `true`.
 *
 * Nada mais muda: a interface `ProvedorDeEmail` e o processador da fila já
 * estão prontos para receber outro adapter.
 */

export const SMTP_DISPONIVEL = false;

export const MOTIVO_SMTP_INDISPONIVEL =
  "O adapter SMTP exige a biblioteca nodemailer, que não está instalada neste projeto.";

/** Há configuração de SMTP no ambiente? Serve para explicar melhor a escolha. */
export function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim());
}

/**
 * Devolve o provedor SMTP quando ele existir. Hoje é sempre `null` — e é
 * `null`, não um provedor que falha em toda mensagem, para que a fila não se
 * encha de erros repetidos: quem decide o que fazer sem SMTP é a fábrica.
 */
export function criarProvedorSmtp(): ProvedorDeEmail | null {
  return null;
}
