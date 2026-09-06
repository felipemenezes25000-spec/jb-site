import { describe, expect, it } from "vitest";

import {
  codigoLegivel,
  destinoDoLogin,
  normalizarCodigo,
  novoLocalizador,
  quemPodeVer,
} from "@/lib/etiqueta";

/* ============================================================================
   Etiqueta de QR

   O modo de falha: alguém aponta a câmera para a etiqueta de um equipamento
   que não é dele e vê o prontuário. Ou pior: um link de login com retorno
   controlado por quem mandou o link.
   ============================================================================ */

const equipamento = { customerId: "cli-1", desativado: false };

describe("quemPodeVer", () => {
  it("visitante não vê nada — nem o nome do equipamento", () => {
    const r = quemPodeVer({ tipo: "visitante" }, equipamento);
    expect(r.permitido).toBe(false);
    if (!r.permitido) expect(r.motivo).toBe("sem_sessao");
  });

  it("titular vê", () => {
    const r = quemPodeVer({ tipo: "cliente", customerId: "cli-1" }, equipamento);
    expect(r.permitido).toBe(true);
  });

  it("cliente de outra clínica NÃO vê", () => {
    // é o caso do ID trocado: mesma URL, conta errada
    const r = quemPodeVer({ tipo: "cliente", customerId: "cli-2" }, equipamento);
    expect(r.permitido).toBe(false);
    if (!r.permitido) expect(r.motivo).toBe("outro_titular");
  });

  it("sessão de equipe NÃO é autorização", () => {
    // o painel tem gente comercial e editorial que não precisa de prontuário
    const r = quemPodeVer({ tipo: "staff", podeVerEquipamentos: false }, equipamento);
    expect(r.permitido).toBe(false);
    if (!r.permitido) expect(r.motivo).toBe("sem_permissao");
  });

  it("equipe com acesso à área de equipamentos vê", () => {
    const r = quemPodeVer({ tipo: "staff", podeVerEquipamentos: true }, equipamento);
    expect(r.permitido).toBe(true);
    if (r.permitido) expect(r.motivo).toBe("equipe");
  });

  it("equipamento desativado continua sendo do titular", () => {
    // a etiqueta colada nele não pode responder "não existe"
    const r = quemPodeVer(
      { tipo: "cliente", customerId: "cli-1" },
      { ...equipamento, desativado: true },
    );
    expect(r.permitido).toBe(true);
  });
});

describe("destinoDoLogin", () => {
  it("volta sempre para a própria ficha", () => {
    expect(destinoDoLogin("ABC123")).toBe("/e/ABC123");
  });

  it("não aceita destino externo embutido no localizador", () => {
    // retorno malicioso: o destino é construído, nunca lido de parâmetro
    const destino = destinoDoLogin("https://outro.site/roubo");
    expect(destino.startsWith("/e/")).toBe(true);
    expect(destino).not.toContain("//outro.site");
  });
});

describe("novoLocalizador", () => {
  it("é opaco, longo e diferente a cada chamada", () => {
    const a = novoLocalizador();
    const b = novoLocalizador();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
    expect(a).toMatch(/^[A-Z0-9_-]+$/);
  });
});

describe("codigoLegivel e normalizarCodigo", () => {
  it("agrupa de cinco para poder ser ditado", () => {
    expect(codigoLegivel("ABCDEFGHIJ")).toBe("ABCDE-FGHIJ");
  });

  it("a volta desfaz o agrupamento e a caixa", () => {
    expect(normalizarCodigo("abcde-fghij")).toBe("ABCDEFGHIJ");
  });

  it("descarta o que não é do alfabeto do código", () => {
    expect(normalizarCodigo(" ABC/DE.FG ")).toBe("ABCDEFG");
  });
});
