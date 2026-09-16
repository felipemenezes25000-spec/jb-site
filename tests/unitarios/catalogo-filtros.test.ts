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
    /* A lista de filtros nunca fica vazia: a exclusão da unidade já vendida é
       o piso de toda consulta pública (ver `UNIDADE_VENDIDA`). O que se checa
       aqui é que marca vazia não acrescenta NADA além desse piso. */
    const vazios: (string | string[])[] = [[], ["  "], ""];
    for (const marca of vazios) {
      const where = montarFiltro({ marca });
      expect(clausula(where, "brand")).toBeUndefined();
      expect((where.AND as unknown[]).length).toBe(1);
    }
  });

  it("combina marca e faixa de preço sem uma anular a outra", () => {
    const where = montarFiltro({ marca: ["alt", "suctron"], precoMin: 100_000 });
    expect(clausula(where, "brand")).toEqual({ brand: { slug: { in: ["alt", "suctron"] } } });
    expect(clausula(where, "priceCents")).toEqual({ priceCents: { gte: 100_000 } });
  });
});

/**
 * Seminovo é unidade, não modelo: a que já saiu não volta ao estoque, e por
 * isso deixa de ocupar lugar na lista de quem está escolhendo o que comprar.
 * A página dela continua de pé — o que muda é a vitrine.
 */
describe("montarFiltro — unidade já vendida", () => {
  const EXCLUSAO = {
    NOT: { unique: true, trackInventory: true, stock: { lte: 0 } },
  };

  it("some da lista por padrão", () => {
    expect(clausula(montarFiltro({}), "unique")).toEqual(EXCLUSAO);
  });

  it("volta quando a pessoa pede explicitamente", () => {
    const where = montarFiltro({ incluirVendidos: true });
    expect(clausula(where, "unique")).toBeUndefined();
    expect(where.AND).toBeUndefined();
  });

  it("não atrapalha um produto de linha sem estoque", () => {
    /* A exclusão exige as três condições juntas — `unique`, controle de
       estoque e saldo zerado. Produto de linha esgotado continua listado,
       porque ele volta, e o cartão já diz "Indisponível". */
    expect(EXCLUSAO.NOT.unique).toBe(true);
    expect(EXCLUSAO.NOT.trackInventory).toBe(true);
  });

  it("continua valendo junto de outros filtros", () => {
    const where = montarFiltro({ marca: ["alt"], emEstoque: true });
    expect(clausula(where, "unique")).toEqual(EXCLUSAO);
    expect(clausula(where, "brand")).toEqual({ brand: { slug: { in: ["alt"] } } });
  });
});
