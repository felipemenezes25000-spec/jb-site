import { describe, expect, it } from "vitest";

import {
  CONFIRMACAO_OPERACAO_PRODUCAO,
  problemasDoAmbiente,
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
    ).toEqual(expect.arrayContaining([expect.stringContaining("JBPREV_DATABASE_URL")]));
  });

  it("recusa preview sem banco próprio", () => {
    expect(
      problemasDoAmbiente(
        { VERCEL_ENV: "preview", DATABASE_URL: "postgresql://prod" },
        "database",
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining("preview sem JBPREV_DATABASE_URL")]));
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
