import { describe, expect, it } from "vitest";

import {
  ORDEM_POR_INTENCAO,
  consultaPodeSerMedida,
  detectarIntencao,
  normalizar,
  porQueEsteGrupo,
  termosDaBusca,
  validarConsulta,
} from "@/lib/busca/intencao";

/* ============================================================================
   Busca por intenção

   Os cinco exemplos do escopo estão aqui, um a um. E o modo de falha que os
   acompanha: interpretar toda busca como problema técnico, e assim bloquear
   quem só queria ver uma autoclave de 21 litros.
   ============================================================================ */

describe("detectarIntencao — os exemplos do escopo", () => {
  it("'autoclave 21 litros' é busca de produto", () => {
    expect(detectarIntencao("autoclave 21 litros", false)).toBe("produto");
  });

  it("'minha autoclave não aquece', com sessão, é sobre o equipamento da pessoa", () => {
    expect(detectarIntencao("minha autoclave não aquece", true)).toBe("meu_equipamento");
  });

  it("'compressor fazendo barulho' é sintoma", () => {
    expect(detectarIntencao("compressor fazendo barulho", false)).toBe("problema");
  });

  it("'manutenção preventiva autoclave' é serviço", () => {
    expect(detectarIntencao("manutenção preventiva autoclave", false)).toBe("servico");
  });

  it("'minha autoclave', com sessão, é o equipamento da pessoa", () => {
    expect(detectarIntencao("minha autoclave", true)).toBe("meu_equipamento");
  });
});

describe("detectarIntencao — os limites", () => {
  it("sem sessão, 'minha autoclave não aquece' vira sintoma", () => {
    // não há equipamento próprio a mostrar; o próximo palpite razoável é o
    // conteúdo técnico
    expect(detectarIntencao("minha autoclave não aquece", false)).toBe("problema");
  });

  it("acento não muda a interpretação", () => {
    expect(detectarIntencao("compressor com ruido", false)).toBe("problema");
    expect(detectarIntencao("compressor com ruído", false)).toBe("problema");
  });

  it("busca objetiva de produto NÃO é lida como problema", () => {
    // é o erro que o escopo nomeia
    for (const consulta of [
      "autoclave cristofoli",
      "compressor 40 litros",
      "caneta de alta rotação",
      "fotopolimerizador",
    ]) {
      expect(detectarIntencao(consulta, true), consulta).toBe("produto");
    }
  });
});

describe("ORDEM_POR_INTENCAO — intenção ordena, não filtra", () => {
  it("todos os grupos aparecem em toda intenção", () => {
    for (const [intencao, ordem] of Object.entries(ORDEM_POR_INTENCAO)) {
      expect(new Set(ordem).size, intencao).toBe(4);
    }
  });

  it("sintoma começa pelo conteúdo, mas o catálogo continua na lista", () => {
    expect(ORDEM_POR_INTENCAO.problema[0]).toBe("conteudo");
    expect(ORDEM_POR_INTENCAO.problema).toContain("produtos");
  });

  it("produto começa pelo catálogo", () => {
    expect(ORDEM_POR_INTENCAO.produto[0]).toBe("produtos");
  });
});

describe("porQueEsteGrupo", () => {
  it("explica a pertinência, e a explicação muda com a intenção", () => {
    const paraProblema = porQueEsteGrupo("conteudo", "problema");
    const paraProduto = porQueEsteGrupo("conteudo", "produto");
    expect(paraProblema).not.toBe(paraProduto);
    expect(paraProblema.length).toBeGreaterThan(20);
  });

  it("o grupo dos equipamentos próprios diz que a lista é só de quem busca", () => {
    expect(porQueEsteGrupo("meus_equipamentos", "meu_equipamento")).toContain("Só você");
  });
});

describe("termosDaBusca — sinônimos", () => {
  it("esterilizador também acha autoclave", () => {
    expect(termosDaBusca("esterilizador 21l")).toContain("autoclave 21l");
  });

  it("sugador também acha vácuo", () => {
    expect(termosDaBusca("sugador fraco")).toContain("vacuo fraco");
  });

  it("consulta sem sinônimo conhecido devolve só ela mesma", () => {
    expect(termosDaBusca("gnatus")).toEqual(["gnatus"]);
  });
});

describe("normalizar", () => {
  it("tira acento e caixa", () => {
    expect(normalizar("  Autoclave NÃO  aquece ")).toBe("autoclave nao aquece");
  });
});

describe("validarConsulta", () => {
  it("consulta vazia e consulta curta têm motivos diferentes", () => {
    const vazia = validarConsulta("");
    const curta = validarConsulta("au");
    expect(vazia.ok).toBe(false);
    expect(curta.ok).toBe(false);
    if (!vazia.ok && !curta.ok) {
      expect(vazia.motivo).toBe("vazia");
      expect(curta.motivo).toBe("curta");
    }
  });

  it("corta consulta longa demais em vez de recusar", () => {
    const r = validarConsulta("a".repeat(500));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.consulta.length).toBeLessThanOrEqual(80);
  });
});

describe("consultaPodeSerMedida", () => {
  it("busca comum pode virar evento", () => {
    expect(consultaPodeSerMedida("autoclave 21 litros")).toBe(true);
  });

  it("consulta com e-mail, CPF ou telefone é descartada inteira", () => {
    // mascarar deixaria o resto, e o resto costuma ser o que identifica
    for (const consulta of [
      "meu email fulano@clinica.com.br",
      "cpf 123.456.789-00",
      "(11) 98765-4321",
      "pedido 1234567890",
    ]) {
      expect(consultaPodeSerMedida(consulta), consulta).toBe(false);
    }
  });
});
