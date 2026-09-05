import "server-only";

import { ProvedorMercadoPago } from "@/lib/pagamento/mercadopago";
import { ProvedorMock } from "@/lib/pagamento/mock";
import type { ProvedorPagamento } from "@/lib/pagamento/tipos";

export * from "@/lib/pagamento/tipos";

/**
 * Escolhe o provedor conforme o ambiente.
 *
 * A regra dura: o provedor de teste jamais entra em produção. Se a produção
 * subir sem credencial configurada, a aplicação falha na hora em vez de fingir
 * que cobrou — um pedido "pago" que ninguém cobrou é pior que um erro visível.
 */
let instancia: ProvedorPagamento | null = null;

/**
 * Isto é produção?
 *
 * Depender só de `VERCEL_ENV === "production"` deixava um buraco: fora da
 * Vercel — VPS, Docker, qualquer servidor próprio — a variável não existe, a
 * checagem dava falso e a loja subia com o provedor de teste. Como o webhook
 * do provedor de teste não tem assinatura, qualquer anônimo marcaria qualquer
 * pedido como pago.
 *
 * A regra agora tem duas portas:
 *
 *   · na Vercel, quem manda é VERCEL_ENV — preview e development seguem
 *     livres para demonstrar com o simulador, que é o uso legítimo;
 *   · fora da Vercel, NODE_ENV=production já basta para trancar. Note que na
 *     Vercel o NODE_ENV também é "production" durante o build de um preview,
 *     por isso ele só vale quando VERCEL_ENV está ausente.
 *
 * `PERMITIR_PAGAMENTO_SIMULADO` existe para o caso legítimo de uma
 * demonstração auto-hospedada. É opt-in explícito: ninguém cai nele por
 * descuido, e quem liga sabe que está desligando a trava.
 */
function ehAmbienteDeProducao() {
  if (process.env.PERMITIR_PAGAMENTO_SIMULADO === "1") return false;

  const naVercel = process.env.VERCEL_ENV;
  if (naVercel) return naVercel === "production";

  return process.env.NODE_ENV === "production";
}

export function provedorPagamento(): ProvedorPagamento {
  if (instancia) return instancia;

  const escolhido = process.env.PAYMENT_PROVIDER ?? "mock";
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const emProducao = ehAmbienteDeProducao();

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

  if (emProducao) {
    throw new Error(
      "Produção não pode usar o provedor de teste. Configure PAYMENT_PROVIDER e as credenciais.",
    );
  }

  const mock = new ProvedorMock();
  instancia = mock;
  return mock;
}

/** Para a interface saber o que oferecer sem instanciar o provedor. */
export function pagamentoEhSimulado() {
  return (process.env.PAYMENT_PROVIDER ?? "mock") === "mock";
}
