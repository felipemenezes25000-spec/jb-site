export type ContextoAmbiente =
  | "build"
  | "database"
  | "db-deploy"
  | "db-destructive"
  | "seed-demo";

export type Ambiente = Record<string, string | undefined>;

/**
 * Confirmação deliberadamente longa: operação destrutiva em produção não deve
 * acontecer porque alguém deixou `NODE_ENV=production` no terminal sem notar.
 */
export const CONFIRMACAO_OPERACAO_PRODUCAO = "JB-PRODUCAO-CONFIRMADA";

function valor(env: Ambiente, chave: string) {
  return env[chave]?.trim();
}

function provedorSimulado(env: Ambiente) {
  const provider = valor(env, "PAYMENT_PROVIDER")?.toLowerCase();
  return provider === "mock" || provider === "simulado" || provider === "fake";
}

/**
 * Regras de ambiente que precisam valer igual no runtime, nos scripts e no CI.
 * A função é pura de propósito para poder ser testada sem tocar em process.env.
 */
export function problemasDoAmbiente(env: Ambiente, contexto: ContextoAmbiente): string[] {
  const problemas: string[] = [];
  const vercel = valor(env, "VERCEL_ENV")?.toLowerCase();
  const node = valor(env, "NODE_ENV")?.toLowerCase();
  const databaseUrl = valor(env, "DATABASE_URL");
  const previewUrl = valor(env, "JBPREV_DATABASE_URL");

  if (vercel === "production" && previewUrl) {
    problemas.push(
      "JBPREV_DATABASE_URL está definido em produção. Remova a variável em vez de deixá-la ser silenciosamente ignorada.",
    );
  }

  if (vercel === "preview" && !previewUrl) {
    problemas.push(
      "Deploy de preview sem JBPREV_DATABASE_URL. Isso pode fazer a branch usar o banco configurado em DATABASE_URL.",
    );
  }

  if (vercel === "production" && provedorSimulado(env)) {
    problemas.push("PAYMENT_PROVIDER simulado não é permitido em produção.");
  }

  // Vitest importa módulos que dependem de Prisma mesmo em testes puramente
  // unitários. Exigir DATABASE_URL nesse caso transforma um import em acesso a
  // infraestrutura sem melhorar a segurança. Scripts de banco continuam
  // exigindo URL mesmo em NODE_ENV=test, porque neles a conexão é o trabalho.
  const testeUnitarioSemBanco = node === "test" && contexto === "database";
  const exigeBanco = contexto !== "build" && !testeUnitarioSemBanco;
  const urlEfetiva = previewUrl && vercel !== "production" ? previewUrl : databaseUrl;
  if (exigeBanco && !urlEfetiva) {
    problemas.push("Nenhuma URL de banco efetiva foi configurada para esta operação.");
  }

  const destrutivo = contexto === "db-destructive" || contexto === "seed-demo";
  const pareceProducao = vercel === "production" || (!vercel && node === "production");
  if (
    destrutivo &&
    pareceProducao &&
    valor(env, "PERMITIR_OPERACAO_PRODUCAO") !== CONFIRMACAO_OPERACAO_PRODUCAO
  ) {
    problemas.push(
      `Operação destrutiva bloqueada em produção. Só prossiga conscientemente com PERMITIR_OPERACAO_PRODUCAO=${CONFIRMACAO_OPERACAO_PRODUCAO}.`,
    );
  }

  return problemas;
}

export function exigirAmbienteSeguro(env: Ambiente, contexto: ContextoAmbiente): void {
  const problemas = problemasDoAmbiente(env, contexto);
  if (problemas.length === 0) return;

  throw new Error(
    [
      `Ambiente inseguro para ${contexto}:`,
      ...problemas.map((problema, indice) => `${indice + 1}. ${problema}`),
    ].join("\n"),
  );
}
