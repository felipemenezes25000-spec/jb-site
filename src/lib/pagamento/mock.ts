import crypto from "node:crypto";

import type { PaymentStatus } from "@prisma/client";

import type {
  DadosCobranca,
  EventoWebhook,
  ProvedorPagamento,
  ResultadoCobranca,
} from "@/lib/pagamento/tipos";

/**
 * Provedor de teste. Existe para desenvolvimento, demonstração e CI —
 * nenhuma cobrança real acontece.
 *
 * O resultado é decidido pelo valor do pedido, o que dá cenários repetíveis
 * sem depender de sandbox externo:
 *   · centavos terminando em 01 → recusado
 *   · centavos terminando em 02 → pendente (não aprova sozinho)
 *   · qualquer outro valor      → aprovado
 *
 * Pix sempre nasce pendente, como no mundo real, e é confirmado pelo webhook
 * simulado em /api/pagamento/simular.
 */
export class ProvedorMock implements ProvedorPagamento {
  readonly nome = "mock";
  readonly metodos = ["pix", "cartao", "boleto"] as const;

  async criarCobranca(dados: DadosCobranca): Promise<ResultadoCobranca> {
    const externalId = `mock_${crypto.randomBytes(10).toString("hex")}`;
    const final = dados.valorCents % 100;

    if (dados.metodo === "pix") {
      const payload = `00020126580014BR.GOV.BCB.PIX0136${externalId}5204000053039865802BR5913JB SOLUCOES6009SAO PAULO`;
      return {
        externalId,
        status: "pendente",
        qrCode: payload,
        copiaECola: payload,
        expiraEm: new Date(Date.now() + 30 * 60_000),
      };
    }

    if (dados.metodo === "boleto") {
      return { externalId, status: "pendente", expiraEm: new Date(Date.now() + 3 * 86400000) };
    }

    const status: PaymentStatus =
      final === 1 ? "recusado" : final === 2 ? "em_analise" : "aprovado";

    return {
      externalId,
      status,
      bandeira: dados.bandeira ?? "visa",
      ultimos4: "4321",
      motivoFalha: status === "recusado" ? "Cartão recusado pelo emissor (simulação)." : undefined,
    };
  }

  async lerWebhook(_request: Request, corpo: string): Promise<EventoWebhook | null> {
    try {
      const dados = JSON.parse(corpo) as {
        chave?: string;
        externalId?: string;
        status?: PaymentStatus;
      };
      if (!dados.externalId || !dados.status) return null;
      return {
        chave: dados.chave ?? `${dados.externalId}:${dados.status}`,
        externalId: dados.externalId,
        status: dados.status,
        tipo: "simulado",
        bruto: dados,
      };
    } catch {
      return null;
    }
  }

  async consultar(externalId: string) {
    // o mock não guarda estado próprio; quem manda é o que já foi registrado
    return externalId.startsWith("mock_") ? { status: "pendente" as PaymentStatus } : null;
  }

  async estornar() {
    return true;
  }
}
