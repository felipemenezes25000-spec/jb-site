import "server-only";

import { ProvedorMercadoPago } from "@/lib/pagamento/mercadopago";
import { ProvedorMock } from "@/lib/pagamento/mock";
import type { ProvedorPagamento } from "@/lib/pagamento/tipos";
import { simulacaoPagamentoPermitida } from "@/lib/seguranca-ambiente";

export * from "@/lib/pagamento/tipos";

/**
 * Escolhe o provedor conforme o ambiente.
 *
 * A regra dura: o provedor de teste jamais entra em produção Vercel. Em uma
 * demonstração auto-hospedada com NODE_ENV=production, ele só entra com opt-in
 * explícito. A mesma decisão é usada pela rota de simulação e pelas travas de
 * ambiente, evitando três versões diferentes de "isto é produção?".
 */
let instancia: ProvedorPagamento | null = null;

export function pagamentoEhSimulado() {
  return (
    (process.env.PAYMENT_PROVIDER ?? "mock") === "mock" &&
    simulacaoPagamentoPermitida(process.env)
  );
}

export function provedorPagamento(): ProvedorPagamento {
  if (instancia) return instancia;

  const escolhido = process.env.PAYMENT_PROVIDER ?? "mock";
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (escolhido === "mercadopago") {
    if (!token) {
      throw new Error(
        "PAYMENT_PROVIDER=mercadopago exige MERCADO_PAGO_ACCESS_TOKEN no ambiente.",
      );
    }
    const mp = new ProvedorMercadoPago(token, process.env.MERCADO_PAGO_WEBHOOK_SECRET);
    instancia = mp;
    return mp;
  }

  if (!simulacaoPagamentoPermitida(process.env)) {
    throw new Error(
      "Produção não pode usar o provedor de teste. Configure PAYMENT_PROVIDER e as credenciais.",
    );
  }

  const mock = new ProvedorMock();
  instancia = mock;
  return mock;
}
