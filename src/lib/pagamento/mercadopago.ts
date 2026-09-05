import crypto from "node:crypto";

import type { PaymentStatus } from "@prisma/client";

import type {
  DadosCobranca,
  EventoWebhook,
  ProvedorPagamento,
  ResultadoCobranca,
} from "@/lib/pagamento/tipos";

const BASE = "https://api.mercadopago.com";

/** Mapeia o vocabulário do Mercado Pago para o estado interno. */
function traduzirStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "aprovado";
    case "authorized":
    case "in_process":
    case "in_mediation":
      return "em_analise";
    case "pending":
      return "pendente";
    case "rejected":
      return "recusado";
    case "cancelled":
      return "cancelado";
    case "refunded":
    case "charged_back":
      return "estornado";
    default:
      return "pendente";
  }
}

/**
 * Mercado Pago — checkout transparente.
 *
 * Implementa criação de Pix e cartão, leitura de webhook com validação de
 * assinatura e consulta. O cartão chega tokenizado pelo SDK do navegador:
 * número completo e CVV nunca passam por este servidor.
 *
 * Precisa de MERCADO_PAGO_ACCESS_TOKEN. Sem ela a fábrica nem instancia este
 * adapter e a plataforma usa o provedor de teste.
 */
export class ProvedorMercadoPago implements ProvedorPagamento {
  readonly nome = "mercadopago";
  readonly metodos = ["pix", "cartao"] as const;

  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret?: string,
  ) {}

  private async chamar(caminho: string, init: RequestInit & { idempotencia?: string } = {}) {
    const { idempotencia, ...resto } = init;
    const resposta = await fetch(`${BASE}${caminho}`, {
      ...resto,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
        ...resto.headers,
      },
    });

    const texto = await resposta.text();
    const corpo = texto ? JSON.parse(texto) : {};
    if (!resposta.ok) {
      // a mensagem do provedor fica no log; ao usuário vai um texto genérico
      console.error("[mercadopago]", resposta.status, corpo);
      throw new Error(corpo?.message ?? "Falha ao falar com o provedor de pagamento.");
    }
    return corpo;
  }

  async criarCobranca(dados: DadosCobranca): Promise<ResultadoCobranca> {
    const [nome, ...sobrenome] = dados.pagador.nome.split(" ");
    const documento = dados.pagador.documento.replace(/\D/g, "");

    const corpo: Record<string, unknown> = {
      transaction_amount: Number((dados.valorCents / 100).toFixed(2)),
      description: `Pedido ${dados.pedidoNumero} — JB Soluções Odontológicas`,
      external_reference: dados.pedidoId,
      payer: {
        email: dados.pagador.email,
        first_name: nome,
        last_name: sobrenome.join(" ") || nome,
        identification: {
          type: documento.length > 11 ? "CNPJ" : "CPF",
          number: documento,
        },
      },
    };

    if (dados.metodo === "pix") {
      corpo.payment_method_id = "pix";
    } else {
      corpo.token = dados.tokenCartao;
      corpo.installments = dados.parcelas;
      corpo.payment_method_id = dados.bandeira;
      corpo.capture = true;
    }

    const resposta = await this.chamar("/v1/payments", {
      method: "POST",
      body: JSON.stringify(corpo),
      idempotencia: dados.chaveIdempotencia,
    });

    const pix = resposta.point_of_interaction?.transaction_data;

    return {
      externalId: String(resposta.id),
      status: traduzirStatus(resposta.status),
      qrCode: pix?.qr_code_base64 ? `data:image/png;base64,${pix.qr_code_base64}` : undefined,
      copiaECola: pix?.qr_code,
      expiraEm: resposta.date_of_expiration ? new Date(resposta.date_of_expiration) : undefined,
      bandeira: resposta.payment_method_id,
      ultimos4: resposta.card?.last_four_digits,
      motivoFalha: resposta.status_detail,
    };
  }

  /**
   * Valida a assinatura antes de aceitar qualquer notificação. Sem isso,
   * qualquer um poderia marcar um pedido como pago com um POST.
   */
  async lerWebhook(request: Request, corpo: string): Promise<EventoWebhook | null> {
    const url = new URL(request.url);
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    const assinatura = request.headers.get("x-signature");
    const requestId = request.headers.get("x-request-id");

    /**
     * Assinatura configurada é assinatura exigida.
     *
     * A condição antiga incluía `assinatura` e `dataId`, que vêm de quem
     * chama: bastava omitir o cabeçalho `x-signature` para pular a conferência
     * inteira e marcar qualquer pedido como pago. Agora, havendo segredo, a
     * ausência do cabeçalho é recusa.
     */
    if (this.webhookSecret) {
      if (!assinatura || !dataId) {
        console.warn("[mercadopago] notificação sem assinatura recusada");
        return null;
      }

      const partes = Object.fromEntries(
        assinatura.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
      );
      const manifesto = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
      const esperado = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(manifesto)
        .digest("hex");

      const recebido = partes.v1 ?? "";
      const iguais =
        recebido.length === esperado.length &&
        crypto.timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));

      if (!iguais) {
        console.warn("[mercadopago] assinatura de webhook inválida");
        return null;
      }
    }

    let evento: { type?: string; action?: string; data?: { id?: string } } = {};
    try {
      evento = corpo ? JSON.parse(corpo) : {};
    } catch {
      return null;
    }

    const id = evento.data?.id ?? dataId;
    if (!id) return null;

    // o webhook só avisa que algo mudou; o estado vem da consulta ao provedor
    const atual = await this.consultar(String(id));
    if (!atual) return null;

    return {
      chave: `mp:${id}:${atual.status}`,
      externalId: String(id),
      status: atual.status,
      tipo: evento.action ?? evento.type ?? "payment",
      bruto: evento,
    };
  }

  async consultar(externalId: string) {
    try {
      const resposta = await this.chamar(`/v1/payments/${externalId}`);
      return { status: traduzirStatus(resposta.status) };
    } catch {
      return null;
    }
  }

  async estornar(externalId: string, valorCents?: number) {
    try {
      await this.chamar(`/v1/payments/${externalId}/refunds`, {
        method: "POST",
        body: JSON.stringify(valorCents ? { amount: valorCents / 100 } : {}),
        idempotencia: `refund_${externalId}_${valorCents ?? "total"}`,
      });
      return true;
    } catch {
      return false;
    }
  }
}
