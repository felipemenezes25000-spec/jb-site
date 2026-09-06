import { describe, expect, it } from "vitest";

import {
  contarChecklist,
  frasedaVerificacao,
  gerarCodigoPublico,
  podePublicar,
  seloVisivel,
} from "@/lib/certificacao";

/* ============================================================================
   Seminovo JB Certificado

   O que estes testes protegem: um selo que afirma mais do que foi verificado.
   O caminho mais fácil para isso não é mentir numa linha — é somar os itens
   "não aplicáveis" aos aprovados e publicar "34 de 34".
   ============================================================================ */

const itens = (...resultados: string[]) => resultados.map((result) => ({ result }));

describe("contarChecklist", () => {
  it("conta verificado, substituído e reparado como aprovados", () => {
    const c = contarChecklist(itens("verificado", "substituido", "reparado"));
    expect(c.aprovados).toBe(3);
    expect(c.total).toBe(3);
    expect(c.pendentes).toBe(0);
  });

  it("NÃO conta não aplicável como aprovado", () => {
    // é a asserção central do arquivo
    const c = contarChecklist(itens("verificado", "nao_aplicavel", "nao_aplicavel"));
    expect(c.aprovados).toBe(1);
    expect(c.naoAplicaveis).toBe(2);
    expect(c.total).toBe(3);
  });

  it("o que não é aprovado nem não aplicável fica pendente", () => {
    const c = contarChecklist(itens("verificado", "", "pendente_qualquer"));
    expect(c.pendentes).toBe(2);
  });

  it("checklist vazio não estoura", () => {
    expect(contarChecklist([])).toEqual({
      total: 0,
      aprovados: 0,
      naoAplicaveis: 0,
      pendentes: 0,
    });
  });
});

describe("podePublicar", () => {
  const completo = contarChecklist(itens("verificado", "verificado", "substituido"));

  it("aprova inspeção completa com técnico", () => {
    expect(
      podePublicar({ contagem: completo, temTecnico: true, status: "concluida" }),
    ).toBeNull();
  });

  it("recusa sem técnico responsável — laudo sem responsável não é laudo", () => {
    const r = podePublicar({ contagem: completo, temTecnico: false, status: "concluida" });
    expect(r?.motivo).toContain("técnico");
  });

  it("recusa checklist vazio", () => {
    const r = podePublicar({
      contagem: contarChecklist([]),
      temTecnico: true,
      status: "concluida",
    });
    expect(r?.motivo).toContain("vazio");
  });

  it("recusa checklist com item pendente", () => {
    const parcial = contarChecklist(itens("verificado", ""));
    const r = podePublicar({ contagem: parcial, temTecnico: true, status: "concluida" });
    expect(r?.motivo).toContain("sem resultado");
  });

  it("recusa quando TUDO ficou como não aplicável", () => {
    // não há verificação que sustente o selo — nenhum item foi conferido
    const nada = contarChecklist(itens("nao_aplicavel", "nao_aplicavel"));
    const r = podePublicar({ contagem: nada, temTecnico: true, status: "concluida" });
    expect(r?.motivo).toContain("Nenhum item foi aprovado");
  });

  it("recusa republicar uma certificação revogada sem refazer a inspeção", () => {
    const r = podePublicar({ contagem: completo, temTecnico: true, status: "revogada" });
    expect(r?.motivo).toContain("revogada");
  });
});

describe("frasedaVerificacao", () => {
  it("diz aprovados de total", () => {
    expect(frasedaVerificacao({ total: 34, aprovados: 34, naoAplicaveis: 0, pendentes: 0 })).toBe(
      "34 de 34 itens verificados",
    );
  });

  it("declara os não aplicáveis à parte, em vez de somá-los", () => {
    // "34/34" com 12 não aplicáveis é a mentira que este texto impede
    const frase = frasedaVerificacao({
      total: 34,
      aprovados: 22,
      naoAplicaveis: 12,
      pendentes: 0,
    });
    expect(frase).toContain("22 de 34");
    expect(frase).toContain("12 não aplicáveis");
    expect(frase).not.toContain("34 de 34");
  });

  it("usa singular quando é um item só", () => {
    expect(frasedaVerificacao({ total: 1, aprovados: 1, naoAplicaveis: 0, pendentes: 0 })).toBe(
      "1 de 1 item verificado",
    );
  });
});

describe("seloVisivel", () => {
  it("só o estado publicada mostra selo", () => {
    expect(seloVisivel("publicada")).toBe(true);
    for (const outro of [
      "sem_certificacao",
      "em_preparacao",
      "concluida",
      "revogada",
    ] as const) {
      expect(seloVisivel(outro), outro).toBe(false);
    }
  });

  it("seminovo legado, sem certificação, não recebe selo", () => {
    // o selo não é aplicado retroativamente a quem nunca foi inspecionado
    expect(seloVisivel("sem_certificacao")).toBe(false);
  });
});

describe("gerarCodigoPublico", () => {
  it("é opaco e não repete", () => {
    const a = gerarCodigoPublico();
    const b = gerarCodigoPublico();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(10);
  });

  it("não contém caractere que quebre uma URL", () => {
    for (let i = 0; i < 50; i++) {
      expect(gerarCodigoPublico()).toMatch(/^[A-Z0-9_-]+$/);
    }
  });
});
