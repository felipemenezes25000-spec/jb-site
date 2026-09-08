import { describe, expect, it } from "vitest";

import { chaveDeNome, mapaDeSinonimos, unificarPorNome } from "@/lib/homonimos";

/**
 * O catálogo tem duas categorias "Biossegurança" e duas marcas "Schuster",
 * herdadas de cargas diferentes. Para quem visita, isso é uma escolha partida
 * em duas — e escolher a errada leva a uma prateleira vazia.
 *
 * O que estes testes protegem não é o agrupamento em si: é o LIMITE dele.
 * Juntar demais seria pior do que não juntar, porque esconderia produto do
 * catálogo sem ninguém perceber.
 */
describe("chaveDeNome", () => {
  it("ignora caixa, acento e pontuação", () => {
    expect(chaveDeNome("Biossegurança")).toBe(chaveDeNome("BIOSSEGURANCA"));
    expect(chaveDeNome("Cirurgia e implante")).toBe(chaveDeNome("cirurgia e implante"));
    expect(chaveDeNome("  Imagem  e   diagnóstico ")).toBe("imagem e diagnostico");
  });

  it("mantém separados nomes que só se parecem", () => {
    // grafia errada é problema de cadastro, não sinônimo
    expect(chaveDeNome("Biosegurança")).not.toBe(chaveDeNome("Biossegurança"));
    // e uma categoria mais específica não é a mesma que a genérica
    expect(chaveDeNome("Unidade básica")).not.toBe(chaveDeNome("Unidade básica de tratamento"));
  });
});

describe("unificarPorNome", () => {
  const CATEGORIAS = [
    { slug: "biosseguranca", nome: "Biossegurança", quantidade: 3 },
    { slug: "profilaxia", nome: "Profilaxia", quantidade: 2 },
    { slug: "bioseguranca", nome: "Biossegurança", quantidade: 1 },
  ];

  it("junta cadastros de mesmo nome numa opção só", () => {
    const juntas = unificarPorNome(CATEGORIAS);
    expect(juntas).toHaveLength(2);
    expect(juntas.map((c) => c.nome)).toEqual(["Biossegurança", "Profilaxia"]);
  });

  it("soma as quantidades — o rótulo tem que descrever o que o clique entrega", () => {
    const [biosseguranca] = unificarPorNome(CATEGORIAS);
    expect(biosseguranca.quantidade).toBe(4);
    expect(biosseguranca.slugs).toEqual(["biosseguranca", "bioseguranca"]);
  });

  it("elege como canônico o cadastro com mais equipamentos", () => {
    const [biosseguranca] = unificarPorNome([
      { slug: "vazia", nome: "Biossegurança", quantidade: 0 },
      { slug: "cheia", nome: "Biossegurança", quantidade: 5 },
    ]);
    expect(biosseguranca.slug).toBe("cheia");
  });

  it("empate mantém a ordem que veio do banco, que é a editorial", () => {
    const [primeira] = unificarPorNome([
      { slug: "a", nome: "Cirurgia", quantidade: 2 },
      { slug: "b", nome: "Cirurgia", quantidade: 2 },
    ]);
    expect(primeira.slug).toBe("a");
  });

  it("preserva os campos extras do cadastro escolhido", () => {
    const [marca] = unificarPorNome([
      { slug: "demo-schuster", nome: "Schuster", quantidade: 0, logo: null },
      { slug: "schuster", nome: "Schuster", quantidade: 3, logo: { url: "/logo.png" } },
    ]);
    expect(marca.slug).toBe("schuster");
    expect(marca.logo).toEqual({ url: "/logo.png" });
  });

  it("lista sem duplicata atravessa intacta", () => {
    const entrada = [
      { slug: "a", nome: "Alfa", quantidade: 1 },
      { slug: "b", nome: "Beta", quantidade: 2 },
    ];
    expect(unificarPorNome(entrada).map((i) => i.slug)).toEqual(["a", "b"]);
  });
});

describe("mapaDeSinonimos", () => {
  it("abre qualquer um dos slugs em todos os de mesmo nome", () => {
    const mapa = mapaDeSinonimos([
      { slug: "biosseguranca", nome: "Biossegurança" },
      { slug: "bioseguranca", nome: "Biossegurança" },
      { slug: "profilaxia", nome: "Profilaxia" },
    ]);

    /* Os dois caminhos precisam levar ao mesmo conjunto: é o que faz a
       contagem "Biossegurança 4" bater com a lista que o clique abre. */
    expect(mapa.get("biosseguranca")).toEqual(["biosseguranca", "bioseguranca"]);
    expect(mapa.get("bioseguranca")).toEqual(["biosseguranca", "bioseguranca"]);
    expect(mapa.get("profilaxia")).toEqual(["profilaxia"]);
  });

  it("slug desconhecido não aparece no mapa", () => {
    const mapa = mapaDeSinonimos([{ slug: "a", nome: "Alfa" }]);
    expect(mapa.get("inexistente")).toBeUndefined();
  });
});
