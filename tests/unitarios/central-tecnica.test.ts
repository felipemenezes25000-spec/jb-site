import { describe, expect, it } from "vitest";

import {
  CORPO_MINIMO,
  dataEditorial,
  fraseDeAplicabilidade,
  impedimentoDePublicacao,
  slugDeArtigo,
  slugDisponivel,
  visivelAoPublico,
  type FatosDoArtigo,
} from "@/lib/central-tecnica";

/* ============================================================================
   Central Técnica

   O modo de falha que estes testes existem para impedir: um artigo sobre
   autoclave que não pressuriza, no ar, assinado por ninguém — ou pior,
   assinado por um nome que a JB inventou para o texto parecer conferido.
   ============================================================================ */

function fatos(parcial: Partial<FatosDoArtigo> = {}): FatosDoArtigo {
  return {
    temTitulo: true,
    tamanhoDoCorpo: 2000,
    autorId: "u1",
    revisorId: "u2",
    revisadoEm: new Date("2026-08-01T12:00:00Z"),
    fontes: 1,
    orientaConduta: true,
    ...parcial,
  };
}

describe("impedimentoDePublicacao", () => {
  it("artigo completo pode ir ao ar", () => {
    expect(impedimentoDePublicacao(fatos())).toBeNull();
  });

  it("sem autor não publica", () => {
    const r = impedimentoDePublicacao(fatos({ autorId: null }));
    expect(r?.falta.join(" ")).toContain("autor");
  });

  it("sem revisor não publica", () => {
    const r = impedimentoDePublicacao(fatos({ revisorId: null }));
    expect(r?.falta.join(" ")).toContain("revisor");
  });

  it("autor revisando o próprio texto não conta como revisão", () => {
    // é o atalho que todo prazo apertado sugere
    const r = impedimentoDePublicacao(fatos({ autorId: "u1", revisorId: "u1" }));
    expect(r?.falta.join(" ")).toContain("diferente do autor");
  });

  it("sem data de revisão não publica, mesmo com revisor escolhido", () => {
    const r = impedimentoDePublicacao(fatos({ revisadoEm: null }));
    expect(r?.falta.join(" ")).toContain("data");
  });

  it("artigo que orienta conduta exige fonte", () => {
    const r = impedimentoDePublicacao(fatos({ fontes: 0 }));
    expect(r?.falta.join(" ")).toContain("fonte");
  });

  it("artigo que não orienta conduta não exige fonte", () => {
    expect(impedimentoDePublicacao(fatos({ fontes: 0, orientaConduta: false }))).toBeNull();
  });

  it("corpo curto demais não é artigo", () => {
    const r = impedimentoDePublicacao(fatos({ tamanhoDoCorpo: CORPO_MINIMO - 1 }));
    expect(r?.falta.join(" ")).toContain("corpo");
  });

  it("lista TODAS as pendências, não a primeira", () => {
    // quem vai publicar precisa saber tudo que falta de uma vez
    const r = impedimentoDePublicacao(
      fatos({ temTitulo: false, autorId: null, revisorId: null, revisadoEm: null, fontes: 0 }),
    );
    expect(r?.falta.length).toBeGreaterThanOrEqual(5);
  });
});

describe("visivelAoPublico", () => {
  it("só publicado aparece no site", () => {
    expect(visivelAoPublico("publicado")).toBe(true);
    for (const estado of ["rascunho", "em_revisao", "arquivado"] as const) {
      expect(visivelAoPublico(estado), estado).toBe(false);
    }
  });
});

describe("fraseDeAplicabilidade", () => {
  it("sem modelo declarado NÃO vira 'serve para todos'", () => {
    // o erro que o escopo nomeia: generalizar um procedimento
    const frase = fraseDeAplicabilidade([]);
    expect(frase).toContain("não declara");
    expect(frase.toLowerCase()).not.toContain("todos os equipamentos podem");
  });

  it("um modelo aparece com a ressalva", () => {
    const frase = fraseDeAplicabilidade(["Cristófoli Vitale 21"]);
    expect(frase).toContain("Cristófoli Vitale 21");
    expect(frase).toContain("outro jeito");
  });

  it("vários modelos viram lista legível", () => {
    const frase = fraseDeAplicabilidade(["A", "B", "C"]);
    expect(frase).toContain("A, B e C");
  });

  it("entrada com espaço em branco não vira item vazio", () => {
    expect(fraseDeAplicabilidade(["  ", ""])).toContain("não declara");
  });
});

describe("dataEditorial", () => {
  it("revisão tem precedência sobre publicação", () => {
    const r = dataEditorial({
      publicadoEm: new Date("2026-01-01"),
      revisadoEm: new Date("2026-06-01"),
    });
    expect(r?.rotulo).toBe("Revisado em");
  });

  it("sem data real, devolve null — nada de 'hoje'", () => {
    // o escopo proíbe data de revisão recente gerada a cada build
    expect(dataEditorial({ publicadoEm: null, revisadoEm: null })).toBeNull();
  });
});

describe("slugDeArtigo", () => {
  it("tira acento, caixa e pontuação", () => {
    expect(slugDeArtigo("Autoclave não aquece: o que observar")).toBe(
      "autoclave-nao-aquece-o-que-observar",
    );
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(slugDeArtigo("  — teste —  ")).toBe("teste");
  });
});

describe("slugDisponivel", () => {
  it("recusa endereço que é rota da própria seção", () => {
    // um artigo com slug "busca" derrubaria a busca da Central
    expect(slugDisponivel("busca")).toBe(false);
    expect(slugDisponivel("tema")).toBe(false);
  });

  it("aceita slug normal", () => {
    expect(slugDisponivel("autoclave-nao-aquece")).toBe(true);
  });
});
