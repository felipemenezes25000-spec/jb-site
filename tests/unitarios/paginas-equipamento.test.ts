import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { EQUIPAMENTOS } from "@/lib/diagnostico";
import {
  PAGINAS_DE_EQUIPAMENTO,
  caminhoDoEquipamento,
  descricaoDaPagina,
  equipamentoDaPagina,
  paginaPorSlug,
  tituloDaPagina,
} from "@/lib/paginas-equipamento";

/* ============================================================================
   Páginas por equipamento

   O que estes testes protegem:

   - todo equipamento do diagnóstico (menos "outro") tem página, e toda página
     tem a pasta da rota e a imagem de prévia. Um equipamento novo sem página
     seria anúncio caindo em 404;
   - nenhuma página prende o equipamento a um fabricante: a JB conserta todas
     as marcas, e um "EVOXX" na página da autoclave fazia parecer que só
     aquela marca entrava;
   - o texto não promete prazo, preço nem garantia, que dependem da operação
     real e entram só quando a JB confirmar.
   ============================================================================ */

const RAIZ_DAS_ROTAS = join(process.cwd(), "src", "app", "(site)");

describe("páginas por equipamento", () => {
  it("cobre todo equipamento do diagnóstico, menos o genérico", () => {
    const comPagina = PAGINAS_DE_EQUIPAMENTO.map((pagina) => pagina.equipamento).sort();
    const esperados = EQUIPAMENTOS.filter((item) => item.id !== "outro")
      .map((item) => item.id)
      .sort();
    expect(comPagina).toEqual(esperados);
    expect(caminhoDoEquipamento("outro")).toBeNull();
    expect(caminhoDoEquipamento("bomba-vacuo")).toBe("/bomba-de-vacuo");
  });

  it("cada página tem slug único, simples e a sua pasta de rota", () => {
    const slugs = PAGINAS_DE_EQUIPAMENTO.map((pagina) => pagina.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(existsSync(join(RAIZ_DAS_ROTAS, slug, "page.tsx")), `${slug}/page.tsx`).toBe(true);
      expect(existsSync(join(RAIZ_DAS_ROTAS, slug, "opengraph-image.tsx")), `${slug}/opengraph-image.tsx`).toBe(true);
      expect(paginaPorSlug(slug)?.slug).toBe(slug);
    }
    expect(paginaPorSlug("carrinho")).toBeNull();
  });

  it("título e descrição trazem o equipamento e a cidade", () => {
    const autoclave = paginaPorSlug("autoclave")!;
    expect(tituloDaPagina(autoclave, "São Paulo")).toBe(
      "Conserto de autoclave odontológica em São Paulo",
    );
    expect(descricaoDaPagina(autoclave, "São Paulo")).toContain("Autoclave parou?");
  });

  it("descrição cabe no trecho que o buscador mostra", () => {
    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      expect(descricaoDaPagina(pagina, "São Paulo").length, pagina.slug).toBeLessThanOrEqual(160);
    }
  });

  it("diz todas as marcas e não amarra o equipamento a um fabricante", () => {
    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      const textos = [
        descricaoDaPagina(pagina, "São Paulo"),
        pagina.chamada,
        ...pagina.enquantoIsso,
        ...pagina.duvidas.flatMap((item) => [item.pergunta, item.resposta]),
      ];
      for (const texto of textos) expect(texto, `${pagina.slug}: ${texto}`).not.toMatch(/evoxx/i);
      expect(descricaoDaPagina(pagina, "São Paulo"), pagina.slug).toContain("todas as marcas");
      expect(
        pagina.duvidas.some((item) => /qualquer marca/.test(item.pergunta)),
        `${pagina.slug} responde "de qualquer marca?"`,
      ).toBe(true);
    }
    expect(equipamentoDaPagina(paginaPorSlug("cadeira-odontologica")!)).not.toHaveProperty("evoxx");
  });

  it("não promete prazo, preço nem garantia", () => {
    const PROMESSA = /R\$\s*\d|\b\d+\s*(h|horas?|dias?|minutos?)\b|garantia de|em até|no mesmo dia|24 ?h/i;

    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      const textos = [
        pagina.chamada,
        ...pagina.enquantoIsso,
        ...pagina.duvidas.flatMap((item) => [item.pergunta, item.resposta]),
        descricaoDaPagina(pagina, "São Paulo"),
      ];
      for (const texto of textos) expect(texto, `${pagina.slug}: ${texto}`).not.toMatch(PROMESSA);
    }
  });

  it("tem cuidados curtos e perguntas com resposta", () => {
    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      expect(pagina.enquantoIsso.length, pagina.slug).toBeGreaterThanOrEqual(2);
      expect(pagina.enquantoIsso.length, pagina.slug).toBeLessThanOrEqual(3);
      expect(pagina.duvidas.length, pagina.slug).toBeGreaterThan(0);
      for (const { pergunta, resposta } of pagina.duvidas) {
        expect(pergunta.trim().endsWith("?"), pergunta).toBe(true);
        expect(resposta.trim().length).toBeGreaterThan(20);
      }
    }
  });
});
