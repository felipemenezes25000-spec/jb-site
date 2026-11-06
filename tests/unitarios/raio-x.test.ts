import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";
import { PORTFOLIO_DE_ASSISTENCIA, imagemDoPortfolio } from "@/lib/portfolio-assistencia";
import { plantaDaFoto } from "@/lib/raio-x";

/* A planta do raio-X é gerada da foto por `scripts/gerar-raiox.mjs`. Foto
   nova sem planta não quebra nada (o scanner só não aparece), mas some em
   silêncio — estes testes avisam. */

const PUBLICO = path.resolve(__dirname, "../../public");

describe("planta do raio-X", () => {
  it("toda foto do portfólio tem planta, e o arquivo existe", () => {
    for (const item of PORTFOLIO_DE_ASSISTENCIA) {
      const planta = plantaDaFoto(imagemDoPortfolio(item.slug));
      expect(planta, item.slug).toBe(`/site/raiox/${item.slug}.webp`);
      expect(fs.existsSync(path.join(PUBLICO, planta ?? "")), `${planta} existe`).toBe(true);
    }
  });

  it("a foto da abertura de cada landing tem planta", () => {
    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      const planta = plantaDaFoto(pagina.visual.src);
      expect(planta, pagina.slug).not.toBeNull();
      expect(fs.existsSync(path.join(PUBLICO, planta ?? "")), `${planta} existe`).toBe(true);
    }
  });

  it("a foto da bancada da home tem planta", () => {
    expect(plantaDaFoto("/site/bancada.webp")).toBe("/site/raiox/bancada.webp");
    expect(fs.existsSync(path.join(PUBLICO, "site/raiox/bancada.webp"))).toBe(true);
  });

  it("foto desconhecida ou de fora do site não ganha planta", () => {
    expect(plantaDaFoto("/site/consultorio.webp")).toBeNull();
    expect(plantaDaFoto("/site/equip/portfolio/nao-existe.webp")).toBeNull();
    expect(plantaDaFoto("https://exemplo.com/site/bancada.webp")).toBeNull();
    expect(plantaDaFoto("/site/equip/portfolio/../bancada.webp")).toBeNull();
  });
});
