import { spawn } from "node:child_process";
import net from "node:net";

/* ============================================================================
   Validação final — uma rodada, banco efêmero, um servidor

   Este script existe para o fechamento de uma leva grande. Ele NÃO é chamado
   automaticamente por commit nem por postinstall.

   Segurança é parte do desenho: o script ignora qualquer DATABASE_URL que a
   máquina já tenha e cria um PostgreSQL 17 descartável em Docker, em porta
   própria. Migrações e seeds rodam SOMENTE nesse banco local. Ao terminar —
   com sucesso, falha ou Ctrl+C — servidor e container são encerrados.

   Ordem:
     1. arquitetura
     2. lint
     3. TypeScript
     4. unitários
     5. PostgreSQL efêmero
     6. migrações + seeds base, demo e operação + destinos de medição fictícios
     7. Chromium do Playwright
     8. build de produção
     9. sobe exatamente esse build numa porta isolada
    10. E2E atual da assistência
    11. acessibilidade mobile + desktop
    12. responsividade 320..1920

   E2E, a11y e responsividade reutilizam o mesmo `next start`. Qualquer falha
   encerra a sequência com código diferente de zero e diz em qual etapa foi.

   Três armadilhas desta máquina que o script trata de frente:

   · Windows + Node 24 recusam `spawn("pnpm.cmd")` sem shell (EINVAL, a
     correção do CVE-2024-27980). Os comandos do pnpm passam pelo shell no
     Windows; nenhum argumento aqui tem espaço ou aspas.
   · A porta da aplicação pode estar ocupada por OUTRO projeto. Já aconteceu:
     a suíte rodou contra o site de outra clínica e reprovou 108 testes sem
     dizer por quê. Por isso a porta precisa estar livre antes, e a resposta
     precisa ser da JB depois.
   · `next build` prerenderiza com vários workers, cada um com o próprio pool
     do Prisma. Sem `connection_limit`, o Postgres do container estoura o
     `max_connections` e o Prisma acusa P1001 — "banco inacessível" — com o
     banco no ar o tempo todo.
   ============================================================================ */

const PORTA = Number(process.env.VALIDACAO_PORTA ?? 3456);
const PORTA_DB = Number(process.env.VALIDACAO_DB_PORTA ?? 55432);
const BASE_URL = `http://127.0.0.1:${PORTA}`;
const SITE_URL = `http://localhost:${PORTA}`;
const CONTAINER_DB = `jb-validacao-${process.pid}`;
const NO_WINDOWS = process.platform === "win32";

if (!Number.isInteger(PORTA) || PORTA < 1024 || PORTA > 65535) {
  throw new Error(`VALIDACAO_PORTA inválida: ${PORTA}`);
}
if (!Number.isInteger(PORTA_DB) || PORTA_DB < 1024 || PORTA_DB > 65535) {
  throw new Error(`VALIDACAO_DB_PORTA inválida: ${PORTA_DB}`);
}
if (PORTA === PORTA_DB) {
  throw new Error("VALIDACAO_PORTA e VALIDACAO_DB_PORTA precisam ser diferentes.");
}

/* `connection_limit=3`: ver o terceiro item do cabeçalho. Três conexões por
   processo sobram para o `next start` e para os seeds. `connect_timeout=30`:
   no pico do build, o encaminhamento de porta do Docker Desktop demora a
   aceitar conexão, e os 5s padrão do Prisma viravam P1001. */
const DATABASE_URL = `postgresql://jb:jb@127.0.0.1:${PORTA_DB}/jb?schema=public&connection_limit=3&pool_timeout=30&connect_timeout=30`;

/**
 * Ambiente deliberadamente local. Os valores críticos sobrescrevem qualquer
 * credencial herdada do shell antes de um subprocesso nascer — e, como o Next
 * e o Prisma não sobrescrevem variável que já existe no processo, também
 * vencem qualquer `.env` do repositório.
 */
const AMBIENTE_SEGURO = {
  DATABASE_URL,
  DATABASE_URL_UNPOOLED: DATABASE_URL,
  /* O banco de preview nunca participa da validação. Vazio, a regra de
     `seguranca-ambiente` não tem o que comparar nem para onde apontar. */
  JBPREV_DATABASE_URL: "",
  AUTH_SECRET: "validacao-local-secret-nao-usar-em-producao-000000000000",
  NEXT_PUBLIC_SITE_URL: SITE_URL,
  CRON_SECRET: "validacao-local-cron-secret",
  ADMIN_EMAIL: "validacao@jbteste.local",
  ADMIN_PASSWORD: "ValidacaoLocal12345!",
  PERMITIR_DEMO: "1",
  PAYMENT_PROVIDER: "mock",
  VERCEL_ENV: "development",
  NEXT_TELEMETRY_DISABLED: "1",
};

function iniciar(comando, argumentos, { ambiente = {}, stdio = "inherit", shell = false } = {}) {
  return spawn(comando, argumentos, {
    stdio,
    env: { ...process.env, ...AMBIENTE_SEGURO, ...ambiente },
    windowsHide: true,
    shell,
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

/** pnpm passa pelo shell no Windows: `pnpm.cmd` não pode ser iniciado direto. */
function executarPnpm(argumentos, ambiente = {}) {
  return executarComando("pnpm", argumentos, { ambiente, shell: NO_WINDOWS });
}

function comandoPassa(comando, argumentos, ambiente = {}) {
  return new Promise((resolve) => {
    const processo = iniciar(comando, argumentos, { ambiente, stdio: "ignore" });
    processo.once("error", () => resolve(false));
    processo.once("exit", (codigo) => resolve(codigo === 0));
  });
}

/** A porta aceita conexão agora? Porta ocupada por outro processo é abortar, não reusar. */
function portaOcupada(porta) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: porta });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function exigirPortaLivre(porta, nome) {
  if (await portaOcupada(porta)) {
    throw new Error(
      `A porta ${porta} (${nome}) já está em uso por outro processo. ` +
        "A validação não reaproveita servidor alheio: libere a porta ou escolha outra com " +
        (nome === "aplicação" ? "VALIDACAO_PORTA." : "VALIDACAO_DB_PORTA."),
    );
  }
}

let containerCriado = false;

async function subirPostgres() {
  if (!(await comandoPassa("docker", ["info"]))) {
    throw new Error(
      "Docker não está disponível (o daemon precisa estar rodando). A validação final usa " +
        "PostgreSQL efêmero para nunca tocar no banco real.",
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
    `127.0.0.1:${PORTA_DB}:5432`,
    "postgres:17-alpine",
  ]);
  /* Marcado logo depois do `run`, e não depois do `pg_isready`: um banco que
     nasceu e não ficou pronto também precisa ser removido no fim. */
  containerCriado = true;

  /* Pronto é pronto por TCP, e duas vezes seguidas. A imagem oficial sobe
     primeiro um servidor temporário só no socket Unix para rodar a
     inicialização, derruba e sobe o definitivo: um `pg_isready` sem `-h`
     responde "pronto" nesse intervalo, e o Prisma leva P1001 logo depois. A
     porta publicada também é conferida do lado da máquina, que é por onde as
     migrações vão entrar. */
  let seguidas = 0;
  for (let tentativa = 0; tentativa < 120; tentativa += 1) {
    const pronto =
      (await comandoPassa("docker", [
        "exec",
        CONTAINER_DB,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-p",
        "5432",
        "-U",
        "jb",
        "-d",
        "jb",
      ])) && (await portaOcupada(PORTA_DB));
    seguidas = pronto ? seguidas + 1 : 0;
    if (seguidas >= 2) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("PostgreSQL efêmero não ficou pronto dentro do limite esperado.");
}

/**
 * Destinos de medição FICTÍCIOS no banco efêmero.
 *
 * Sem eles o aviso de consentimento nem aparece e os testes de medição não
 * têm o que medir. Os identificadores têm formato válido e não pertencem a
 * ninguém; o E2E intercepta toda requisição a Google e Meta, então nada sai
 * da máquina. Acessibilidade e responsividade passam a medir a página com o
 * aviso aberto, que é como a primeira visita de verdade acontece.
 */
const DESTINOS_DE_TESTE = {
  codigo_analytics: "G-TESTE12345",
  google_ads_id: "AW-123456789",
  google_ads_rotulo_whatsapp: "TesteWhats1",
  meta_pixel_id: "123456789012345",
};

async function gravarDestinosDeTeste() {
  const chaves = Object.keys(DESTINOS_DE_TESTE);
  const casos = Object.entries(DESTINOS_DE_TESTE)
    .map(([chave, valor]) => `WHEN '${chave}' THEN '${valor}'`)
    .join(" ");
  const lista = chaves.map((chave) => `'${chave}'`).join(", ");
  const sql = `DO $$ BEGIN
    UPDATE "Setting" SET value = CASE key ${casos} END WHERE key IN (${lista});
    IF (SELECT count(*) FROM "Setting" WHERE key IN (${lista}) AND value <> '') <> ${chaves.length} THEN
      RAISE EXCEPTION 'destinos de medição de teste não foram gravados';
    END IF;
  END $$;`;
  await executarComando("docker", ["exec", CONTAINER_DB, "psql", "-U", "jb", "-d", "jb", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql]);
}

async function removerPostgres() {
  await comandoPassa("docker", ["rm", "-f", CONTAINER_DB]);
}

function iniciarServidor() {
  return iniciar(
    "pnpm",
    ["exec", "next", "start", "-p", String(PORTA), "-H", "127.0.0.1"],
    { ambiente: { PORT: String(PORTA) }, shell: NO_WINDOWS },
  );
}

/**
 * Espera o `next start` responder — e responder como JB. Qualquer resposta
 * não basta: se outro processo tomasse a porta no meio do caminho, a bateria
 * inteira mediria o site errado.
 */
async function aguardarServidor(processo) {
  for (let tentativa = 0; tentativa < 180; tentativa += 1) {
    if (processo.exitCode !== null) {
      throw new Error(`next start encerrou antes de ficar disponível (código ${processo.exitCode})`);
    }

    try {
      const resposta = await fetch(BASE_URL, { redirect: "manual" });
      if (resposta.status > 0) {
        const html = await resposta.text();
        if (resposta.status !== 200 || !/JB Soluções Odontológicas/.test(html)) {
          throw new Error(
            `${BASE_URL} respondeu HTTP ${resposta.status}, mas não com a home da JB. ` +
              "A bateria não roda contra um servidor que não é o deste build.",
          );
        }
        return;
      }
    } catch (erro) {
      if (erro instanceof Error && erro.message.includes("não com a home da JB")) throw erro;
      // Ainda iniciando.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Servidor de validação não respondeu em ${BASE_URL}`);
}

/**
 * O build prerenderiza páginas públicas com as configurações do banco. Se uma
 * leitura falhou no meio do build, `configuracoesPublicas` cai nos padrões — de
 * propósito, para o site nunca sair do ar — e aquela página fica gerada sem os
 * destinos de medição. Testar esse build mediria a queda, não o site.
 *
 * Os destinos fictícios gravados antes do build fazem o rodapé ter o botão
 * "Cookies e medição". Página sem ele foi gerada sem o banco: a validação para
 * aqui e diz qual, em vez de deixar um teste de consentimento falhar sem
 * motivo aparente.
 */
async function conferirBuildComBanco() {
  const rotas = [
    "/",
    "/autoclave",
    "/compressor",
    "/cadeira-odontologica",
    "/bomba-de-vacuo",
    "/seladora",
    "/destilador",
    "/lavadora-ultrassonica",
    "/privacidade",
    "/termos",
  ];
  const semBanco = [];
  for (const rota of rotas) {
    const html = await (await fetch(BASE_URL + rota)).text();
    if (!html.includes("Cookies e medição")) semBanco.push(rota);
  }
  if (semBanco.length) {
    throw new Error(
      `O build gerou ${semBanco.join(", ")} sem ler as configurações do banco (caiu nos padrões). ` +
        "Veja \"configurações indisponíveis\" no log do build.",
    );
  }
}

async function encerrarServidor(processo) {
  if (!processo || processo.exitCode !== null) return;

  if (NO_WINDOWS) {
    /* Com shell, o pid é do `cmd.exe`; `/t` derruba a árvore toda, inclusive
       o node do `next start`. */
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
let limpando = false;

async function limpar() {
  if (limpando) return;
  limpando = true;
  try {
    await encerrarServidor(servidor);
  } finally {
    if (containerCriado) await removerPostgres();
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

/* ------------------------------------------------------------- etapas */

const resumo = [];

async function etapa(nome, executar) {
  const inicio = performance.now();
  console.log(`\n━━ ${nome}\n`);
  try {
    await executar();
    resumo.push({ nome, ok: true, segundos: (performance.now() - inicio) / 1000 });
  } catch (erro) {
    resumo.push({ nome, ok: false, segundos: (performance.now() - inicio) / 1000 });
    throw erro;
  }
}

function imprimirResumo() {
  console.log("\nJB · resumo da validação\n");
  for (const item of resumo) {
    console.log(`  ${item.ok ? "✓" : "✗"} ${item.nome.padEnd(34)} ${item.segundos.toFixed(1)}s`);
  }
  console.log("");
}

console.log("\nJB · validação final isolada\n");
console.log(`Aplicação: ${BASE_URL} (origem pública do build: ${SITE_URL})`);
console.log(`Banco efêmero: 127.0.0.1:${PORTA_DB} (${CONTAINER_DB})\n`);

let falhou = false;

try {
  await exigirPortaLivre(PORTA, "aplicação");
  await exigirPortaLivre(PORTA_DB, "banco");

  /* Falhas rápidas primeiro: ainda sem Docker/Postgres. */
  await etapa("Arquitetura", () => executarPnpm(["arquitetura:verificar"]));
  await etapa("Lint", () => executarPnpm(["lint"]));
  await etapa("TypeScript", () => executarPnpm(["typecheck"]));
  /* Dois workers: a máquina de desenvolvimento divide CPU com Docker e com
     outros projetos, e a suíte unitária fecha em segundos assim mesmo. */
  await etapa("Testes unitários", () => executarPnpm(["test:unit", "--maxWorkers=2"]));

  /* A partir daqui tudo que toca banco recebe exclusivamente a URL local. */
  await etapa("PostgreSQL 17 efêmero", subirPostgres);

  await etapa("Migrações", () => executarPnpm(["db:deploy"]));
  await etapa("Carga base", () => executarPnpm(["db:seed"]));
  await etapa("Carga demo", () => executarPnpm(["db:demo"]));
  await etapa("Carga de operação", () => executarPnpm(["db:demo:operacao"]));
  await etapa("Destinos de medição de teste", gravarDestinosDeTeste);

  /* Garante o binário do navegador sem instalar dependência de sistema nem
     pedir privilégio administrativo. Em Linux, libs do Chromium continuam
     sendo pré-requisito da máquina/CI. */
  await etapa("Chromium do Playwright", () =>
    executarPnpm(["exec", "playwright", "install", "chromium"]),
  );

  await etapa("Build de produção", () => executarPnpm(["build"]));

  await etapa("Servidor de produção local", async () => {
    servidor = iniciarServidor();
    await aguardarServidor(servidor);
    await conferirBuildComBanco();
  });

  const ambienteNavegador = {
    BASE_URL,
    E2E_BASE_URL: BASE_URL,
    /* Os testes de consentimento e medição não podem se declarar pulados aqui. */
    E2E_EXIGE_MEDICAO: "1",
  };

  /* `VALIDACAO_CONTINUAR=1` roda as três baterias de navegador mesmo que uma
     falhe — útil para ver tudo o que falta numa rodada só. A validação
     continua reprovada no fim se qualquer uma tiver falhado. */
  const continuar = process.env.VALIDACAO_CONTINUAR === "1";
  const falhasDoNavegador = [];
  for (const [nome, argumentos] of [
    ["E2E da assistência", ["exec", "playwright", "test"]],
    ["Acessibilidade", ["a11y"]],
    ["Responsividade", ["responsivo"]],
  ]) {
    try {
      await etapa(nome, () => executarPnpm(argumentos, ambienteNavegador));
    } catch (erro) {
      if (!continuar) throw erro;
      falhasDoNavegador.push(nome);
    }
  }
  if (falhasDoNavegador.length) {
    throw new Error(`falharam: ${falhasDoNavegador.join(", ")}`);
  }
} catch (erro) {
  falhou = true;
  console.error(`\nJB · validação final interrompida: ${erro instanceof Error ? erro.message : erro}\n`);
} finally {
  await limpar();
  imprimirResumo();
}

if (falhou) {
  process.exitCode = 1;
} else {
  console.log("JB · validação final concluída sem falhas.\n");
}
