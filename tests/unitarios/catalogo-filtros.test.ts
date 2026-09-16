import { describe, expect, it, vi } from "vitest";

/**
 * A barra de filtros usa caixas de seleção, então marcar duas marcas precisa
 * trazer as duas. Antes só o primeiro valor chegava ao banco: a segunda caixa
 * ficava marcada na tela sem efeito nenhum.
 */
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { montarFiltro } = await import("@/lib/catalogo");

/** Puxa a condição do AND que casa com o predicado. */
function clausula(where: ReturnType<typeof montarFiltro>, chave: string) {
  const lista = (where.AND ?? []) as Record<string, unknown>[];
  return lista.find((c) => JSON.stringify(c).includes(chave));
}

describe("montarFiltro — vários valores", () => {
  it("filtra por duas marcas", () => {
    const where = montarFiltro({ marca: ["alt", "schuster"] });
    expect(clausula(where, "brand")).toEqual({ brand: { slug: { in: ["alt", "schuster"] } } });
  });

  it("uma marca só continua funcionando", () => {
    const where = montarFiltro({ marca: "alt" });
    expect(clausula(where, "brand")).toEqual({ brand: { slug: { in: ["alt"] } } });
  });

  it("filtra por duas categorias, incluindo as subcategorias de cada uma", () => {
    const where = montarFiltro({ categoria: ["autoclaves", "compressores"] });
    expect(clausula(where, "category")).toEqual({
      OR: [
        { category: { slug: { in: ["autoclaves", "compressores"] } } },
        { category: { parent: { slug: { in: ["autoclaves", "compressores"] } } } },
      ],
    });
  });

  it("filtra por duas voltagens", () => {
    const where = montarFiltro({ voltagem: ["110", "220"] });
    expect(clausula(where, "voltage")).toEqual({ voltage: { in: ["110", "220"] } });
  });

  it("condição continua aceitando lista", () => {
    const where = montarFiltro({ condicao: ["seminovo", "recondicionado"] });
    expect(clausula(where, "condition")).toEqual({
      condition: { in: ["seminovo", "recondicionado"] },
    });
  });

  it("valor vazio ou só espaço não vira cláusula", () => {
    expect(montarFiltro({ marca: [] }).AND).toBeUndefined();
    expect(montarFiltro({ marca: ["  "] }).AND).toBeUndefined();
    expect(montarFiltro({ marca: "" }).AND).toBeUndefined();
  });

  it("combina marca e faixa de preço sem uma anular a outra", () => {
    const where = montarFiltro({ marca: ["alt", "suctron"], precoMin: 100_000 });
    expect((where.AND as unknown[]).length).toBe(2);
    expect(clausula(where, "priceCents")).toEqual({ priceCents: { gte: 100_000 } });
  });
});
