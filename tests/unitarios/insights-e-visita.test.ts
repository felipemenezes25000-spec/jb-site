import { describe, expect, it } from "vitest";

import {
  DEFINICOES,
  MINIMO_DE_CLINICAS,
  comVolumeMinimo,
  definicaoDe,
  mediana,
  podePublicarAgregado,
} from "@/lib/insights";
import {
  AVISO_DA_SUGESTAO,
  apresentarSugestao,
  checklistDaVisita,
  conflitosComOHistorico,
  type ContextoDaVisita,
} from "@/lib/preparo-da-visita";

/* ============================================================================
   Indicadores e preparo da visita

   Os dois modos de falha: um painel que ordena marcas por número de chamados
   e é lido como ranking de qualidade; e um resumo automático que vira
   diagnóstico no caminho até o técnico.
   ============================================================================ */

const agora = new Date("2026-09-06T12:00:00Z");
const DIA = 86_400_000;
const diasAtras = (n: number) => new Date(agora.getTime() - n * DIA);

/* ---------------------------------------------------------- indicadores */

describe("DEFINICOES", () => {
  it("todo indicador declara janela, população e o que NÃO conclui", () => {
    for (const definicao of DEFINICOES) {
      expect(definicao.janela.length, definicao.chave).toBeGreaterThan(10);
      expect(definicao.populacao.length, definicao.chave).toBeGreaterThan(10);
      expect(definicao.naoConclui.length, definicao.chave).toBeGreaterThan(20);
      expect(definicao.exclusoes.length, definicao.chave).toBeGreaterThan(0);
      expect(definicao.volumeMinimo, definicao.chave).toBeGreaterThan(0);
    }
  });

  it("chamados por modelo nega ser taxa de falha e ranking de marca", () => {
    // a frase do escopo, virada em teste
    const definicao = definicaoDe("chamados_por_modelo");
    const texto = definicao?.naoConclui.toLowerCase() ?? "";
    expect(texto).toContain("taxa de falha");
    expect(texto).toContain("exposição comparável");
  });

  it("intervalo entre intervenções nega ser MTBF e vida útil", () => {
    const definicao = definicaoDe("intervalo_entre_intervencoes");
    const texto = definicao?.naoConclui.toLowerCase() ?? "";
    expect(texto).toContain("mtbf");
    expect(texto).toContain("vida útil");
  });

  it("preventivas vencidas explicita que o denominador exclui quem não tem plano", () => {
    const definicao = definicaoDe("preventivas_vencidas");
    expect(definicao?.naoConclui).toContain("denominador");
  });

  it("tempo até decisão declara o viés de excluir os em aberto", () => {
    const definicao = definicaoDe("tempo_ate_decisao");
    expect(definicao?.naoConclui.toLowerCase()).toContain("enviesa");
  });
});

describe("comVolumeMinimo", () => {
  const linhas = [{ rotulo: "Autoclave X", valor: 5, unidade: "chamados" }];

  it("abaixo do mínimo NÃO há número", () => {
    const r = comVolumeMinimo("chamados_por_modelo", linhas, 3);
    expect(r.suficiente).toBe(false);
    if (!r.suficiente) expect(r.motivo).toContain("Ainda não há dados suficientes");
  });

  it("acima do mínimo, entrega as linhas", () => {
    const r = comVolumeMinimo("chamados_por_modelo", linhas, 50);
    expect(r.suficiente).toBe(true);
  });

  it("indicador desconhecido cai num mínimo próprio em vez de passar direto", () => {
    const r = comVolumeMinimo("inventado", linhas, 2);
    expect(r.suficiente).toBe(false);
  });
});

describe("podePublicarAgregado", () => {
  it("poucas clínicas permitem deduzir de quem é o dado", () => {
    const r = podePublicarAgregado({ clinicas: 2, maiorFatia: 0.3 });
    expect(r.pode).toBe(false);
    if (!r.pode) expect(r.motivo).toContain("deduzir");
  });

  it("uma clínica dominando o agregado é o dado dela com outro nome", () => {
    const r = podePublicarAgregado({ clinicas: MINIMO_DE_CLINICAS + 5, maiorFatia: 0.8 });
    expect(r.pode).toBe(false);
    if (!r.pode) expect(r.motivo).toContain("metade");
  });

  it("agregado distribuído e com clínicas suficientes pode sair", () => {
    expect(podePublicarAgregado({ clinicas: 12, maiorFatia: 0.2 }).pode).toBe(true);
  });
});

describe("mediana", () => {
  it("um valor extremo não desloca a mediana como deslocaria a média", () => {
    // é o motivo de o intervalo entre intervenções usar mediana
    expect(mediana([10, 12, 14, 1000])).toBe(13);
  });

  it("lista vazia devolve null, não zero", () => {
    expect(mediana([])).toBeNull();
  });
});

/* ------------------------------------------------------ preparo da visita */

function contexto(parcial: Partial<ContextoDaVisita> = {}): ContextoDaVisita {
  return {
    situacao: "operacional",
    garantiaVigente: false,
    pecasSelecionadas: [],
    chamados12Meses: 0,
    temMidia: false,
    temSerial: true,
    ...parcial,
  };
}

describe("checklistDaVisita", () => {
  it("todo item diz por que entrou na lista", () => {
    for (const item of checklistDaVisita(contexto({ temMidia: true, chamados12Meses: 3 }))) {
      expect(item.porque.length, item.texto).toBeGreaterThan(15);
    }
  });

  it("sem peça separada, diz isso em vez de omitir a linha", () => {
    const itens = checklistDaVisita(contexto());
    expect(itens[0].texto).toContain("Nenhuma peça");
  });

  it("reincidência entra como item, e não como conclusão", () => {
    const itens = checklistDaVisita(contexto({ chamados12Meses: 3 }));
    const item = itens.find((linha) => linha.texto.includes("chamados em 12 meses"));
    expect(item?.porque).toContain("investigar a causa");
  });

  it("garantia vigente vira alerta antes de orçar", () => {
    const itens = checklistDaVisita(contexto({ garantiaVigente: true }));
    expect(itens.some((item) => item.texto.includes("garantia"))).toBe(true);
  });

  it("equipamento sem série pede o registro da série", () => {
    const itens = checklistDaVisita(contexto({ temSerial: false }));
    expect(itens.some((item) => item.texto.includes("número de série"))).toBe(true);
  });
});

describe("conflitosComOHistorico", () => {
  const historico = [
    {
      numero: "OS-001842",
      quando: diasAtras(60),
      diagnostico: "Resistência aberta, autoclave não aquecia acima de 60 graus",
    },
  ];

  it("relato parecido com atendimento recente vira alerta", () => {
    const conflitos = conflitosComOHistorico(
      "A autoclave voltou a não aquecer, não passa de 60 graus",
      historico,
      agora,
    );
    expect(conflitos.length).toBe(1);
    expect(conflitos[0].anterior.numero).toBe("OS-001842");
  });

  it("o alerta diz que reincidência não é diagnóstico", () => {
    const [conflito] = conflitosComOHistorico(
      "autoclave voltou a não aquecer, não passa de 60 graus",
      historico,
      agora,
    );
    expect(conflito.texto).toContain("não é");
    expect(conflito.texto).toContain("diagnóstico");
  });

  it("relato de outro sintoma não gera alerta falso", () => {
    const conflitos = conflitosComOHistorico(
      "O compressor está vibrando muito",
      historico,
      agora,
    );
    expect(conflitos).toEqual([]);
  });

  it("atendimento de mais de um ano atrás não conta", () => {
    const conflitos = conflitosComOHistorico(
      "autoclave não aquece, não passa de 60 graus",
      [{ ...historico[0], quando: diasAtras(500) }],
      agora,
    );
    expect(conflitos).toEqual([]);
  });

  it("relato curto demais não produz coincidência", () => {
    expect(conflitosComOHistorico("nada", historico, agora)).toEqual([]);
  });
});

describe("apresentarSugestao", () => {
  it("sem sugestão gerada, não há o que mostrar", () => {
    const r = apresentarSugestao(null);
    expect(r.mostrar).toBe(false);
  });

  it("sugestão sem registro que a sustente NÃO é mostrada", () => {
    // palpite com aparência de análise, num contexto em que alguém vai agir
    const r = apresentarSugestao({ texto: "Trocar a resistência", mecanismo: "x", baseadaEm: [] });
    expect(r.mostrar).toBe(false);
    if (!r.mostrar) expect(r.motivo).toContain("base conferível");
  });

  it("sugestão com base sai marcada como interna e não confirmada", () => {
    const r = apresentarSugestao({
      texto: "Verificar a resistência",
      mecanismo: "regras",
      baseadaEm: ["OS-001842"],
    });
    expect(r.mostrar).toBe(true);
    if (r.mostrar) {
      expect(r.aviso).toBe(AVISO_DA_SUGESTAO);
      expect(r.aviso.toLowerCase()).toContain("não é diagnóstico");
      expect(r.aviso.toLowerCase()).toContain("não aparece para o cliente");
    }
  });
});
