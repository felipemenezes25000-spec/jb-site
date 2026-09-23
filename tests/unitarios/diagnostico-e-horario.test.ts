import { describe, expect, it } from "vitest";

import {
  EQUIPAMENTOS,
  MENSAGEM_PADRAO,
  montarMensagem,
  toquesDados,
} from "@/lib/diagnostico";
import { lerExpediente, situacaoDoAtendimento } from "@/lib/horario-atendimento";

/* ============================================================================
   Diagnóstico em 3 toques e selo de horário

   O que estes testes protegem:

   - a mensagem que vai para o WhatsApp só diz o que a pessoa escolheu. Um
     defeito que não pertence ao equipamento (resto de uma escolha anterior)
     não pode aparecer, e a cidade digitada não carrega quebra de linha;
   - o selo de horário só aparece quando o horário configurado foi
     entendido, e sempre no fuso de São Paulo, qualquer que seja o do aparelho.
   ============================================================================ */

describe("montarMensagem", () => {
  it("sem equipamento, manda a mensagem padrão", () => {
    expect(montarMensagem({})).toBe(MENSAGEM_PADRAO);
  });

  it("escreve só as linhas escolhidas, com o negrito do WhatsApp", () => {
    const texto = montarMensagem({
      equipamento: "autoclave",
      defeito: "Não pressuriza",
      situacao: "parado",
      cidade: "  Osasco \n",
    });

    expect(texto.split("\n")).toEqual([
      "Olá, JB! Vim pelo site e preciso de assistência técnica.",
      "",
      "*Equipamento:* Autoclave",
      "*Problema:* Não pressuriza",
      "*Situação:* está parado e não consigo atender",
      "*Cidade:* Osasco",
    ]);
  });

  it("ignora defeito que não é do equipamento escolhido", () => {
    const texto = montarMensagem({ equipamento: "compressor", defeito: "Não pressuriza" });
    expect(texto).not.toContain("Problema");
    expect(toquesDados({ equipamento: "compressor", defeito: "Não pressuriza" })).toBe(1);
  });

  it("corta cidade longa demais", () => {
    const texto = montarMensagem({ equipamento: "outro", cidade: "x".repeat(200) });
    expect(texto).toContain(`*Cidade:* ${"x".repeat(60)}`);
    expect(texto).not.toContain("x".repeat(61));
  });

  it("todo equipamento tem defeitos e nome únicos", () => {
    const ids = new Set(EQUIPAMENTOS.map((equipamento) => equipamento.id));
    expect(ids.size).toBe(EQUIPAMENTOS.length);
    for (const equipamento of EQUIPAMENTOS) {
      expect(equipamento.defeitos.length).toBeGreaterThan(0);
      expect(new Set(equipamento.defeitos).size).toBe(equipamento.defeitos.length);
    }
  });
});

describe("toquesDados", () => {
  it("conta equipamento, problema e situação, nessa ordem", () => {
    expect(toquesDados({})).toBe(0);
    expect(toquesDados({ equipamento: "autoclave" })).toBe(1);
    expect(toquesDados({ equipamento: "autoclave", defeito: "Não esquenta" })).toBe(2);
    expect(
      toquesDados({ equipamento: "autoclave", defeito: "Não esquenta", situacao: "revisao" }),
    ).toBe(3);
  });
});

describe("lerExpediente", () => {
  it("entende o horário padrão da JB", () => {
    expect(lerExpediente("Segunda a sexta, das 8h às 18h30")).toEqual({
      dias: [1, 2, 3, 4, 5],
      abre: 8 * 60,
      fecha: 18 * 60 + 30,
    });
  });

  it("aceita '-feira' e dois-pontos", () => {
    expect(lerExpediente("Segunda-feira a sábado, 08:00 às 12:00")).toEqual({
      dias: [1, 2, 3, 4, 5, 6],
      abre: 8 * 60,
      fecha: 12 * 60,
    });
  });

  it("devolve null quando não entende, em vez de chutar", () => {
    expect(lerExpediente("")).toBeNull();
    expect(lerExpediente("Horário comercial")).toBeNull();
    expect(lerExpediente("Segunda a sexta")).toBeNull();
    expect(lerExpediente("Segunda a sexta, das 18h às 8h")).toBeNull();
  });
});

describe("situacaoDoAtendimento", () => {
  const HORARIO = "Segunda a sexta, das 8h às 18h30";
  // Horários em UTC; São Paulo é UTC-3.
  const quarta10h = new Date("2026-09-23T13:00:00Z");
  const quarta7h = new Date("2026-09-23T10:00:00Z");
  const quarta19h = new Date("2026-09-23T22:00:00Z");
  const sexta20h = new Date("2026-09-25T23:00:00Z");

  it("no horário, diz que está atendendo e até quando", () => {
    expect(situacaoDoAtendimento(HORARIO, quarta10h)).toEqual({
      aberto: true,
      texto: "Em expediente até 18h30",
    });
  });

  it("antes de abrir, avisa que abre hoje", () => {
    expect(situacaoDoAtendimento(HORARIO, quarta7h)).toEqual({
      aberto: false,
      texto: "Expediente começa hoje às 8h",
    });
  });

  it("depois de fechar, aponta o próximo dia útil", () => {
    expect(situacaoDoAtendimento(HORARIO, quarta19h)?.texto).toBe(
      "Expediente volta amanhã às 8h",
    );
    expect(situacaoDoAtendimento(HORARIO, sexta20h)?.texto).toBe(
      "Expediente volta segunda às 8h",
    );
  });

  it("horário ilegível não vira selo", () => {
    expect(situacaoDoAtendimento("Ligue para combinar", quarta10h)).toBeNull();
  });
});
