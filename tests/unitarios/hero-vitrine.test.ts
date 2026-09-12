import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeroVitrine } from "@/components/loja/home/hero-vitrine";

const autoclave = {
  id: "prod-autoclave-12l-revisada",
  slug: "autoclave-12l-revisada",
  name: "Autoclave 12L Revisada",
  model: "Vitale Class 12L",
  condition: "seminovo" as const,
  priceCents: 749000,
  compareAtCents: null,
  allowDirectPurchase: true,
  trackInventory: true,
  stock: 1,
  unique: true,
  brandName: "Cristófoli",
  imageUrl: "/catalogo-demo/autoclave.jpg",
  imageAlt: "Autoclave Cristófoli revisada pela JB",
};

const compressor = {
  ...autoclave,
  id: "prod-compressor-isento",
  slug: "compressor-isento-de-oleo",
  name: "Compressor odontológico isento de óleo",
  condition: "novo" as const,
  priceCents: 1149000,
  unique: false,
  brandName: "Schuster",
  imageUrl: "/catalogo-demo/compressor.jpg",
  imageAlt: "Compressor Schuster",
};

function renderizarHero(vitrine = [autoclave, compressor]) {
  return renderToStaticMarkup(
    createElement(HeroVitrine, {
      cidade: "São Paulo",
      desde: "2011",
      numeros: [
        { valor: "12", rotulo: "Equipamentos em linha" },
        { valor: "6", rotulo: "Marcas no catálogo" },
      ],
      vitrine,
      parcelamento: { max: 12, minimoCents: 5000 },
    }),
  );
}

describe("HeroVitrine", () => {
  it("oferece os caminhos de compra em uma navegação identificada", () => {
    const html = renderizarHero();

    /* "Comece sua compra", e não "sua busca": esta navegação tem dois
       destinos — catálogo e chamado técnico —, e a busca é o formulário logo
       acima dela. O rótulo descreve o que os dois links fazem. */
    expect(html).toContain('<nav aria-label="Comece sua compra"');
    expect(html).toContain('href="/loja"');
    expect(html).toContain('href="/assistencia-tecnica/solicitar"');
  });

  it("dá ao equipamento em foco uma ação acessível e inequívoca", () => {
    const html = renderizarHero();

    expect(html).toContain('aria-label="Conhecer Autoclave 12L Revisada"');
    expect(html).toContain('href="/loja/autoclave-12l-revisada"');
  });

  it("mantém o rótulo antes do valor em cada definição do catálogo", () => {
    const html = renderizarHero();

    const rotulo = html.indexOf("Equipamentos em linha");
    const valor = html.indexOf(">12<", rotulo);
    expect(rotulo).toBeGreaterThan(-1);
    expect(valor).toBeGreaterThan(rotulo);
  });

  it("não anuncia preço zero quando o equipamento depende de orçamento", () => {
    const html = renderizarHero([
      { ...autoclave, priceCents: 0, allowDirectPurchase: false },
      compressor,
    ]);

    expect(html).not.toContain("R$ 0,00");
  });

  /* A manchete é o ponto onde o desenho e a verdade do português brigam: o
     protótipo trocava só o substantivo e escrevia "a compressor". */
  it("concorda o artigo com o equipamento que a manchete oferece", () => {
    const html = renderizarHero();

    expect(html).toContain("a autoclave");
    expect(html).toContain("o compressor");
    expect(html).not.toContain("a compressor");
  });

  it("não gira a palavra quando a vitrine tem um tipo só", () => {
    const html = renderizarHero([autoclave]);

    /* Com um equipamento só não há o que alternar, e o rodízio viraria uma
       animação trocando "autoclave" por "autoclave". */
    expect(html).toContain("o equipamento");
    expect(html).not.toContain("a autoclave");
  });

  it("dá ao leitor de tela uma frase, não a lista inteira do rodízio", () => {
    const html = renderizarHero();

    expect(html).toContain("A clínica escolhe o equipamento. A JB responde pelos próximos anos.");
  });

  /* Laudo, nesta plataforma, é documento de unidade que passou pela bancada.
     O selo do protótipo dizia "laudo aprovado" em qualquer produto. */
  it("só promete laudo onde existe unidade física com laudo", () => {
    expect(renderizarHero([autoclave, compressor])).toContain("Laudo");
    expect(renderizarHero([compressor, autoclave])).toContain("Garantia");
  });
});
