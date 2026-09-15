import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Dívida existente vira teto, não licença para continuar crescendo.
 *
 * Estes quatro arquivos já estavam grandes quando a regra entrou. Eles podem
 * diminuir, mas não podem aumentar um byte sequer sem antes serem divididos.
 */
const LEGADOS = new Map<string, number>([
  ["admin-servico.ts", 96_946],
  ["admin-catalogo.ts", 72_455],
  ["admin-vendas.ts", 70_147],
  ["admin-conteudo.ts", 60_048],
]);

/** Novo Server Action acima disso precisa nascer dividido por caso de uso. */
const MAX_NOVO_ACTION_BYTES = 50_000;
const diretorio = join(process.cwd(), "src", "app", "acoes");
const problemas: string[] = [];

for (const nome of readdirSync(diretorio)) {
  if (!nome.endsWith(".ts")) continue;
  const bytes = statSync(join(diretorio, nome)).size;
  const tetoLegado = LEGADOS.get(nome);

  if (tetoLegado !== undefined) {
    if (bytes > tetoLegado) {
      problemas.push(
        `${nome} cresceu de ${tetoLegado} para ${bytes} bytes. Extraia o novo caso de uso para um módulo menor.`,
      );
    }
    continue;
  }

  if (bytes > MAX_NOVO_ACTION_BYTES) {
    problemas.push(
      `${nome} tem ${bytes} bytes. O teto para novos arquivos de Server Actions é ${MAX_NOVO_ACTION_BYTES}.`,
    );
  }
}

if (problemas.length) {
  console.error("Limites arquiteturais violados:\n" + problemas.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}

console.log("[arquitetura] OK — dívida legada não aumentou.");
