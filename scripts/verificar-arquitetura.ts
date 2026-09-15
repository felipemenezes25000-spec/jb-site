import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

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

/**
 * Consumidores que ainda usavam o nome histórico `marketplace` quando a regra
 * entrou. A lista é deliberadamente nominal: pode diminuir, nunca crescer.
 * Arquivo novo ou consumidor fora desta lista falha a CI imediatamente.
 */
const IMPORTS_MARKETPLACE_LEGADOS = new Set([
  "src/app/(vitrine)/loja/[slug]/layout.tsx",
  "src/app/(vitrine)/loja/[slug]/page.tsx",
  "src/app/acoes/admin-relacionamentos.ts",
  "src/components/admin/catalogo/formulario-cross-sell-tipado.tsx",
  "src/components/loja/marketplace/tipos.ts",
  "src/components/loja/produto/comparacao-rapida.tsx",
  "src/components/loja/produto/especificacoes.tsx",
  "src/components/loja/produto/resumo-tecnico.tsx",
  "src/lib/catalogo.ts",
]);

/** Novo Server Action acima disso precisa nascer dividido por caso de uso. */
const MAX_NOVO_ACTION_BYTES = 50_000;
const raiz = process.cwd();
const diretorioAcoes = join(raiz, "src", "app", "acoes");
const diretorioSrc = join(raiz, "src");
const problemas: string[] = [];

function arquivosTs(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) return arquivosTs(caminho);
    return entrada.isFile() && /\.[cm]?[tj]sx?$/.test(entrada.name) ? [caminho] : [];
  });
}

for (const caminho of arquivosTs(diretorioAcoes)) {
  const relativo = relative(diretorioAcoes, caminho).split(sep).join("/");
  const bytes = statSync(caminho).size;
  const tetoLegado = !relativo.includes("/") ? LEGADOS.get(relativo) : undefined;

  if (tetoLegado !== undefined) {
    if (bytes > tetoLegado) {
      problemas.push(
        `${relativo} cresceu de ${tetoLegado} para ${bytes} bytes. Extraia o novo caso de uso para um módulo menor.`,
      );
    }
    continue;
  }

  if (bytes > MAX_NOVO_ACTION_BYTES) {
    problemas.push(
      `${relativo} tem ${bytes} bytes. O teto para novos arquivos de Server Actions é ${MAX_NOVO_ACTION_BYTES}.`,
    );
  }
}

/**
 * `marketplace` é apenas uma fachada de compatibilidade para imports antigos.
 * Se código novo voltar a depender desse caminho, o nome errado nunca morre.
 * Os próprios wrappers e os consumidores nominalmente congelados são as únicas
 * exceções. Quando um legado for migrado, remova-o da allowlist no mesmo PR.
 */
for (const caminho of arquivosTs(diretorioSrc)) {
  const relativo = relative(raiz, caminho).split(sep).join("/");
  if (relativo.startsWith("src/lib/marketplace/")) continue;

  const conteudo = readFileSync(caminho, "utf8");
  if (
    conteudo.includes("@/lib/marketplace/") &&
    !IMPORTS_MARKETPLACE_LEGADOS.has(relativo)
  ) {
    problemas.push(
      `${relativo} importa @/lib/marketplace/*. Use @/lib/comercio/*; marketplace é só compatibilidade.`,
    );
  }
}

if (problemas.length) {
  console.error("Limites arquiteturais violados:\n" + problemas.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}

console.log(
  "[arquitetura] OK — dívida legada está congelada; código novo usa os módulos atuais.",
);
