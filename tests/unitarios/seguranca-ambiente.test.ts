import { describe, expect, it } from "vitest";

import {
  CONFIRMACAO_OPERACAO_PRODUCAO,
  problemasDoAmbiente,
  urlsBancoEfetivas,
} from "../../src/lib/seguranca-ambiente";

describe("segurança de ambiente", () => {
  it("recusa banco de preview configurado em produção", () => {
    expect(
      problemasDoAmbiente(
        {
          VERCEL_ENV: "production",
          DATABASE_URL: "postgresql://prod",
          JBPREV_DATABASE_URL: "postgresql://preview",
        },
        "database",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("preview")]))
  });

  it("recusa preview sem banco próprio", () => {
    expect(
      problemasDoAmbiente(
        { VERCEL_ENV: "preview", DATABASE_URL: "postgresql://prod" },
        "database",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("preview sem JBPREV_DATABASE_URL")]));
  });

  it("recusa preview apontando para a mesma URL de produção", () => {
    expect(
      problemasDoAmbiente(
        {
          VERCEL_ENV: "preview",
          DATABASE_URL: "postgresql://mesmo-banco",
          JBPREV_DATABASE_URL: "postgresql://mesmo-banco",
        },
        "database",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("bancos diferentes")]));
  });

  it("recusa conexão direta de preview igual à conexão direta de produção", () => {
    expect(
      problemasDoAmbiente(
        {
          VERCEL_ENV: "preview",
          DATABASE_URL: "postgresql://prod",
          DATABASE_URL_UNPOOLED: "postgresql://prod-direto",
          JBPREV_DATABASE_URL: "postgresql://preview",
          JBPREV_DATABASE_URL_UNPOOLED: "postgresql://prod-direto",
        },
        "db-deploy",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Prisma CLI de preview")]));
  });

  it("runtime e Prisma CLI usam somente as URLs de preview", () => {
    expect(
      urlsBancoEfetivas({
        VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://prod-pooled",
        DATABASE_URL_UNPOOLED: "postgresql://prod-direto",
        JBPREV_DATABASE_URL: "postgresql://preview-pooled",
        JBPREV_DATABASE_URL_UNPOOLED: "postgresql://preview-direto",
      }),
    ).toEqual({
      runtime: "postgresql://preview-pooled",
      cli: "postgresql://preview-direto",
    });
  });

  it("Prisma CLI de preview cai na URL de preview normal quando não há direta própria", () => {
    expect(
      urlsBancoEfetivas({
        VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://prod",
        DATABASE_URL_UNPOOLED: "postgresql://prod-direto",
        JBPREV_DATABASE_URL: "postgresql://preview",
      }),
    ).toEqual({ runtime: "postgresql://preview", cli: "postgresql://preview" });
  });

  it("produção usa URL direta para Prisma CLI e pooled no runtime", () => {
    expect(
      urlsBancoEfetivas({
        VERCEL_ENV: "production",
        DATABASE_URL: "postgresql://prod-pooled",
        DATABASE_URL_UNPOOLED: "postgresql://prod-direto",
      }),
    ).toEqual({
      runtime: "postgresql://prod-pooled",
      cli: "postgresql://prod-direto",
    });
  });

  it("recusa pagamento simulado em produção", () => {
    expect(
      problemasDoAmbiente(
        {
          VERCEL_ENV: "production",
          DATABASE_URL: "postgresql://prod",
          PAYMENT_PROVIDER: "mock",
        },
        "database",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("simulado")]));
  });

  it("permite teste unitário importar Prisma sem URL de banco", () => {
    expect(problemasDoAmbiente({ NODE_ENV: "test" }, "database")).toEqual([]);
  });

  it("scripts de banco continuam exigindo URL mesmo em teste", () => {
    expect(problemasDoAmbiente({ NODE_ENV: "test" }, "db-deploy")).toEqual(
      expect.arrayContaining([expect.stringContaining("Nenhuma URL de banco")]),
    );
  });

  it("bloqueia operação destrutiva em produção sem confirmação", () => {
    expect(
      problemasDoAmbiente(
        { NODE_ENV: "production", DATABASE_URL: "postgresql://prod" },
        "db-destructive",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Operação destrutiva bloqueada")]));
  });

  it("aceita operação destrutiva quando há confirmação explícita", () => {
    expect(
      problemasDoAmbiente(
        {
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://prod",
          PERMITIR_OPERACAO_PRODUCAO: CONFIRMACAO_OPERACAO_PRODUCAO,
        },
        "db-destructive",
      ),
    ).toEqual([]);
  });
});
