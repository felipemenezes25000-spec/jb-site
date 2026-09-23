import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  exigirAmbienteSeguro,
  type Ambiente,
  type ContextoAmbiente,
} from "../src/lib/seguranca-ambiente";

const CONTEXTOS = new Set<ContextoAmbiente>([
  "build",
  "database",
  "db-deploy",
  "db-destructive",
  "seed-demo",
]);

function lerEnvArquivo(caminho: string): Ambiente {
  if (!existsSync(caminho)) return {};

  const resultado: Ambiente = {};
  for (const linhaOriginal of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const linha = linhaOriginal.trim();
    if (!linha || linha.startsWith("#")) continue;

    const separador = linha.indexOf("=");
    if (separador <= 0) continue;

    const chave = linha.slice(0, separador).trim();
    let bruto = linha.slice(separador + 1).trim();
    if (
      (bruto.startsWith('"') && bruto.endsWith('"')) ||
      (bruto.startsWith("'") && bruto.endsWith("'"))
    ) {
      bruto = bruto.slice(1, -1);
    }
    resultado[chave] = bruto;
  }
  return resultado;
}

const contexto = process.argv[2] as ContextoAmbiente | undefined;
if (!contexto || !CONTEXTOS.has(contexto)) {
  console.error(
    `Uso: tsx scripts/verificar-ambiente.ts <${Array.from(CONTEXTOS).join("|")}>`,
  );
  process.exit(2);
}

const raiz = process.cwd();
const env: Ambiente = {
  ...lerEnvArquivo(resolve(raiz, ".env")),
  ...lerEnvArquivo(resolve(raiz, ".env.local")),
  ...process.env,
};

try {
  exigirAmbienteSeguro(env, contexto);
  console.log(`[ambiente] OK (${contexto})`);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
}
