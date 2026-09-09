import { describe, expect, it } from "vitest";

import {
  escreverMetaMelhorEnvio,
  lerMetaMelhorEnvio,
  semMetaMelhorEnvio,
} from "@/lib/logistica-meta";
import { lerEscolhaFrete, serializarEscolhaFrete } from "@/lib/selecao-frete";

describe("seleção de frete do Melhor Envio", () => {
  it("preserva serviceId e companyId no cookie", () => {
    const serializado = serializarEscolhaFrete({
      kind: "melhor_envio",
      serviceId: 2,
      companyId: 1,
    });

    expect(serializado).toBe("me:2:1");
    expect(lerEscolhaFrete(serializado)).toEqual({
      kind: "melhor_envio",
      serviceId: 2,
      companyId: 1,
    });
  });

  it("continua aceitando o formato legado sem companyId", () => {
    expect(lerEscolhaFrete("me:17")).toEqual({
      kind: "melhor_envio",
      serviceId: 17,
    });
  });

  it("recusa identificadores inválidos", () => {
    expect(lerEscolhaFrete("me:0:1")).toBeNull();
    expect(lerEscolhaFrete("me:2:0")).toBeNull();
    expect(lerEscolhaFrete("me:-1:2")).toBeNull();
    expect(lerEscolhaFrete("me:2:abc")).toBeNull();
  });
});

describe("metadados internos do Melhor Envio", () => {
  it("faz round-trip sem apagar a nota humana", () => {
    const nota = escreverMetaMelhorEnvio("Conferir embalagem reforçada.", {
      provider: "melhor_envio",
      companyId: 1,
      serviceId: 2,
      providerOrderIds: ["frete-1"],
      trackingCodes: ["AA123BR"],
      status: "emitido",
    });

    expect(nota).toContain("Conferir embalagem reforçada.");
    expect(semMetaMelhorEnvio(nota)).toBe("Conferir embalagem reforçada.");
    expect(lerMetaMelhorEnvio(nota)).toMatchObject({
      provider: "melhor_envio",
      companyId: 1,
      serviceId: 2,
      providerOrderIds: ["frete-1"],
      trackingCodes: ["AA123BR"],
      status: "emitido",
    });
  });

  it("substitui o bloco técnico anterior em vez de duplicá-lo", () => {
    const primeira = escreverMetaMelhorEnvio("Nota operacional", {
      provider: "melhor_envio",
      status: "no_carrinho",
      providerOrderIds: ["frete-1"],
    });
    const segunda = escreverMetaMelhorEnvio(primeira, {
      provider: "melhor_envio",
      status: "comprado",
      providerOrderIds: ["frete-1"],
    });

    expect(segunda.match(/\[\[JB_MELHOR_ENVIO:/g)).toHaveLength(1);
    expect(semMetaMelhorEnvio(segunda)).toBe("Nota operacional");
    expect(lerMetaMelhorEnvio(segunda)?.status).toBe("comprado");
  });

  it("ignora bloco quebrado em vez de inventar estado", () => {
    expect(lerMetaMelhorEnvio("[[JB_MELHOR_ENVIO:{quebrado}]]")).toBeNull();
  });
});
