import { describe, expect, it } from "vitest";
import type { PaymentMethod } from "@prisma/client";

import { ProvedorMock } from "@/lib/pagamento/mock";
import type { DadosCobranca } from "@/lib/pagamento/tipos";

/**
 * Provedor de teste.
 *
 * O desfecho é decidido pelos dois últimos dígitos do valor em centavos, o que
 * torna a demonstração e o e2e repetíveis sem sandbox externo. Se essa regra
 * mudar sem querer, os fluxos que dependem dela quebram em silêncio — daí
 * estes testes.
 */

const provedor = new ProvedorMock();

function cobranca(parcial: Partial<DadosCobranca> = {}): DadosCobranca {
  return {
    pedidoId: "pedido-1",
    pedidoNumero: "JB-0001",
    valorCents: 100000,
    metodo: "cartao",
    parcelas: 1,
    pagador: {
      nome: "Maria Souza",
      email: "maria@example.com",
      documento: "52998224725",
      telefone: "11900000000",
    },
    chaveIdempotencia: "pedido:pedido-1:cartao:pag-1",
    ...parcial,
  };
}

describe("ProvedorMock — identidade", () => {
  it("se anuncia como provedor de teste", () => {
    expect(provedor.nome).toBe("mock");
  });

  it("aceita pix, cartão e boleto", () => {
    // `manual` existe no enum do banco (pagamento registrado pela equipe) mas
    // não é coisa de provedor — por isso a lista é escrita à mão aqui
    const metodos = ["pix", "cartao", "boleto"] as const satisfies readonly PaymentMethod[];
    for (const metodo of metodos) {
      expect(provedor.metodos.includes(metodo), metodo).toBe(true);
    }
  });
});

describe("ProvedorMock — cartão, os três cenários determinísticos", () => {
  it("recusa quando os centavos terminam em 01", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ valorCents: 100001 }));
    expect(resultado.status).toBe("recusado");
    expect(resultado.motivoFalha).toBe("Cartão recusado pelo emissor (simulação).");
  });

  it("manda para análise quando os centavos terminam em 02", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ valorCents: 100002 }));
    expect(resultado.status).toBe("em_analise");
    expect(resultado.motivoFalha).toBeUndefined();
  });

  it("aprova qualquer outro valor", async () => {
    for (const valor of [100000, 100003, 84900, 419099]) {
      const resultado = await provedor.criarCobranca(cobranca({ valorCents: valor }));
      expect(resultado.status, String(valor)).toBe("aprovado");
    }
  });

  it("olha só os dois últimos dígitos, não o valor inteiro", async () => {
    const recusado = await provedor.criarCobranca(cobranca({ valorCents: 1 }));
    expect(recusado.status).toBe("recusado");
    const analise = await provedor.criarCobranca(cobranca({ valorCents: 999902 }));
    expect(analise.status).toBe("em_analise");
  });

  it("devolve bandeira e últimos quatro dígitos, nunca o cartão", async () => {
    const resultado = await provedor.criarCobranca(
      cobranca({ valorCents: 100000, bandeira: "master", tokenCartao: "tok_teste" }),
    );
    expect(resultado.bandeira).toBe("master");
    expect(resultado.ultimos4).toBe("4321");
    expect(JSON.stringify(resultado)).not.toContain("tok_teste");
  });

  it("assume visa quando a bandeira não vem", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ valorCents: 100000 }));
    expect(resultado.bandeira).toBe("visa");
  });

  it("gera um externalId próprio a cada tentativa", async () => {
    const um = await provedor.criarCobranca(cobranca());
    const dois = await provedor.criarCobranca(cobranca());
    expect(um.externalId).toMatch(/^mock_[0-9a-f]{20}$/);
    expect(um.externalId).not.toBe(dois.externalId);
  });
});

describe("ProvedorMock — pix", () => {
  it("nasce pendente, como no mundo real", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ metodo: "pix" }));
    expect(resultado.status).toBe("pendente");
  });

  it("pix não aprova sozinho nem em valor que o cartão aprovaria", async () => {
    const resultado = await provedor.criarCobranca(
      cobranca({ metodo: "pix", valorCents: 100000 }),
    );
    expect(resultado.status).toBe("pendente");
  });

  it("devolve copia-e-cola no formato do BR Code", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ metodo: "pix" }));
    expect(resultado.copiaECola).toContain("BR.GOV.BCB.PIX");
    expect(resultado.copiaECola).toContain(resultado.externalId);
    expect(resultado.qrCode).toBe(resultado.copiaECola);
  });

  it("tem validade no futuro", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ metodo: "pix" }));
    expect(resultado.expiraEm).toBeInstanceOf(Date);
    expect(resultado.expiraEm!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("ProvedorMock — boleto", () => {
  it("nasce pendente e com vencimento adiante", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ metodo: "boleto" }));
    expect(resultado.status).toBe("pendente");
    expect(resultado.expiraEm!.getTime()).toBeGreaterThan(Date.now() + 86400000);
    expect(resultado.copiaECola).toBeUndefined();
  });
});

describe("ProvedorMock — webhook", () => {
  const requisicao = new Request("https://exemplo.test/api/pagamento/webhook", { method: "POST" });

  it("lê a notificação e deriva a chave de idempotência", async () => {
    const corpo = JSON.stringify({ externalId: "mock_abc", status: "aprovado" });
    const evento = await provedor.lerWebhook(requisicao, corpo);
    expect(evento).not.toBeNull();
    expect(evento!.externalId).toBe("mock_abc");
    expect(evento!.status).toBe("aprovado");
    expect(evento!.chave).toBe("mock_abc:aprovado");
    expect(evento!.tipo).toBe("simulado");
  });

  it("dois avisos do mesmo desfecho têm a mesma chave — repetir é no-op", async () => {
    const corpo = JSON.stringify({ externalId: "mock_abc", status: "aprovado" });
    const primeiro = await provedor.lerWebhook(requisicao, corpo);
    const segundo = await provedor.lerWebhook(requisicao, corpo);
    expect(primeiro!.chave).toBe(segundo!.chave);
  });

  it("desfechos diferentes têm chaves diferentes", async () => {
    const aprovado = await provedor.lerWebhook(
      requisicao,
      JSON.stringify({ externalId: "mock_abc", status: "aprovado" }),
    );
    const estornado = await provedor.lerWebhook(
      requisicao,
      JSON.stringify({ externalId: "mock_abc", status: "estornado" }),
    );
    expect(aprovado!.chave).not.toBe(estornado!.chave);
  });

  it("respeita a chave explícita quando ela vem no corpo", async () => {
    const evento = await provedor.lerWebhook(
      requisicao,
      JSON.stringify({ chave: "evento-42", externalId: "mock_abc", status: "aprovado" }),
    );
    expect(evento!.chave).toBe("evento-42");
  });

  it("recusa corpo sem externalId ou sem status", async () => {
    expect(await provedor.lerWebhook(requisicao, JSON.stringify({ status: "aprovado" }))).toBeNull();
    expect(
      await provedor.lerWebhook(requisicao, JSON.stringify({ externalId: "mock_abc" })),
    ).toBeNull();
  });

  it("recusa corpo que não é JSON, sem lançar", async () => {
    expect(await provedor.lerWebhook(requisicao, "não é json")).toBeNull();
    expect(await provedor.lerWebhook(requisicao, "")).toBeNull();
  });
});

describe("ProvedorMock — consulta e estorno", () => {
  it("consulta pagamento criado por ele mesmo", async () => {
    const resultado = await provedor.criarCobranca(cobranca({ metodo: "pix" }));
    expect(await provedor.consultar(resultado.externalId)).toEqual({ status: "pendente" });
  });

  it("não reconhece identificador de outro provedor", async () => {
    expect(await provedor.consultar("mp_1234567890")).toBeNull();
  });

  it("aceita estorno", async () => {
    expect(await provedor.estornar()).toBe(true);
  });
});
