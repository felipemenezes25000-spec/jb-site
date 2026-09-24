import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CREDENCIAIS,
  autorizacoesVerificaveis,
  marcasAtendidas,
  type Credencial,
} from "@/lib/credenciais-de-marca";
import { EQUIPAMENTOS } from "@/lib/diagnostico";
import {
  ETAPAS_DE_INFRAESTRUTURA,
  MENSAGEM_VISITA_TECNICA,
  PERGUNTA_DE_INFRAESTRUTURA,
} from "@/lib/infraestrutura";
import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";
import {
  GRUPOS_DO_PORTFOLIO,
  PORTFOLIO_DE_ASSISTENCIA,
  idDeMedicao,
  imagemDoEquipamento,
  imagemDoPortfolio,
  itensDoGrupo,
  mensagemDoPortfolio,
} from "@/lib/portfolio-assistencia";

/* ============================================================================
   Portfólio de assistência, infraestrutura e credenciais

   O que estes testes protegem:

   - a grade é portfólio, não vitrine: nome de tipo de equipamento, sem
     modelo comercial, preço ou capacidade no título; nenhum item repetido;
   - toda foto existe no disco, no quadro do portfólio, e com peso de web;
   - todo equipamento da triagem (menos "outro") está no portfólio, com a
     mesma foto que a landing usa;
   - a mensagem do WhatsApp nomeia o equipamento;
   - infraestrutura nunca promete preço ou orçamento antes da visita;
   - "autorizada" só sai com página oficial do fabricante para conferir.
   ============================================================================ */

const PUBLICO = join(process.cwd(), "public");

describe("portfólio de assistência", () => {
  it("traz todas as categorias pedidas, sem repetir tipo nem foto", () => {
    const nomes = PORTFOLIO_DE_ASSISTENCIA.map((item) => item.nome);
    expect(nomes).toEqual(
      expect.arrayContaining([
        "Autoclave",
        "Compressor odontológico",
        "Bomba de vácuo",
        "Cadeira odontológica",
        "Seladora",
        "Destilador de água",
        "Lavadora ultrassônica",
        "Peças de mão",
        "Raio-X odontológico",
        "Ultrassom e profilaxia",
        "Fotopolimerizador",
        "Amalgamador",
        "Equipo odontológico",
        "Refletor odontológico",
        "Mocho odontológico",
        "Articulador",
      ]),
    );
    expect(new Set(nomes).size).toBe(nomes.length);
    const slugs = PORTFOLIO_DE_ASSISTENCIA.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("mostra tipo de equipamento, nunca modelo, preço ou ficha", () => {
    for (const item of PORTFOLIO_DE_ASSISTENCIA) {
      expect(item.nome, item.slug).not.toMatch(/\d|R\$|G8|G4|Bioqualy|Timex|Sommo|Gnatus|EVOXX|litros?\b/i);
      expect(item.nome.length, item.slug).toBeLessThanOrEqual(24);
    }
  });

  it("tem foto no quadro do portfólio para cada item, com peso de web", () => {
    for (const item of PORTFOLIO_DE_ASSISTENCIA) {
      const caminho = join(PUBLICO, imagemDoPortfolio(item.slug));
      expect(existsSync(caminho), caminho).toBe(true);
      expect(statSync(caminho).size, caminho).toBeLessThan(60 * 1024);
    }
  });

  it("cobre a triagem e usa a mesma foto das landings", () => {
    for (const equipamento of EQUIPAMENTOS.filter((item) => item.id !== "outro")) {
      expect(imagemDoEquipamento(equipamento.id), equipamento.id).not.toBeNull();
    }
    for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
      expect(pagina.visual, pagina.slug).toEqual({ tipo: "recorte", src: imagemDoEquipamento(pagina.equipamento) });
    }
  });

  it("mede o clique com o id da triagem quando ele existe", () => {
    const bomba = PORTFOLIO_DE_ASSISTENCIA.find((item) => item.slug === "bomba-de-vacuo");
    const raioX = PORTFOLIO_DE_ASSISTENCIA.find((item) => item.slug === "raio-x");
    expect(bomba && idDeMedicao(bomba)).toBe("bomba-vacuo");
    expect(raioX && idDeMedicao(raioX)).toBe("raio-x");
  });

  it("prepara a mensagem com o equipamento, e a genérica para 'outro'", () => {
    const raioX = PORTFOLIO_DE_ASSISTENCIA.find((item) => item.slug === "raio-x") ?? null;
    expect(mensagemDoPortfolio(raioX)).toBe(
      "Olá, JB! Vim pelo site e preciso de assistência e manutenção para raio-X odontológico.",
    );
    expect(mensagemDoPortfolio(null)).toContain("um equipamento odontológico");
    for (const item of PORTFOLIO_DE_ASSISTENCIA) {
      expect(mensagemDoPortfolio(item)).toContain(item.naMensagem);
    }
  });

  it("filtra por área sem perder nem duplicar item", () => {
    const somados = GRUPOS_DO_PORTFOLIO.flatMap((grupo) => itensDoGrupo(grupo.id));
    expect(somados).toHaveLength(PORTFOLIO_DE_ASSISTENCIA.length);
    expect(itensDoGrupo(null)).toEqual(PORTFOLIO_DE_ASSISTENCIA);
    for (const grupo of GRUPOS_DO_PORTFOLIO) expect(itensDoGrupo(grupo.id).length).toBeGreaterThan(0);
  });
});

describe("infraestrutura hidráulica e de esgoto", () => {
  it("pede visita antes do orçamento e não promete preço", () => {
    for (const texto of [MENSAGEM_VISITA_TECNICA, PERGUNTA_DE_INFRAESTRUTURA.resposta]) {
      expect(texto).toMatch(/visita técnica/i);
      expect(texto).toMatch(/orçamento/i);
      expect(texto).not.toMatch(/R\$|a partir de|grátis|gratuit|em até \d|garantia/i);
    }
    expect(MENSAGEM_VISITA_TECNICA).toMatch(/orçamento é preparado após a avaliação no local/i);
    const etapas = ETAPAS_DE_INFRAESTRUTURA.map((etapa) => etapa.titulo);
    expect(etapas.indexOf("Visita técnica no local")).toBeLessThan(etapas.length - 1);
    expect(etapas.at(-1)).toMatch(/^Orçamento/);
  });
});

describe("credenciais de marca", () => {
  it("publica a EVOXX com a lista oficial do fabricante", () => {
    const publicaveis = autorizacoesVerificaveis();
    expect(publicaveis).toEqual([
      expect.objectContaining({ marca: "EVOXX", categoria: "assistencia-autorizada" }),
    ]);
    expect(new URL(publicaveis[0].fonte).hostname).toBe("evoxx.com.br");
  });

  it("não publica autorização sem fonte oficial em https", () => {
    const lista: Credencial[] = [
      { marca: "Sem fonte", categoria: "assistencia-autorizada" },
      { marca: "Fonte http", categoria: "revenda-autorizada", fonte: "http://exemplo.com.br" },
      { marca: "Fonte quebrada", categoria: "revenda-autorizada", fonte: "lista oficial" },
      { marca: "Revenda ok", categoria: "revenda-autorizada", fonte: "https://fabricante.com.br/revendas" },
      { marca: "Atendida", categoria: "marca-atendida", fonte: "https://fabricante.com.br" },
    ];
    expect(autorizacoesVerificaveis(lista).map((item) => item.marca)).toEqual(["Revenda ok"]);
    expect(marcasAtendidas(lista)).toEqual(["Atendida"]);
  });

  it("não mistura categoria: marca atendida nunca vira selo", () => {
    for (const credencial of CREDENCIAIS) {
      if (credencial.categoria !== "marca-atendida") expect(credencial.fonte, credencial.marca).toMatch(/^https:\/\//);
    }
  });
});
