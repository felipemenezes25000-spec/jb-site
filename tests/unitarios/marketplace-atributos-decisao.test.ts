import { describe, expect, it } from "vitest";

import {
  grupoSemanticoAtributo,
  mesmoPerfilParaAlternativaAutomatica,
  perfilAtributosDecisao,
  prioridadeAtributoDecisao,
} from "@/lib/marketplace/atributos-decisao";

describe("matriz de atributos de decisão", () => {
  it("distingue subtipos mesmo dentro de categorias amplas", () => {
    expect(
      perfilAtributosDecisao({
        nome: "Fotopolimerizador LED 1200 mW",
        categoriaSlug: "profilaxia",
        rotulos: [],
      })?.id,
    ).toBe("fotopolimerizador");

    expect(
      perfilAtributosDecisao({
        nome: "Ultrassom com jato de bicarbonato",
        categoriaSlug: "profilaxia",
        rotulos: [],
      })?.id,
    ).toBe("ultrassom-profilaxia");

    expect(
      perfilAtributosDecisao({
        nome: "Compressor isento de óleo 40 L",
        categoriaSlug: "unidade-basica",
        rotulos: [],
      })?.id,
    ).toBe("compressor");

    expect(
      perfilAtributosDecisao({
        nome: "Cadeira com equipo completo Pro",
        categoriaSlug: "unidade-basica",
        rotulos: [],
      })?.id,
    ).toBe("cadeira");
  });

  it("reconhece perfil pela combinação da ficha sem depender do nome", () => {
    expect(
      perfilAtributosDecisao({
        rotulos: ["Torque", "Rotação", "Redução", "Irrigação", "Pedal"],
      })?.id,
    ).toBe("motor-implante");
  });

  it("não trata outro subtipo da mesma categoria como substituto automático", () => {
    const fotopolimerizador = {
      nome: "Fotopolimerizador LED 1200 mW",
      categoriaSlug: "profilaxia",
      rotulos: ["Intensidade", "Modos", "Bateria", "Ponteira"],
    };

    expect(
      mesmoPerfilParaAlternativaAutomatica(fotopolimerizador, {
        nome: "Fotopolimerizador LED 1600 mW",
        categoriaSlug: "profilaxia",
        rotulos: ["Intensidade", "Modos", "Bateria", "Ponteira"],
      }),
    ).toBe(true);

    expect(
      mesmoPerfilParaAlternativaAutomatica(fotopolimerizador, {
        nome: "Ultrassom com jato de bicarbonato",
        categoriaSlug: "profilaxia",
        rotulos: ["Frequência", "Insertos", "Reservatório", "Pedal"],
      }),
    ).toBe(false);
  });

  it("mantém fallback por categoria quando o produto não tem perfil reconhecível", () => {
    expect(
      mesmoPerfilParaAlternativaAutomatica(
        { nome: "Equipamento clínico X", rotulos: ["Cor", "Material"] },
        { nome: "Equipamento clínico Y", rotulos: ["Peso", "Voltagem"] },
      ),
    ).toBe(true);
  });

  it("atributo específico vence o ranking genérico", () => {
    const contexto = {
      nome: "Autoclave vertical 18 L",
      rotulos: ["Tensão", "Capacidade", "Ciclo", "Secagem"],
    };

    expect(prioridadeAtributoDecisao("Capacidade", contexto)).toBeLessThan(
      prioridadeAtributoDecisao("Tensão", contexto),
    );
    expect(prioridadeAtributoDecisao("Ciclo", contexto)).toBeLessThan(
      prioridadeAtributoDecisao("Tensão", contexto),
    );
  });

  it("agrupa rótulos sem grupo em famílias técnicas previsíveis", () => {
    expect(grupoSemanticoAtributo("Torque máximo")).toBe("Desempenho");
    expect(grupoSemanticoAtributo("5 programas")).toBe("Operação e recursos");
    expect(grupoSemanticoAtributo("Reservatório")).toBe("Capacidade e componentes");
    expect(grupoSemanticoAtributo("Tensão")).toBe("Energia e alimentação");
    expect(grupoSemanticoAtributo("Compatibilidade")).toBe("Compatibilidade e uso");
    expect(grupoSemanticoAtributo("Peso líquido")).toBe("Dimensões e ambiente");
  });
});
