import { describe, expect, it } from "vitest";
import { construirFicha } from "@/domain/specs/construir";
import { exploracaoDoProduto } from "@/lib/comercio/exploracao-produto";

const base = { nome: "Autoclave", sku: "AUT-TESTE", condicao: "novo" };

describe("exploração visual do produto", () => {
  it("não oferece dimensões ou instalação quando o cadastro não informa", () => {
    expect(exploracaoDoProduto(construirFicha(base))).toEqual({ medidas: null, instalacao: [] });
  });

  it("usa as três medidas da ficha e mantém centímetros decimais", () => {
    const ficha = construirFicha({ ...base, larguraMm: 455, alturaMm: 880, profundidadeMm: 520 });
    expect(exploracaoDoProduto(ficha).medidas).toMatchObject({ largura: "45,5 cm", altura: "88 cm", profundidade: "52 cm" });
  });

  it("não cria um desenho dimensional com medidas incompletas, livres ou inválidas", () => {
    for (const value of ["conferir no manual", "45 × 88 cm", "0 × 88 × 52 cm", "-45 × 88 × 52 cm", "1..2 × 88 × 52 cm"]) {
      const ficha = construirFicha({ ...base, specs: [{ label: "Dimensões", value }] });
      expect(exploracaoDoProduto(ficha).medidas).toBeNull();
    }
  });

  it("preserva requisitos e tensão da ficha, sem inventar infraestrutura", () => {
    const ficha = construirFicha({ ...base, voltagem: "220", requisitos: ["Tomada exclusiva de 20 A", "20 cm livres atrás"] });
    const dados = exploracaoDoProduto(ficha);
    expect(dados.instalacao.map((item) => item.valor)).toEqual(["220 V", "Tomada exclusiva de 20 A", "20 cm livres atrás"]);
    expect(dados.instalacao.every((item) => item.fonte === "fabricante")).toBe(true);
  });

  it("não trata garantia ou condição de venda como requisito de instalação", () => {
    const ficha = construirFicha({ ...base, garantiaMeses: 12, politicaDeInstalacao: "inclusa" });
    expect(exploracaoDoProduto(ficha).instalacao).toEqual([]);
  });
});
