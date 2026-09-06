import { describe, expect, it } from "vitest";

import {
  creditoDaImagem,
  impedimentoDeUsoPublico,
  podeUsarPublicamente,
} from "@/lib/acervo";
import {
  CARENCIA_APOS_CONCLUSAO_DIAS,
  INTERVALO_ENTRE_CONVITES_DIAS,
  MINIMO_DE_RESPOSTAS,
  impedimentoDeDepoimento,
  motivoDeInelegibilidade,
  satisfacaoInterna,
  type CandidatoAConvite,
} from "@/lib/avaliacoes";
import { fraseDeDuracao, impedimentoDoCase, type FatosDoCase } from "@/lib/cases";

/* ============================================================================
   Acervo, avaliações e cases

   Os três modos de falha cobertos aqui têm a mesma forma: publicar em nome de
   alguém que não autorizou. Uma foto de pessoa sem consentimento, um
   depoimento de quem só respondeu uma pesquisa, um case de uma clínica que
   nunca soube que virou exemplo.
   ============================================================================ */

const DIA = 86_400_000;
const agora = new Date("2026-09-06T12:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * DIA);

/* ------------------------------------------------------------- acervo */

describe("impedimentoDeUsoPublico", () => {
  const base = { temPessoa: false, autorizadaEm: null, alt: "Bancada da oficina" };

  it("imagem sem pessoa e com alt pode ser publicada", () => {
    expect(impedimentoDeUsoPublico(base)).toBeNull();
  });

  it("pessoa identificável sem autorização registrada bloqueia", () => {
    // é a regra central: consentimento não se presume
    expect(impedimentoDeUsoPublico({ ...base, temPessoa: true })).toBe("sem_autorizacao");
  });

  it("pessoa identificável com autorização passa", () => {
    expect(
      podeUsarPublicamente({ ...base, temPessoa: true, autorizadaEm: diasAtras(10) }),
    ).toBe(true);
  });

  it("sem texto alternativo não vai ao ar", () => {
    expect(impedimentoDeUsoPublico({ ...base, alt: "  " })).toBe("sem_texto_alternativo");
  });
});

describe("creditoDaImagem", () => {
  it("sem crédito registrado, não inventa autoria", () => {
    expect(creditoDaImagem("")).toBeNull();
    expect(creditoDaImagem(null)).toBeNull();
    expect(creditoDaImagem("Ana")).toBe("Foto: Ana");
  });
});

/* -------------------------------------------------------- convites */

function candidato(parcial: Partial<CandidatoAConvite> = {}): CandidatoAConvite {
  return {
    concluida: true,
    concluidaEm: diasAtras(30),
    jaTemConvite: false,
    ultimoConviteAoCliente: null,
    temEmail: true,
    ...parcial,
  };
}

describe("motivoDeInelegibilidade", () => {
  it("transação concluída há tempo suficiente é elegível", () => {
    expect(motivoDeInelegibilidade(candidato(), agora)).toBeNull();
  });

  it("transação em andamento não gera convite", () => {
    expect(motivoDeInelegibilidade(candidato({ concluida: false }), agora)).toBe(
      "nao_concluida",
    );
  });

  it("respeita a carência depois da conclusão", () => {
    const recente = candidato({ concluidaEm: diasAtras(CARENCIA_APOS_CONCLUSAO_DIAS - 1) });
    expect(motivoDeInelegibilidade(recente, agora)).toBe("carencia");
  });

  it("não convida o mesmo cliente duas vezes em intervalo curto", () => {
    const r = motivoDeInelegibilidade(
      candidato({ ultimoConviteAoCliente: diasAtras(INTERVALO_ENTRE_CONVITES_DIAS - 1) }),
      agora,
    );
    expect(r).toBe("convite_recente");
  });

  it("passado o intervalo, volta a ser elegível", () => {
    const r = motivoDeInelegibilidade(
      candidato({ ultimoConviteAoCliente: diasAtras(INTERVALO_ENTRE_CONVITES_DIAS + 1) }),
      agora,
    );
    expect(r).toBeNull();
  });

  it("deduplica por transação", () => {
    expect(motivoDeInelegibilidade(candidato({ jaTemConvite: true }), agora)).toBe(
      "ja_convidado",
    );
  });

  it("sem e-mail não há convite", () => {
    expect(motivoDeInelegibilidade(candidato({ temEmail: false }), agora)).toBe("sem_contato");
  });

  it("a função não recebe nota, valor nem histórico", () => {
    // a asserção é sobre o TIPO: filtrar convite por satisfação prevista é o
    // que o escopo proíbe, e a forma de garantir é não haver por onde
    const campos = Object.keys(candidato());
    expect(campos).toEqual([
      "concluida",
      "concluidaEm",
      "jaTemConvite",
      "ultimoConviteAoCliente",
      "temEmail",
    ]);
  });
});

/* ------------------------------------------------------ depoimento */

describe("impedimentoDeDepoimento", () => {
  const base = {
    nota: 5,
    comentario: "Atenderam no mesmo dia e explicaram o que estava acontecendo.",
    autorizou: true,
    curado: true,
  };

  it("resposta autorizada, com texto e curada, pode virar depoimento", () => {
    expect(impedimentoDeDepoimento(base)).toBeNull();
  });

  it("sem autorização não vira depoimento, mesmo com nota alta", () => {
    expect(impedimentoDeDepoimento({ ...base, autorizou: false })).toBe("sem_autorizacao");
  });

  it("nota baixa com autorização É publicável", () => {
    // curadoria não é filtro de elogio
    expect(impedimentoDeDepoimento({ ...base, nota: 2 })).toBeNull();
  });

  it("nota sem comentário não é depoimento", () => {
    expect(impedimentoDeDepoimento({ ...base, comentario: "ok" })).toBe("sem_texto");
  });

  it("sem curadoria não publica", () => {
    expect(impedimentoDeDepoimento({ ...base, curado: false })).toBe("sem_curadoria");
  });
});

describe("satisfacaoInterna", () => {
  it("poucas respostas não viram média publicável", () => {
    const r = satisfacaoInterna([5, 5, 4]);
    expect(r.calculavel).toBe(false);
  });

  it("com respostas suficientes, calcula e diz quantas", () => {
    const notas = Array.from({ length: MINIMO_DE_RESPOSTAS }, () => 4);
    const r = satisfacaoInterna(notas);
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.media).toBe(4);
    expect(r.respostas).toBe(MINIMO_DE_RESPOSTAS);
  });

  it("descarta nota fora da escala em vez de deixá-la torcer a média", () => {
    const notas = [...Array.from({ length: MINIMO_DE_RESPOSTAS }, () => 4), 99, 0];
    const r = satisfacaoInterna(notas);
    if (!r.calculavel) throw new Error("esperava calculável");
    expect(r.respostas).toBe(MINIMO_DE_RESPOSTAS);
  });
});

/* ------------------------------------------------------------ cases */

function fatosDoCase(parcial: Partial<FatosDoCase> = {}): FatosDoCase {
  return {
    temTitulo: true,
    temSintoma: true,
    temDiagnostico: true,
    temIntervencao: true,
    temTesteFinal: true,
    tecnicoId: "t1",
    revisorId: "t2",
    revisadoEm: diasAtras(2),
    autorizadoPeloCliente: true,
    ...parcial,
  };
}

describe("impedimentoDoCase", () => {
  it("case completo e autorizado pode ir ao ar", () => {
    expect(impedimentoDoCase(fatosDoCase())).toBeNull();
  });

  it("sem autorização do cliente NÃO publica, mesmo completo e revisado", () => {
    // é a regra central: o vínculo com a OS prova, mas não autoriza
    const r = impedimentoDoCase(fatosDoCase({ autorizadoPeloCliente: false }));
    expect(r?.falta.join(" ")).toContain("autorização do cliente");
  });

  it("sem diagnóstico confirmado não publica", () => {
    const r = impedimentoDoCase(fatosDoCase({ temDiagnostico: false }));
    expect(r?.falta.join(" ")).toContain("diagnóstico confirmado");
  });

  it("quem executou não pode ser quem revisa", () => {
    const r = impedimentoDoCase(fatosDoCase({ tecnicoId: "t1", revisorId: "t1" }));
    expect(r?.falta.join(" ")).toContain("diferente de quem executou");
  });

  it("lista todas as pendências de uma vez", () => {
    const r = impedimentoDoCase(
      fatosDoCase({
        temTitulo: false,
        temSintoma: false,
        tecnicoId: null,
        revisorId: null,
        revisadoEm: null,
        autorizadoPeloCliente: false,
      }),
    );
    expect(r?.falta.length).toBeGreaterThanOrEqual(6);
  });
});

describe("fraseDeDuracao", () => {
  it("sem tempo registrado, não inventa 'rapidamente'", () => {
    expect(fraseDeDuracao("")).toBeNull();
    expect(fraseDeDuracao("  ")).toBeNull();
    expect(fraseDeDuracao("2 dias úteis")).toBe("2 dias úteis");
  });
});
