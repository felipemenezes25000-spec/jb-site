import { spawn } from "node:child_process";

/* ============================================================================
   Validação final — uma rodada, um servidor

   Este script existe para a etapa de fechamento depois de uma leva grande de
   mudanças. Ele NÃO é chamado automaticamente por commit nem por postinstall.

   Ordem:
     1. arquitetura
     2. lint
     3. TypeScript
     4. unitários
     5. build de produção (inclui prebuild/ambiente)
     6. sobe exatamente esse build numa porta isolada
     7. E2E atual da assistência
     8. acessibilidade mobile + desktop
     9. responsividade 320..1920

   E2E, a11y e responsividade reutilizam o mesmo processo `next start`, para a
   rodada não compilar/subir a aplicação três vezes. Qualquer falha encerra a
   sequência com código diferente de zero. O servidor é derrubado no `finally`.
   ============================================================================ */

const PORTA = Number(process.env.VALIDACAO_PORTA ?? 3210);
const BASE_URL = `http://127.0.0.1:${PORTA}`;
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function executar(argumentos, ambiente = {}) {
  return new Promise((resolve, reject) => {
    const processo = spawn(PNPM, argumentos, {
      stdio: "inherit",
      env: { ...process.env, ...ambiente },
      windowsHide: true,
    });

    processo.once("error", reject);
    processo.once("exit", (codigo, sinal) => {
      if (codigo === 0) resolve();
      else reject(new Error(`pnpm ${argumentos.join(" ")} falhou (${codigo ?? sinal ?? "sem código"})`));
    });
  });
}

function iniciarServidor() {
  return spawn(PNPM, ["exec", "next", "start", "-p", String(PORTA), "-H", "127.0.0.1"], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORTA) },
    windowsHide: true,
  });
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

console.log("\nJB · validação final\n");

await executar(["arquitetura:verificar"]);
await executar(["lint"]);
await executar(["typecheck"]);
await executar(["test:unit"]);
await executar(["build"]);

let servidor;
try {
  servidor = iniciarServidor();
  await aguardarServidor(servidor);

  const ambiente = {
    BASE_URL,
    E2E_BASE_URL: BASE_URL,
  };

  await executar(["exec", "playwright", "test"], ambiente);
  await executar(["a11y"], ambiente);
  await executar(["responsivo"], ambiente);

  console.log("\nJB · validação final concluída sem falhas.\n");
} finally {
  await encerrarServidor(servidor);
}
