import { describe, expect, it } from "vitest";

import {
  adicionarDias,
  adicionarMeses,
  calcularParcelas,
  semQuebraNaUnidade,
  textoDoParcelamento,
} from "@/lib/format";

/* ============================================================================
   Três contas que a auditoria pegou erradas

   1. Garantia de 12 meses comprada em 14/09/2026 vencia em 09/09/2027 —
      cinco dias a menos, porque a conta era `meses * 30 dias`.
   2. Nove parcelas de R$ 486,66 somavam R$ 4.379,94 num pedido de
      R$ 4.380,00 — seis centavos que ninguém cobrava.
   3. "Autoclave 12 L revisada" quebrava como "Autoclave 12" / "L revisada".
   ============================================================================ */

describe("adicionarMeses", () => {
  it("anda no calendário, não em blocos de 30 dias", () => {
    const compra = new Date(Date.UTC(2026, 8, 14)); // 14/09/2026
    const vencimento = adicionarMeses(compra, 12);

    expect(vencimento.toISOString().slice(0, 10)).toBe("2027-09-14");
  });

  it("meia dúzia de meses cai no mesmo dia do mês", () => {
    const base = new Date(Date.UTC(2026, 8, 14));
    expect(adicionarMeses(base, 6).toISOString().slice(0, 10)).toBe("2027-03-14");
  });

  it("fecha no último dia quando o dia não existe no mês de destino", () => {
    const base = new Date(Date.UTC(2026, 0, 31)); // 31/01/2026
    expect(adicionarMeses(base, 1).toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("respeita ano bissexto", () => {
    const base = new Date(Date.UTC(2027, 0, 29)); // 29/01/2027
    expect(adicionarMeses(base, 1).toISOString().slice(0, 10)).toBe("2027-02-28");

    const bissexto = new Date(Date.UTC(2028, 0, 29)); // 2028 é bissexto
    expect(adicionarMeses(bissexto, 1).toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("atravessa a virada do ano", () => {
    const base = new Date(Date.UTC(2026, 10, 20)); // 20/11/2026
    expect(adicionarMeses(base, 3).toISOString().slice(0, 10)).toBe("2027-02-20");
  });
});

describe("adicionarDias", () => {
  it("a preventiva de 180 dias continua sendo 180 dias", () => {
    const base = new Date(Date.UTC(2026, 8, 14));
    expect(adicionarDias(base, 180).toISOString().slice(0, 10)).toBe("2027-03-13");
  });
});

describe("calcularParcelas", () => {
  it("a soma das parcelas fecha com o total", () => {
    /* O caso medido: carrinho de R$ 4.380,00 em 9 vezes. `Math.floor` dava
       R$ 486,66 e nove delas somavam R$ 4.379,94. */
    const total = 438_000;
    const parcelamento = calcularParcelas(total, 9, 5000)!;

    const soma =
      parcelamento.primeiraCents + parcelamento.valorCents * (parcelamento.parcelas - 1);

    expect(soma).toBe(total);
  });

  it("marca a sobra quando ela existe e não inventa quando não existe", () => {
    const comSobra = calcularParcelas(438_000, 9, 5000)!;
    expect(comSobra.temSobra).toBe(true);
    expect(comSobra.primeiraCents).toBeGreaterThan(comSobra.valorCents);

    const redondo = calcularParcelas(120_000, 12, 5000)!;
    expect(redondo.temSobra).toBe(false);
    expect(redondo.primeiraCents).toBe(redondo.valorCents);
  });

  it("fecha em qualquer total, para qualquer número de parcelas", () => {
    for (let total = 10_000; total <= 2_000_000; total += 3_137) {
      const parcelamento = calcularParcelas(total, 12, 5000);
      if (!parcelamento) continue;
      const soma =
        parcelamento.primeiraCents + parcelamento.valorCents * (parcelamento.parcelas - 1);
      expect(soma).toBe(total);
    }
  });

  it("respeita o piso da parcela e o teto de vezes", () => {
    expect(calcularParcelas(9_000, 12, 5000)).toBeNull();
    expect(calcularParcelas(100_000, 6, 5000)!.parcelas).toBeLessThanOrEqual(6);
  });

  it("a frase só menciona a primeira parcela quando ela difere", () => {
    expect(textoDoParcelamento(calcularParcelas(120_000, 12, 5000)!)).not.toContain("1ª");
    expect(textoDoParcelamento(calcularParcelas(438_000, 9, 5000)!)).toContain("1ª");
  });
});

describe("semQuebraNaUnidade", () => {
  it("cola o número na unidade que o segue", () => {
    expect(semQuebraNaUnidade("Autoclave 12 L revisada")).toBe(
      "Autoclave 12 L revisada",
    );
    expect(semQuebraNaUnidade("Seladora de embalagens 30 cm")).toBe(
      "Seladora de embalagens 30 cm",
    );
  });

  it("não mexe em palavra que só começa com a letra da unidade", () => {
    expect(semQuebraNaUnidade("Cadeira 3 Lâminas")).toBe("Cadeira 3 Lâminas");
    expect(semQuebraNaUnidade("Kit 2 peças")).toBe("Kit 2 peças");
  });
});
