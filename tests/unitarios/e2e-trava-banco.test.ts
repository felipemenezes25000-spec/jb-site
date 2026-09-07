import { afterEach, describe, expect, it } from "vitest";

import { exigirBancoLocal } from "../e2e/preparar";

/* ============================================================================
   Trava do banco da suíte de ponta a ponta

   `docs/operacao.md` abre avisando que `vercel env pull .env.local` traz as
   variáveis de produção para a máquina de quem desenvolve, que o Next prefere
   esse arquivo ao `.env`, e que isso já aconteceu neste projeto. O
   `carregarEnv()` de `tests/e2e/preparar.ts` lê o mesmo `.env.local`, e a
   suíte é a coisa que mais escreve no banco: marca, produto, perfil de frete,
   dois usuários de equipe com senha conhecida, e depois pedidos e pagamentos
   de verdade.

   O que estes testes protegem é uma frase só: `pnpm e2e` não escreve em banco
   remoto sem alguém ter pedido isso em voz alta.
   ============================================================================ */

const LOCAL = "postgresql://jb:jb@localhost:5433/jb?schema=public";

/* A senha é um sentinela improvável de propósito. "senha" seria péssimo aqui:
   a própria mensagem da trava explica que a suíte cria "um usuário admin com
   senha conhecida", e o teste passaria a acusar a prosa em vez do vazamento. */
const SENHA = "zzTOP-sentinela-9f13";
const REMOTO = `postgresql://usuario:${SENHA}@ep-nome-123.sa-east-1.aws.neon.tech/jb?sslmode=require`;

afterEach(() => {
  delete process.env.E2E_PERMITIR_BANCO_REMOTO;
});

describe("exigirBancoLocal", () => {
  it("deixa passar o Postgres do docker-compose", () => {
    expect(() => exigirBancoLocal(LOCAL)).not.toThrow();
  });

  it.each([
    ["127.0.0.1", "postgresql://jb:jb@127.0.0.1:5433/jb"],
    ["IPv6", "postgresql://jb:jb@[::1]:5433/jb"],
    ["host do serviço no compose", "postgresql://jb:jb@db:5432/jb"],
  ])("deixa passar %s", (_rotulo, url) => {
    expect(() => exigirBancoLocal(url)).not.toThrow();
  });

  it("barra banco remoto", () => {
    expect(() => exigirBancoLocal(REMOTO)).toThrow(/se recusou a rodar contra/);
  });

  it("diz o host recusado e como consertar", () => {
    try {
      exigirBancoLocal(REMOTO);
      expect.unreachable("deveria ter lançado");
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      expect(mensagem).toContain("ep-nome-123.sa-east-1.aws.neon.tech");
      expect(mensagem).toContain("docker compose up -d");
      expect(mensagem).toContain("E2E_PERMITIR_BANCO_REMOTO");
    }
  });

  it("nunca põe a senha da conexão na mensagem", () => {
    try {
      exigirBancoLocal(REMOTO);
      expect.unreachable("deveria ter lançado");
    } catch (erro) {
      expect(erro instanceof Error ? erro.message : String(erro)).not.toContain(SENHA);
    }
  });

  it("a escotilha libera, e só com o valor exato", () => {
    process.env.E2E_PERMITIR_BANCO_REMOTO = "1";
    expect(() => exigirBancoLocal(REMOTO)).not.toThrow();

    for (const valor of ["", "0", "true", "sim"]) {
      process.env.E2E_PERMITIR_BANCO_REMOTO = valor;
      expect(() => exigirBancoLocal(REMOTO)).toThrow(/se recusou a rodar contra/);
    }
  });

  it("recusa URL ilegível em vez de adivinhar que é local", () => {
    expect(() => exigirBancoLocal("isto-nao-e-uma-url")).toThrow(/não é uma URL válida/);
  });
});
