import { describe, expect, it } from "vitest";

import {
  unificarHistorico,
  type CandidatoDoHistorico,
} from "@/domain/equipamento/linha-do-tempo";

/**
 * Uma coisa que aconteceu ocupa uma linha.
 *
 * A auditoria abriu a ficha de um equipamento com três chamados e contou seis
 * acontecimentos: cada chamado aparecia como chamado E como evento "Chamado
 * JB-000012 aberto", com o mesmo minuto e o mesmo texto. Num prontuário
 * técnico isso não é ruído de layout — frequência de manutenção é exatamente o
 * que se lê ali, e a ficha dizia o dobro do que aconteceu.
 */

const EM = (iso: string) => new Date(iso);

function evento(
  parcial: Partial<CandidatoDoHistorico> & Pick<CandidatoDoHistorico, "referencia" | "tipo">,
): CandidatoDoHistorico {
  return {
    id: `evento-${parcial.referencia}-${parcial.quando?.toISOString() ?? "x"}`,
    titulo: "",
    descricao: "",
    quando: EM("2026-09-01T10:00:00Z"),
    preferida: false,
    ...parcial,
  };
}

describe("unificarHistorico", () => {
  it("colapsa o evento e o registro de que ele fala numa linha só", () => {
    const linhas = unificarHistorico([
      evento({
        tipo: "chamado",
        referencia: "chm1",
        titulo: "Chamado JB-000012 aberto",
        descricao: "Autoclave não fecha o ciclo.",
        quando: EM("2026-09-03T14:00:00Z"),
      }),
      evento({
        tipo: "chamado",
        referencia: "chm1",
        preferida: true,
        titulo: "Chamado JB-000012",
        descricao: "Autoclave não fecha o ciclo.",
        quando: EM("2026-09-03T14:00:00Z"),
        etiqueta: "Em atendimento",
        href: "/minha-jb/assistencia/chm1",
      }),
    ]);

    expect(linhas).toHaveLength(1);
    /* E quem fica é a linha do REGISTRO: ela tem estado e destino. Ficar com a
       do evento seria trocar informação por simetria. */
    expect(linhas[0].titulo).toBe("Chamado JB-000012");
    expect(linhas[0].etiqueta).toBe("Em atendimento");
    expect(linhas[0].href).toBe("/minha-jb/assistencia/chm1");
  });

  it("ancora a linha no momento mais recente do grupo", () => {
    /* Uma OS aberta em 3/9 e concluída em 11/9 é uma coisa só que andou até o
       dia 11. Ancorá-la na abertura mostraria a etiqueta "Concluída" numa data
       em que ela não estava concluída. */
    const linhas = unificarHistorico([
      evento({
        tipo: "os",
        referencia: "os1",
        preferida: true,
        titulo: "Ordem de serviço 000034",
        descricao: "Resistência substituída.",
        quando: EM("2026-09-03T09:00:00Z"),
        etiqueta: "Concluída",
      }),
      evento({
        tipo: "os",
        referencia: "os1",
        titulo: "OS 000034 aberta",
        quando: EM("2026-09-03T09:00:00Z"),
      }),
      evento({
        tipo: "os",
        referencia: "os1",
        titulo: "OS 000034 concluída",
        quando: EM("2026-09-11T17:30:00Z"),
      }),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].titulo).toBe("Ordem de serviço 000034");
    expect(linhas[0].quando.toISOString()).toBe("2026-09-11T17:30:00.000Z");
  });

  it("não perde o texto do evento quando o registro veio sem descrição", () => {
    const linhas = unificarHistorico([
      evento({
        tipo: "visita",
        referencia: "v1",
        preferida: true,
        titulo: "Manutenção preventiva",
        descricao: "   ",
        quando: EM("2026-09-05T08:00:00Z"),
      }),
      evento({
        tipo: "visita",
        referencia: "v1",
        titulo: "Manutenção preventiva realizada",
        descricao: "Trocado o filtro e calibrada a válvula.",
        quando: EM("2026-09-05T08:00:00Z"),
      }),
    ]);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].descricao).toBe("Trocado o filtro e calibrada a válvula.");
  });

  it("não junta coisas diferentes que por acaso são do mesmo tipo", () => {
    const linhas = unificarHistorico([
      evento({ tipo: "chamado", referencia: "chm1", preferida: true, titulo: "Chamado A" }),
      evento({ tipo: "chamado", referencia: "chm2", preferida: true, titulo: "Chamado B" }),
    ]);

    expect(linhas).toHaveLength(2);
  });

  it("não junta um chamado e uma OS que tenham o mesmo id", () => {
    /* A chave é (origem, referência). Só a referência não basta: os ids são
       independentes entre tabelas e colidir por acaso apagaria um dos dois. */
    const linhas = unificarHistorico([
      evento({ tipo: "chamado", referencia: "mesmo-id", preferida: true, titulo: "Chamado" }),
      evento({ tipo: "os", referencia: "mesmo-id", preferida: true, titulo: "OS" }),
    ]);

    expect(linhas).toHaveLength(2);
  });

  it("mantém eventos soltos, que referenciam a si mesmos", () => {
    const linhas = unificarHistorico([
      evento({
        tipo: "evento",
        referencia: "ev1",
        titulo: "Equipamento cadastrado",
        quando: EM("2026-08-01T10:00:00Z"),
      }),
      evento({
        tipo: "evento",
        referencia: "ev2",
        titulo: "Situação: em manutenção",
        quando: EM("2026-09-09T10:00:00Z"),
      }),
    ]);

    expect(linhas.map((linha) => linha.titulo)).toEqual([
      "Situação: em manutenção",
      "Equipamento cadastrado",
    ]);
  });

  it("devolve a linha do tempo do mais recente para o mais antigo", () => {
    const linhas = unificarHistorico([
      evento({ tipo: "evento", referencia: "a", quando: EM("2026-09-01T10:00:00Z") }),
      evento({ tipo: "evento", referencia: "b", quando: EM("2026-09-20T10:00:00Z") }),
      evento({ tipo: "evento", referencia: "c", quando: EM("2026-09-10T10:00:00Z") }),
    ]);

    const datas = linhas.map((linha) => linha.quando.getTime());
    expect(datas).toEqual([...datas].sort((a, b) => b - a));
  });

  it("não vaza os campos de controle para a tela", () => {
    const [linha] = unificarHistorico([
      evento({ tipo: "evento", referencia: "a", titulo: "Nota" }),
    ]);

    expect(linha).not.toHaveProperty("referencia");
    expect(linha).not.toHaveProperty("preferida");
  });
});
