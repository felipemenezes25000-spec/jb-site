import fs from "node:fs";
import path from "node:path";

/**
 * Contrato entre `preparar.ts` (roda uma vez, com acesso ao banco) e os testes
 * (rodam em outros processos, só com o navegador). O arquivo é o meio de
 * transporte: variável de ambiente atravessaria, mas um JSON no disco é
 * inspecionável quando algum teste falha por dado faltando.
 */

export type Fixtures = {
  produto: {
    slug: string;
    nome: string;
    precoCents: number;
  };
  /** condições de produto que existem publicadas, para o teste de filtro */
  condicoes: string[];
  staff: { email: string; senha: string };
};

/** Senha do usuário de equipe criado só para a suíte. Nunca vai para o banco de produção. */
export const SENHA_STAFF_E2E = "e2e-JB-2026!teste";

export const ARQUIVO_FIXTURES = path.join(process.cwd(), "tests", ".fixtures.json");

let cache: Fixtures | null = null;

export function fixtures(): Fixtures {
  if (cache) return cache;
  if (!fs.existsSync(ARQUIVO_FIXTURES)) {
    throw new Error(
      `Fixtures não encontradas em ${ARQUIVO_FIXTURES}. O globalSetup (tests/e2e/preparar.ts) precisa rodar antes.`,
    );
  }
  cache = JSON.parse(fs.readFileSync(ARQUIVO_FIXTURES, "utf8")) as Fixtures;
  return cache;
}
