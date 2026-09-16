import { describe, expect, it } from "vitest";

import {
  calcularParcelas,
  cnpjValido,
  cpfValido,
  documentoValido,
  formatarCep,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
  formatarValor,
  gerarSlug,
  paraCentavos,
  plural,
  somenteDigitos,
  telHref,
  whatsappHref,
} from "@/lib/format";

/**
 * Dinheiro e documento.
 *
 * É aqui que um erro custa caro: um centavo perdido na conversão vira preço
 * errado no pedido, e um CPF aceito por engano vira nota fiscal recusada.
 */

/** O Intl do Node usa espaço não separável depois do "R$". */
function semEspacoEstranho(texto: string) {
  return texto.replace(/ /g, " ");
}

describe("formatarPreco", () => {
  it("mostra centavos como moeda brasileira", () => {
    expect(semEspacoEstranho(formatarPreco(489000))).toBe("R$ 4.890,00");
    expect(semEspacoEstranho(formatarPreco(1))).toBe("R$ 0,01");
    expect(semEspacoEstranho(formatarPreco(0))).toBe("R$ 0,00");
    expect(semEspacoEstranho(formatarPreco(100))).toBe("R$ 1,00");
  });

  it("mantém o separador de milhar em valores grandes", () => {
    expect(semEspacoEstranho(formatarPreco(114900000))).toBe("R$ 1.149.000,00");
  });

  it("formata valor negativo sem perder o sinal", () => {
    expect(semEspacoEstranho(formatarPreco(-5000))).toBe("-R$ 50,00");
  });

  it("formatarValor devolve o mesmo número sem o símbolo", () => {
    expect(formatarValor(489000)).toBe("4.890,00");
    expect(formatarValor(50)).toBe("0,50");
  });
});

describe("paraCentavos", () => {
  it("aceita vírgula decimal", () => {
    expect(paraCentavos("4890,00")).toBe(489000);
    expect(paraCentavos("0,01")).toBe(1);
    expect(paraCentavos("12,5")).toBe(1250);
  });

  it("trata o ponto como separador de milhar quando há vírgula", () => {
    expect(paraCentavos("4.890,00")).toBe(489000);
    expect(paraCentavos("1.149.000,00")).toBe(114900000);
    expect(paraCentavos("1.000,99")).toBe(100099);
  });

  it("trata o ponto como decimal quando não há vírgula", () => {
    expect(paraCentavos("4890.00")).toBe(489000);
    expect(paraCentavos("12.5")).toBe(1250);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(paraCentavos("R$ 4.890,00")).toBe(489000);
    expect(paraCentavos("  1.200,50  ")).toBe(120050);
  });

  it("devolve zero para entrada vazia ou sem número", () => {
    expect(paraCentavos("")).toBe(0);
    expect(paraCentavos("   ")).toBe(0);
    expect(paraCentavos("abc")).toBe(0);
  });

  it("aceita número e arredonda para o centavo mais próximo", () => {
    expect(paraCentavos(48.9)).toBe(4890);
    expect(paraCentavos(0.1 + 0.2)).toBe(30);
    expect(paraCentavos(19.999)).toBe(2000);
  });

  it("é o inverso de formatarValor para valores exatos", () => {
    for (const centavos of [1, 99, 100, 12345, 489000, 114900000]) {
      expect(paraCentavos(formatarValor(centavos))).toBe(centavos);
    }
  });
});

describe("calcularParcelas", () => {
  it("escolhe o maior número de parcelas que respeita o mínimo", () => {
    // 849000 / 12 = 70750 ≥ 5000 → cabe no máximo
    expect(calcularParcelas(849000)).toEqual({ parcelas: 12, valorCents: 70750 });
  });

  it("reduz as parcelas quando a divisão fica abaixo do mínimo", () => {
    // mínimo 5000: 30000/12 = 2500 (não), 30000/6 = 5000 (sim)
    expect(calcularParcelas(30000)).toEqual({ parcelas: 6, valorCents: 5000 });
  });

  it("recusa parcelar quando nem 2× atinge o mínimo", () => {
    expect(calcularParcelas(9000)).toBeNull();
    expect(calcularParcelas(9999)).toBeNull();
  });

  it("aceita exatamente 2× quando é o único que cabe", () => {
    expect(calcularParcelas(10000)).toEqual({ parcelas: 2, valorCents: 5000 });
  });

  it("arredonda a parcela para baixo, nunca cobrando a mais por parcela", () => {
    const resultado = calcularParcelas(100001, 3, 1000);
    expect(resultado).toEqual({ parcelas: 3, valorCents: 33333 });
    expect(resultado!.valorCents * resultado!.parcelas).toBeLessThanOrEqual(100001);
  });

  it("respeita o teto de parcelas configurado", () => {
    expect(calcularParcelas(849000, 6)).toEqual({ parcelas: 6, valorCents: 141500 });
    expect(calcularParcelas(849000, 1)).toBeNull();
  });

  it("respeita a parcela mínima configurada", () => {
    expect(calcularParcelas(120000, 12, 20000)).toEqual({ parcelas: 6, valorCents: 20000 });
  });

  it("não parcela total zerado nem negativo", () => {
    expect(calcularParcelas(0)).toBeNull();
    expect(calcularParcelas(-100000)).toBeNull();
  });
});

describe("cpfValido", () => {
  it("aceita CPFs com dígitos verificadores corretos", () => {
    // gerados pelo algoritmo oficial, sem vínculo com pessoa real
    for (const cpf of ["529.982.247-25", "111.444.777-35", "01234567890"]) {
      expect(cpfValido(cpf), cpf).toBe(true);
    }
  });

  it("aceita com ou sem máscara", () => {
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-25")).toBe(true);
  });

  it("recusa dígito verificador trocado", () => {
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.444.777-30")).toBe(false);
  });

  it("recusa sequências de dígito repetido", () => {
    for (const cpf of ["00000000000", "11111111111", "99999999999"]) {
      expect(cpfValido(cpf), cpf).toBe(false);
    }
  });

  it("recusa tamanho errado e texto", () => {
    expect(cpfValido("")).toBe(false);
    expect(cpfValido("5299822472")).toBe(false);
    expect(cpfValido("529982247251")).toBe(false);
    expect(cpfValido("abc.def.ghi-jk")).toBe(false);
  });
});

describe("cnpjValido", () => {
  it("aceita CNPJs com dígitos verificadores corretos", () => {
    for (const cnpj of ["11.222.333/0001-81", "04252011000110", "34.028.316/0001-03"]) {
      expect(cnpjValido(cnpj), cnpj).toBe(true);
    }
  });

  it("recusa dígito verificador trocado", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("04252011000111")).toBe(false);
  });

  it("recusa sequências de dígito repetido", () => {
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("recusa tamanho errado", () => {
    expect(cnpjValido("")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("11222333000181" + "0")).toBe(false);
  });

  it("um CPF válido não passa como CNPJ e vice-versa", () => {
    expect(cnpjValido("52998224725")).toBe(false);
    expect(cpfValido("11222333000181")).toBe(false);
  });
});

describe("documentoValido", () => {
  it("escolhe a regra pelo tipo de pessoa", () => {
    expect(documentoValido("529.982.247-25", "fisica")).toBe(true);
    expect(documentoValido("529.982.247-25", "juridica")).toBe(false);
    expect(documentoValido("11.222.333/0001-81", "juridica")).toBe(true);
    expect(documentoValido("11.222.333/0001-81", "fisica")).toBe(false);
  });
});

describe("gerarSlug", () => {
  it("tira acento e cedilha", () => {
    expect(gerarSlug("Autoclave Odontológica")).toBe("autoclave-odontologica");
    expect(gerarSlug("Manutenção Preventiva")).toBe("manutencao-preventiva");
    expect(gerarSlug("Ação, Coração e Ínterim")).toBe("acao-coracao-e-interim");
    expect(gerarSlug("Câmara ÚMIDA")).toBe("camara-umida");
  });

  it("junta separadores repetidos em um hífen só", () => {
    expect(gerarSlug("Peças   e / Acessórios")).toBe("pecas-e-acessorios");
    expect(gerarSlug("Bomba --- de --- vácuo")).toBe("bomba-de-vacuo");
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(gerarSlug("  — Compressor —  ")).toBe("compressor");
    expect(gerarSlug("!!!Ultrassom!!!")).toBe("ultrassom");
  });

  it("preserva números", () => {
    expect(gerarSlug("Autoclave 21 litros")).toBe("autoclave-21-litros");
  });

  it("corta em 80 caracteres", () => {
    const slug = gerarSlug("á".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it("devolve string vazia quando não sobra nada", () => {
    expect(gerarSlug("———")).toBe("");
    expect(gerarSlug("")).toBe("");
  });
});

describe("máscaras de contato", () => {
  it("formata celular e fixo", () => {
    expect(formatarTelefone("11900000000")).toBe("(11) 90000-0000");
    expect(formatarTelefone("1130000000")).toBe("(11) 3000-0000");
  });

  it("devolve o valor original quando o tamanho não bate", () => {
    expect(formatarTelefone("119000")).toBe("119000");
  });

  it("formata CEP e documento", () => {
    expect(formatarCep("01310100")).toBe("01310-100");
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("somenteDigitos limpa qualquer máscara", () => {
    expect(somenteDigitos("(11) 90000-0000")).toBe("11900000000");
    expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
  });

  it("monta links de WhatsApp e telefone com DDI", () => {
    expect(whatsappHref("(11) 90000-0000")).toBe("https://wa.me/5511900000000");
    expect(whatsappHref("5511900000000")).toBe("https://wa.me/5511900000000");
    expect(whatsappHref("11900000000", "Olá JB")).toBe(
      "https://wa.me/5511900000000?text=Ol%C3%A1%20JB",
    );
    expect(whatsappHref("")).toBe("");
    expect(telHref("(11) 3000-0000")).toBe("tel:+551130000000");
    expect(telHref("")).toBe("");
  });
});

describe("plural", () => {
  it("usa singular só no um", () => {
    expect(plural(1, "item", "itens")).toBe("1 item");
    expect(plural(0, "item", "itens")).toBe("0 itens");
    expect(plural(3, "item", "itens")).toBe("3 itens");
  });
});
