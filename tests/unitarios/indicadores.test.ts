import { describe, expect, it } from "vitest";

import {
  disponibilidadeDoParque,
  historicoDoParque,
  indiceDeManutencao,
  leituraDoIndice,
  MINIMO_DIAS_OBSERVADOS,
  type FatosDoEquipamento,
} from "@/lib/indicadores";

/* ============================================================================
   Indicadores

   O modo de falha que estes testes existem para impedir: uma clínica com três
   equipamentos cadastrados ontem vendo "100% de disponibilidade" e "índice:
   excelente". Os dois números seriam verdadeiros no sentido aritmético e
   mentirosos no sentido que importa — não há histórico nenhum por trás deles.
   ============================================================================ */

const DIA = 86_400_000;
const agora = new Date("2026-09-06T12:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * DIA);

describe("disponibilidadeDoParque — quando NÃO dá para calcular", () => {
  it("parque vazio não vira 100%", () => {
    const r = disponibilidadeDoParque({
      permanencias: [],
      paradas: [],
      inicio: diasAtras(365),
      fim: agora,
    });
    expect(r.calculavel).toBe(false);
  });

  it("equipamento cadastrado ontem não vira histórico", () => {
    // é o caso central: três aparelhos novos não sustentam um percentual
    const r = disponibilidadeDoParque({
      permanencias: [
        { equipmentId: "a", entrouEm: diasAtras(1), saiuEm: null },
        { equipmentId: "b", entrouEm: diasAtras(1), saiuEm: null },
        { equipmentId: "c", entrouEm: diasAtras(1), saiuEm: null },
      ],
      paradas: [],
      inicio: diasAtras(365),
      fim: agora,
    });
    expect(r.calculavel).toBe(false);
    if (!r.calculavel) {
      expect(r.motivo).toContain("histórico suficiente");
      expect(r.diasObservados).toBe(3);
    }
  });

  it("um dia a menos que o mínimo ainda não calcula", () => {
    const r = disponibilidadeDoParque({
      permanencias: [
        { equipmentId: "a", entrouEm: diasAtras(MINIMO_DIAS_OBSERVADOS - 1), saiuEm: null },
      ],
      paradas: [],
      inicio: diasAtras(365),
      fim: agora,
    });
    expect(r.calculavel).toBe(false);
  });

  it("período invertido é recusado", () => {
    const r = disponibilidadeDoParque({
      permanencias: [{ equipmentId: "a", entrouEm: diasAtras(400), saiuEm: null }],
      paradas: [],
      inicio: agora,
      fim: diasAtras(10),
    });
    expect(r.calculavel).toBe(false);
  });
});

describe("disponibilidadeDoParque — quando dá", () => {
  const umAnoDeUmEquipamento = {
    permanencias: [{ equipmentId: "a", entrouEm: diasAtras(365), saiuEm: null }],
    inicio: diasAtras(365),
    fim: agora,
  };

  it("sem parada nenhuma, 100%", () => {
    const r = disponibilidadeDoParque({ ...umAnoDeUmEquipamento, paradas: [] });
    expect(r.calculavel).toBe(true);
    if (r.calculavel) {
      expect(r.percentual).toBe(100);
      expect(r.equipamentos).toBe(1);
    }
  });

  it("conta dias-equipamento, não estado atual", () => {
    // 365 dias observados, 36,5 parados → 90%
    const r = disponibilidadeDoParque({
      ...umAnoDeUmEquipamento,
      paradas: [{ equipmentId: "a", inicio: diasAtras(100), fim: diasAtras(63.5) }],
    });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.percentual).toBeCloseTo(90, 0);
  });

  it("equipamento que entrou no meio contribui só com o tempo dele", () => {
    const r = disponibilidadeDoParque({
      permanencias: [
        { equipmentId: "a", entrouEm: diasAtras(365), saiuEm: null },
        { equipmentId: "b", entrouEm: diasAtras(100), saiuEm: null },
      ],
      paradas: [],
      inicio: diasAtras(365),
      fim: agora,
    });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.diasObservados).toBe(465);
  });

  it("equipamento que saiu do parque para de contribuir", () => {
    const r = disponibilidadeDoParque({
      permanencias: [{ equipmentId: "a", entrouEm: diasAtras(365), saiuEm: diasAtras(100) }],
      paradas: [],
      inicio: diasAtras(365),
      fim: agora,
    });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.diasObservados).toBe(265);
  });

  it("parada de equipamento fora do parque não entra no numerador", () => {
    // sem isso, o percentual poderia ficar negativo
    const r = disponibilidadeDoParque({
      ...umAnoDeUmEquipamento,
      paradas: [{ equipmentId: "fantasma", inicio: diasAtras(300), fim: diasAtras(10) }],
    });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.percentual).toBe(100);
  });

  it("nunca passa de 100 nem cai abaixo de 0", () => {
    const r = disponibilidadeDoParque({
      ...umAnoDeUmEquipamento,
      paradas: [{ equipmentId: "a", inicio: diasAtras(999), fim: null }],
    });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.percentual).toBeGreaterThanOrEqual(0);
    expect(r.percentual).toBeLessThanOrEqual(100);
  });

  it("devolve o período e a cobertura junto do número", () => {
    // o escopo exige mostrar período, cobertura e fórmula — não só o percentual
    const r = disponibilidadeDoParque({ ...umAnoDeUmEquipamento, paradas: [] });
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.diasObservados).toBeGreaterThan(0);
    expect(r.inicio).toBeInstanceOf(Date);
    expect(r.versao).toBeGreaterThan(0);
  });
});

describe("disponibilidadeDoParque — registro ausente não é ausência de parada", () => {
  const umAno = {
    permanencias: [{ equipmentId: "a", entrouEm: diasAtras(365), saiuEm: null }],
    inicio: diasAtras(365),
    fim: agora,
  };

  it("paradas nulas NUNCA viram 100%", () => {
    // "ninguém registrou" e "nada parou" produziriam o mesmo número se este
    // caso não existisse — e o número seria o melhor possível
    const r = disponibilidadeDoParque({ ...umAno, paradas: null });
    expect(r.calculavel).toBe(false);
    if (!r.calculavel) expect(r.motivo).toContain("incompleto");
  });

  it("lista vazia continua significando 'acompanhamos e nada parou'", () => {
    const r = disponibilidadeDoParque({ ...umAno, paradas: [] });
    expect(r.calculavel).toBe(true);
  });
});

describe("historicoDoParque", () => {
  const parado = (id: string, situacaoAtual: "operacional" | "inoperante" | "desativado") => ({
    equipmentId: id,
    entrouEm: diasAtras(365),
    situacaoAtual,
  });

  it("fecha a parada quando o equipamento volta a operar", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "operacional")],
      mudancas: [
        { equipmentId: "a", quando: diasAtras(50), situacao: "inoperante" },
        { equipmentId: "a", quando: diasAtras(40), situacao: "operacional" },
      ],
    });
    expect(r.paradas).not.toBeNull();
    expect(r.paradas).toHaveLength(1);
    expect(r.paradas?.[0]?.fim).toEqual(diasAtras(40));
  });

  it("parada ainda aberta fica sem fim", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "inoperante")],
      mudancas: [{ equipmentId: "a", quando: diasAtras(50), situacao: "inoperante" }],
    });
    expect(r.paradas?.[0]?.fim).toBeNull();
  });

  it("mudanças consecutivas de parada não abrem duas paradas", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "inoperante")],
      mudancas: [
        { equipmentId: "a", quando: diasAtras(50), situacao: "em_manutencao" },
        { equipmentId: "a", quando: diasAtras(45), situacao: "aguardando_peca" },
        { equipmentId: "a", quando: diasAtras(40), situacao: "inoperante" },
      ],
    });
    expect(r.paradas).toHaveLength(1);
    expect(r.paradas?.[0]?.inicio).toEqual(diasAtras(50));
  });

  it("desativado é saída do parque, não parada eterna", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "desativado")],
      mudancas: [{ equipmentId: "a", quando: diasAtras(30), situacao: "desativado" }],
    });
    expect(r.paradas).toHaveLength(0);
    expect(r.permanencias[0]?.saiuEm).toEqual(diasAtras(30));
  });

  it("evento antigo sem situação registrada invalida o histórico", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "operacional")],
      mudancas: [{ equipmentId: "a", quando: diasAtras(30), situacao: null }],
    });
    expect(r.paradas).toBeNull();
  });

  it("equipamento parado agora sem evento de parada invalida o histórico", () => {
    // é o buraco que mais engana: a parada existe e não entraria na conta
    const r = historicoDoParque({
      equipamentos: [parado("a", "inoperante")],
      mudancas: [],
    });
    expect(r.paradas).toBeNull();
  });

  it("equipamento operacional sem evento nenhum não invalida nada", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "operacional")],
      mudancas: [],
    });
    expect(r.paradas).toEqual([]);
    expect(r.permanencias).toHaveLength(1);
  });

  it("um equipamento com buraco invalida o parque inteiro", () => {
    // o percentual é do parque; um denominador certo com numerador furado
    // continua produzindo um número errado
    const r = historicoDoParque({
      equipamentos: [parado("a", "operacional"), parado("b", "inoperante")],
      mudancas: [{ equipmentId: "a", quando: diasAtras(30), situacao: "operacional" }],
    });
    expect(r.paradas).toBeNull();
  });

  it("ordena as mudanças antes de ler, mesmo fora de ordem", () => {
    const r = historicoDoParque({
      equipamentos: [parado("a", "operacional")],
      mudancas: [
        { equipmentId: "a", quando: diasAtras(40), situacao: "operacional" },
        { equipmentId: "a", quando: diasAtras(50), situacao: "inoperante" },
      ],
    });
    expect(r.paradas?.[0]?.inicio).toEqual(diasAtras(50));
  });
});

/* ------------------------------------------------ índice de manutenção */

function fatos(parcial: Partial<FatosDoEquipamento> = {}): FatosDoEquipamento {
  return {
    ultimaManutencao: diasAtras(100),
    proximaPreventiva: new Date(agora.getTime() + 80 * DIA),
    intervaloDias: 180,
    chamados12Meses: 0,
    desde: diasAtras(400),
    ...parcial,
  };
}

describe("indiceDeManutencao — quando NÃO dá para calcular", () => {
  it("sem periodicidade cadastrada não há o que estar em dia", () => {
    const r = indiceDeManutencao(fatos({ intervaloDias: null }), agora);
    expect(r.calculavel).toBe(false);
    if (!r.calculavel) expect(r.falta.join(" ")).toContain("periodicidade");
  });

  it("dado insuficiente NÃO vira nota 100", () => {
    // é a asserção central: "ninguém cadastrou" não pode virar "está tudo certo"
    const r = indiceDeManutencao(fatos({ intervaloDias: null, desde: null }), agora);
    expect(r.calculavel).toBe(false);
    expect(JSON.stringify(r)).not.toContain('"nota"');
  });

  it("diz o que falta, e não só que falta", () => {
    const r = indiceDeManutencao(fatos({ intervaloDias: 0, desde: null }), agora);
    if (r.calculavel) throw new Error("esperava não calculável");
    expect(r.falta.length).toBe(2);
  });
});

describe("indiceDeManutencao — quando dá", () => {
  it("preventiva em dia e sem chamados dá nota alta", () => {
    const r = indiceDeManutencao(fatos(), agora);
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.nota).toBe(100);
  });

  it("preventiva vencida derruba a nota proporcionalmente ao ciclo", () => {
    const vencida = indiceDeManutencao(
      fatos({ proximaPreventiva: diasAtras(90), intervaloDias: 180 }),
      agora,
    );
    if (!vencida.calculavel) throw new Error("esperava calculável");
    // metade de um ciclo de atraso: o fator cai à metade
    const fator = vencida.fatores.find((f) => f.nome === "Preventiva em dia");
    expect(fator?.nota).toBeCloseTo(0.5, 1);
  });

  it("o mesmo atraso pesa mais num ciclo curto", () => {
    const anual = indiceDeManutencao(
      fatos({ proximaPreventiva: diasAtras(60), intervaloDias: 365 }),
      agora,
    );
    const trimestral = indiceDeManutencao(
      fatos({ proximaPreventiva: diasAtras(60), intervaloDias: 90 }),
      agora,
    );
    if (!anual.calculavel || !trimestral.calculavel) throw new Error("esperava calculável");
    expect(trimestral.nota).toBeLessThan(anual.nota);
  });

  it("chamados recorrentes derrubam a nota", () => {
    const zero = indiceDeManutencao(fatos({ chamados12Meses: 0 }), agora);
    const tres = indiceDeManutencao(fatos({ chamados12Meses: 3 }), agora);
    if (!zero.calculavel || !tres.calculavel) throw new Error("esperava calculável");
    expect(tres.nota).toBeLessThan(zero.nota);
  });

  it("equipamento recente sem manutenção não é penalizado como um antigo", () => {
    const recente = indiceDeManutencao(
      fatos({ ultimaManutencao: null, desde: diasAtras(60) }),
      agora,
    );
    const antigo = indiceDeManutencao(
      fatos({ ultimaManutencao: null, desde: diasAtras(900) }),
      agora,
    );
    if (!recente.calculavel || !antigo.calculavel) throw new Error("esperava calculável");
    expect(recente.nota).toBeGreaterThan(antigo.nota);
  });

  it("entrega os fatores para a tela poder explicar o resultado", () => {
    // o escopo exige "Como calculamos" e acesso aos fatos que influenciaram
    const r = indiceDeManutencao(fatos(), agora);
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.fatores.length).toBe(3);
    for (const fator of r.fatores) {
      expect(fator.observado.length).toBeGreaterThan(5);
      expect(fator.peso).toBeGreaterThan(0);
    }
  });

  it("a nota fica entre 0 e 100", () => {
    const pior = indiceDeManutencao(
      fatos({
        proximaPreventiva: diasAtras(9999),
        chamados12Meses: 99,
        ultimaManutencao: null,
        desde: diasAtras(2000),
      }),
      agora,
    );
    if (!pior.calculavel) throw new Error("esperava calculável");
    expect(pior.nota).toBeGreaterThanOrEqual(0);
    expect(pior.nota).toBeLessThanOrEqual(100);
  });
});

describe("leituraDoIndice", () => {
  it("fala de manutenção, nunca de segurança ou de risco", () => {
    for (const nota of [0, 30, 60, 85, 100]) {
      const texto = leituraDoIndice(nota).toLowerCase();
      expect(texto).toContain("manutenção");
      for (const proibido of ["seguro", "risco", "bom estado", "saudável"]) {
        expect(texto, `nota ${nota}`).not.toContain(proibido);
      }
    }
  });
});
