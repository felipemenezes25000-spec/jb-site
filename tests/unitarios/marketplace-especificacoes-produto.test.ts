import { describe, expect, it } from "vitest";

import { agruparEspecificacoes } from "@/components/loja/produto/especificacoes";

describe("agruparEspecificacoes", () => {
  it("preserva grupos definidos manualmente no cadastro", () => {
    expect(
      agruparEspecificacoes([
        {
          id: "1",
          group: "Câmara de esterilização",
          label: "Capacidade",
          value: "18 litros",
        },
        {
          id: "2",
          group: "Câmara de esterilização",
          label: "Bandejas",
          value: "4 inox",
        },
      ]),
    ).toEqual([
      {
        grupo: "Câmara de esterilização",
        itens: [
          { id: "1", rotulo: "Capacidade", valor: "18 litros" },
          { id: "2", rotulo: "Bandejas", valor: "4 inox" },
        ],
      },
    ]);
  });

  it("organiza automaticamente apenas specs que vieram sem grupo", () => {
    expect(
      agruparEspecificacoes([
        { id: "1", group: "", label: "Torque", value: "35 N·cm" },
        { id: "2", group: "", label: "Rotação", value: "40.000 rpm" },
        { id: "3", group: "", label: "Tensão", value: "Bivolt" },
        { id: "4", group: "", label: "Bateria", value: "Lítio" },
      ]),
    ).toEqual([
      {
        grupo: "Desempenho",
        itens: [
          { id: "1", rotulo: "Torque", valor: "35 N·cm" },
          { id: "2", rotulo: "Rotação", valor: "40.000 rpm" },
        ],
      },
      {
        grupo: "Energia e alimentação",
        itens: [
          { id: "3", rotulo: "Tensão", valor: "Bivolt" },
          { id: "4", rotulo: "Bateria", valor: "Lítio" },
        ],
      },
    ]);
  });

  it("descarta linhas vazias em vez de criar grupos vazios", () => {
    expect(
      agruparEspecificacoes([
        { id: "1", group: "", label: "", value: "8 bar" },
        { id: "2", group: "", label: "Pressão", value: "" },
      ]),
    ).toEqual([]);
  });
});
