import { describe, expect, it } from "vitest";

import {
  EVENTOS,
  idDaOcorrencia,
  limparPayload,
  LIMITE_DE_TEXTO,
  normalizarRota,
  pareceDadoPessoal,
} from "@/lib/analytics/taxonomia";

/* ============================================================================
   Taxonomia de eventos

   O que estes testes protegem é um vazamento, não uma métrica: o caminho mais
   comum de dado pessoal sair de uma plataforma é um campo de texto livre
   entrando num provedor de analytics sem ninguém decidir isso.
   ============================================================================ */

describe("EVENTOS", () => {
  it("traz os nomes exigidos pelo escopo", () => {
    for (const nome of [
      "home_view",
      "catalog_view",
      "search",
      "product_view",
      "quote_click",
      "add_to_cart",
      "checkout_start",
      "purchase",
      "assistance_start",
      "assistance_submit",
      "whatsapp_click",
      "phone_click",
      "downtime_calculated",
      "maintenance_lead",
      "clinic_signup",
      "equipment_registered",
      "quote_approved",
      "document_downloaded",
      "review_requested",
    ] as const) {
      expect(EVENTOS, nome).toContain(nome);
    }
  });

  it("as cinco etapas de assistência têm identificador estável", () => {
    // uma reorganização visual do SOS não pode mudar o significado da métrica
    for (let i = 1; i <= 5; i++) {
      expect(EVENTOS).toContain(`assistance_step_${i}`);
    }
  });

  it("não há nome repetido", () => {
    expect(new Set(EVENTOS).size).toBe(EVENTOS.length);
  });
});

describe("pareceDadoPessoal", () => {
  it("reconhece e-mail, CPF, CNPJ e telefone", () => {
    expect(pareceDadoPessoal("maria@clinica.com.br")).toBe("e-mail");
    expect(pareceDadoPessoal("123.456.789-09")).toBe("documento");
    expect(pareceDadoPessoal("12.345.678/0001-99")).toBe("cnpj");
    expect(pareceDadoPessoal("(11) 98888-1234")).toBe("telefone");
  });

  it("reconhece sequência longa de dígitos — serial, documento sem máscara", () => {
    expect(pareceDadoPessoal("12345678901")).toBeTruthy();
  });

  it("deixa passar termo de busca comum", () => {
    expect(pareceDadoPessoal("autoclave 21 litros")).toBeNull();
    expect(pareceDadoPessoal("compressor fazendo barulho")).toBeNull();
  });
});

describe("limparPayload", () => {
  it("mantém os campos permitidos", () => {
    const { payload, descartados } = limparPayload({
      sku: "AUTO-21",
      valor_centavos: 529000,
      quantidade: 1,
    });
    expect(payload).toEqual({ sku: "AUTO-21", valor_centavos: 529000, quantidade: 1 });
    expect(descartados).toEqual([]);
  });

  it("derruba campo fora da lista de permissão", () => {
    // lista de permissão, e não de proibição: um campo novo nasce bloqueado
    const { payload, descartados } = limparPayload({
      email: "maria@clinica.com.br",
      nome: "Maria",
      cpf: "123.456.789-09",
      serial: "ABC123456",
      sku: "AUTO-21",
    });
    expect(payload).toEqual({ sku: "AUTO-21" });
    expect(descartados.map((d) => d.campo).sort()).toEqual(["cpf", "email", "nome", "serial"]);
  });

  it("derruba texto que parece dado pessoal mesmo em campo permitido", () => {
    // é o caso real: gente digita CPF e telefone no campo de busca
    const { payload, descartados } = limparPayload({ termo: "meu cpf é 123.456.789-09" });
    expect(payload.termo).toBeUndefined();
    expect(descartados[0]?.motivo).toContain("documento");
  });

  it("não mascara — descarta inteiro", () => {
    // um CPF com os últimos dígitos trocados por asterisco continua sendo um
    // CPF quase inteiro dentro do provedor
    const { payload } = limparPayload({ termo: "maria@clinica.com.br" });
    expect(payload.termo).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("@");
  });

  it("corta texto longo", () => {
    const { payload } = limparPayload({ termo: "a".repeat(500) });
    expect((payload.termo as string).length).toBe(LIMITE_DE_TEXTO);
  });

  it("derruba número não finito em vez de mandar NaN", () => {
    const { payload, descartados } = limparPayload({ valor_centavos: Number.NaN });
    expect(payload.valor_centavos).toBeUndefined();
    expect(descartados[0]?.motivo).toContain("não finito");
  });

  it("ignora vazio, nulo e indefinido sem reclamar", () => {
    const { payload, descartados } = limparPayload({ sku: "", marca: null, categoria: undefined });
    expect(payload).toEqual({});
    expect(descartados).toEqual([]);
  });
});

describe("normalizarRota", () => {
  it("tira o número do pedido da rota", () => {
    expect(normalizarRota("/pedido/JB-2026-0042")).toBe("/pedido/[numero]");
    expect(normalizarRota("/chamado/AT-2026-0007")).toBe("/chamado/[numero]");
  });

  it("tira identificador opaco", () => {
    expect(normalizarRota("/minha-jb/equipamentos/clx8h2k9a0001")).toBe(
      "/minha-jb/equipamentos/[id]",
    );
  });

  it("tira busca e âncora", () => {
    expect(normalizarRota("/busca?q=autoclave#topo")).toBe("/busca");
  });

  it("preserva rota pública sem identificador", () => {
    expect(normalizarRota("/loja/autoclave-21-litros")).toBe("/loja/autoclave-21-litros");
    expect(normalizarRota("/")).toBe("/");
  });

  it("normaliza a barra do fim", () => {
    expect(normalizarRota("/sobre/")).toBe("/sobre");
  });
});

describe("idDaOcorrencia", () => {
  it("é o mesmo para a mesma referência de negócio", () => {
    // webhook e reconsulta manual do mesmo pedido produzem UM purchase
    expect(idDaOcorrencia("purchase", "pedido-1")).toBe(idDaOcorrencia("purchase", "pedido-1"));
  });

  it("muda com a referência", () => {
    expect(idDaOcorrencia("purchase", "pedido-1")).not.toBe(
      idDaOcorrencia("purchase", "pedido-2"),
    );
  });
});
