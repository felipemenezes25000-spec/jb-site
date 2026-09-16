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
  /**
   * Segunda conta de equipe, usada só pelo teste que troca a própria senha.
   * Separada da primeira de propósito: aquele teste altera a senha, e se
   * mexesse na conta principal derrubaria todos os outros arquivos da suíte.
   */
  staffSenha: { email: string; senha: string };
  /**
   * Produto com perfil de frete próprio e uma faixa de CEP conhecida.
   *
   * Perfil próprio, e não o padrão da loja, porque o padrão é dado de quem
   * semeou o banco: com ele o teste passaria ou falharia conforme a tabela
   * que a JB tivesse cadastrado, e não conforme o cálculo do frete.
   */
  frete: {
    slug: string;
    nome: string;
    precoCents: number;
    /** CEP dentro da faixa cadastrada — o checkout tem de mostrar valor. */
    cepComFaixa: string;
    /** CEP fora de qualquer faixa — o checkout tem de dizer que será orçado. */
    cepSemFaixa: string;
    valorCents: number;
    prazoDias: number;
    nomeDaFaixa: string;
  };
};

/** Senha do usuário de equipe criado só para a suíte. Nunca vai para o banco de produção. */
export const SENHA_STAFF_E2E = "e2e-JB-2026!teste";

/** Senha inicial da conta dedicada à troca de senha. */
export const SENHA_STAFF_TROCA_E2E = "e2e-JB-2026!troca";

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
