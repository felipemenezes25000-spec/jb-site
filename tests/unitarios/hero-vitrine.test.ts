import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeroVitrine } from "@/components/loja/home/hero-vitrine";

const produto = {
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

function renderizarHero(destaque = produto) {
  return renderToStaticMarkup(
    createElement(HeroVitrine, {
      cidade: "São Paulo",
      numeros: [
        { valor: "12", rotulo: "Equipamentos em linha" },
        { valor: "6", rotulo: "Marcas no catálogo" },
      ],
      destaque,
      parcelamento: { max: 12, minimoCents: 5000 },
    }),
  );
}

describe("HeroVitrine", () => {
  it("oferece os caminhos de compra em uma navegação identificada", () => {
    const html = renderizarHero();

    expect(html).toContain('<nav aria-label="Comece sua busca"');
    expect(html).toContain('href="/loja"');
    expect(html).toContain('href="/seminovos"');
  });

  it("dá ao equipamento em destaque uma ação acessível e inequívoca", () => {
    const html = renderizarHero();

    expect(html).toContain('aria-label="Conhecer Autoclave 12L Revisada"');
    expect(html).toContain('href="/loja/autoclave-12l-revisada"');
  });

  it("mantém o rótulo antes do valor em cada definição do catálogo", () => {
    const html = renderizarHero();

    expect(html).toContain("<dt>Equipamentos em linha</dt><dd>12</dd>");
    expect(html).toContain("<dt>Marcas no catálogo</dt><dd>6</dd>");
  });

  it("não anuncia preço zero quando o equipamento depende de orçamento", () => {
    const html = renderizarHero({
      ...produto,
      priceCents: 0,
      allowDirectPurchase: false,
    });

    expect(html).toContain("<strong>Sob consulta</strong>");
    expect(html).not.toContain("R$ 0,00");
  });
});
