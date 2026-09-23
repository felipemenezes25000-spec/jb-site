import { spawn } from "node:child_process";

/* ============================================================================
   Validação final — uma rodada, banco efêmero, um servidor

   Este script existe para o fechamento de uma leva grande. Ele NÃO é chamado
   automaticamente por commit nem por postinstall.

   Segurança é parte do desenho: o script ignora qualquer DATABASE_URL que a
   máquina já tenha e cria um PostgreSQL descartável em Docker, em porta
   própria. Migrações e seeds rodam SOMENTE nesse banco local. Ao terminar —
   com sucesso ou falha — servidor e container são encerrados.

   Ordem:
     1. arquitetura
     2. lint
     3. TypeScript
     4. unitários
     5. PostgreSQL efêmero
     6. migrações + seeds de demonstração
     7. Chromium do Playwright
     8. build de produção
     9. sobe exatamente esse build numa porta isolada
    10. E2E atual da assistência
    11. acessibilidade mobile + desktop
    12. responsividade 320..1920

   E2E, a11y e responsividade reutilizam o mesmo `next start`. Qualquer falha
   encerra a sequência com código diferente de zero.
   ============================================================================ */

const PORTA = Number(process.env.VALIDACAO_PORTA ?? 3210);
const PORTA_DB = Number(process.env.VALIDACAO_DB_PORTA ?? 55432);
const BASE_URL = `http://127.0.0.1:${PORTA}`;
const SITE_URL = `http://localhost:${PORTA}`;
const CONTAINER_DB = `jb-validacao-${process.pid}`;
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (!Number.isInteger(PORTA) || PORTA < 1024 || PORTA > 65535) {
  throw new Error(`VALIDACAO_PORTA inválida: ${PORTA}`);
}
if (!Number.isInteger(PORTA_DB) || PORTA_DB < 1024 || PORTA_DB > 65535) {
  throw new Error(`VALIDACAO_DB_PORTA inválida: ${PORTA_DB}`);
}
if (PORTA === PORTA_DB) {
  throw new Error("VALIDACAO_PORTA e VALIDACAO_DB_PORTA precisam ser diferentes.");
}

const DATABASE_URL = `postgresql://jb:jb@127.0.0.1:${PORTA_DB}/jb`;

/**
 * Ambiente deliberadamente local. Os valores críticos sobrescrevem qualquer
 * credencial herdada do shell antes de um subprocesso nascer.
 */
const AMBIENTE_SEGURO = {
  DATABASE_URL,
  DATABASE_URL_UNPOOLED: DATABASE_URL,
  AUTH_SECRET: "validacao-local-secret-nao-usar-em-producao-000000000000",
  NEXT_PUBLIC_SITE_URL: SITE_URL,
  CRON_SECRET: "validacao-local-cron-secret",
  ADMIN_EMAIL: "validacao@jbteste.local",
  ADMIN_PASSWORD: "ValidacaoLocal12345!",
  PERMITIR_DEMO: "1",
  PAYMENT_PROVIDER: "mock",
  VERCEL_ENV: "development",
};

function iniciar(comando, argumentos, { ambiente = {}, stdio = "inherit" } = {}) {
  return spawn(comando, argumentos, {
    stdio,
    env: { ...process.env, ...AMBIENTE_SEGURO, ...ambiente },
    windowsHide: true,
  });
}

function executarComando(comando, argumentos, opcoes = {}) {
  return new Promise((resolve, reject) => {
    const processo = iniciar(comando, argumentos, opcoes);
    processo.once("error", reject);
    processo.once("exit", (codigo, sinal) => {
      if (codigo === 0) resolve();
      else reject(
        new Error(
          `${comando} ${argumentos.join(" ")} falhou (${codigo ?? sinal ?? "sem código"})`,
        ),
      );
    });
  });
}

function executarPnpm(argumentos, ambiente = {}) {
  return executarComando(PNPM, argumentos, { ambiente });
}

function comandoPassa(comando, argumentos, ambiente = {}) {
  return new Promise((resolve) => {
    const processo = iniciar(comando, argumentos, { ambiente, stdio: "ignore" });
    processo.once("error", () => resolve(false));
    processo.once("exit", (codigo) => resolve(codigo === 0));
  });
}

async function subirPostgres() {
  const dockerExiste = await comandoPassa("docker", ["version"]);
  if (!dockerExiste) {
    throw new Error(
      "Docker não está disponível. A validação final usa PostgreSQL efêmero para nunca tocar no banco real.",
    );
  }

  await executarComando("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    CONTAINER_DB,
    "-e",
    "POSTGRES_USER=jb",
    "-e",
    "POSTGRES_PASSWORD=jb",
    "-e",
    "POSTGRES_DB=jb",
    "-p",
    `${PORTA_DB}:5432`,
    "postgres:17-alpine",
  ]);

  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    if (await comandoPassa("docker", ["exec", CONTAINER_DB, "pg_isready", "-U", "jb"])) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("PostgreSQL efêmero não ficou pronto dentro do limite esperado.");
}

async function removerPostgres() {
  await comandoPassa("docker", ["rm", "-f", CONTAINER_DB]);
}

function iniciarServidor() {
  return iniciar(
    PNPM,
    ["exec", "next", "start", "-p", String(PORTA), "-H", "127.0.0.1"],
    { ambiente: { PORT: String(PORTA) } },
  );
}

async function aguardarServidor(processo) {
  for (let tentativa = 0; tentativa < 120; tentativa += 1) {
    if (processo.exitCode !== null) {
      throw new Error(`next start encerrou antes de ficar disponível (código ${processo.exitCode})`);
    }

    try {
      const resposta = await fetch(BASE_URL, { redirect: "manual" });
      if (resposta.status > 0) return;
    } catch {
      // Ainda iniciando.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Servidor de validação não respondeu em ${BASE_URL}`);
}

async function encerrarServidor(processo) {
  if (!processo || processo.exitCode !== null) return;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const matar = spawn("taskkill", ["/pid", String(processo.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
      matar.once("exit", resolve);
      matar.once("error", resolve);
    });
    return;
  }

  processo.kill("SIGTERM");
  await new Promise((resolve) => {
    const limite = setTimeout(() => {
      if (processo.exitCode === null) processo.kill("SIGKILL");
      resolve();
    }, 3000);
    processo.once("exit", () => {
      clearTimeout(limite);
      resolve();
    });
  });
}

let servidor;
let postgresSubiu = false;
let limpando = false;

async function limpar() {
  if (limpando) return;
  limpando = true;
  try {
    await encerrarServidor(servidor);
  } finally {
    if (postgresSubiu) await removerPostgres();
  }
}

for (const [sinal, codigo] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  process.once(sinal, () => {
    limpar().finally(() => process.exit(codigo));
  });
}

console.log("\nJB · validação final isolada\n");
console.log(`Aplicação: ${BASE_URL}`);
console.log(`Banco efêmero: 127.0.0.1:${PORTA_DB} (${CONTAINER_DB})\n`);

try {
  /* Falhas rápidas primeiro: ainda sem Docker/Postgres. */
  await executarPnpm(["arquitetura:verificar"]);
  await executarPnpm(["lint"]);
  await executarPnpm(["typecheck"]);
  await executarPnpm(["test:unit"]);

  /* A partir daqui tudo que toca banco recebe exclusivamente a URL local. */
  await subirPostgres();
  postgresSubiu = true;

  await executarPnpm(["db:deploy"]);
  await executarPnpm(["db:seed"]);
  await executarPnpm(["db:demo"]);
  await executarPnpm(["db:demo:operacao"]);

  /* Garante o binário do navegador sem instalar dependência de sistema nem
     pedir privilégio administrativo. Em Linux, libs do Chromium continuam
     sendo pré-requisito da máquina/CI. */
  await executarPnpm(["exec", "playwright", "install", "chromium"]);

  await executarPnpm(["build"]);

  servidor = iniciarServidor();
  await aguardarServidor(servidor);

  const ambienteNavegador = {
    BASE_URL,
    E2E_BASE_URL: BASE_URL,
  };

  await executarPnpm(["exec", "playwright", "test"], ambienteNavegador);
  await executarPnpm(["a11y"], ambienteNavegador);
  await executarPnpm(["responsivo"], ambienteNavegador);

  console.log("\nJB · validação final concluída sem falhas.\n");
} finally {
  await limpar();
}
