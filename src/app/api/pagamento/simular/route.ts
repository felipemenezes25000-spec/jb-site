import { z } from "zod";

import { pagamentoEhSimulado } from "@/lib/pagamento";
import { prisma } from "@/lib/prisma";
import { POST as processarWebhook } from "@/app/api/pagamento/webhook/route";

/**
 * Gatilho de simulação de pagamento.
 *
 * Sem adquirente contratado não existe quem chame o webhook — e sem webhook o
 * ciclo do pedido nunca fecha, o que tornaria a plataforma impossível de
 * demonstrar e de testar. Esta rota é o substituto: ela monta a mesma
 * notificação que o provedor mandaria e entrega ao MESMO handler de webhook.
 * Nada de caminho paralelo: se a regra mudar lá, muda aqui junto.
 *
 * A decisão de ambiente não é duplicada aqui: `pagamentoEhSimulado()` já sabe
 * que produção Vercel nunca aceita mock e que self-hosted em produção só aceita
 * com opt-in explícito. Se mock não estiver realmente permitido, a rota se
 * comporta como inexistente.
 */

const esquema = z.object({
  externalId: z.string().trim().min(1),
  status: z.enum([
    "aprovado",
    "recusado",
    "expirado",
    "cancelado",
    "estornado",
    "em_analise",
    "pendente",
  ]),
});

function naoExiste() {
  return Response.json({ erro: "Não encontrado." }, { status: 404 });
}

export async function POST(request: Request) {
  if (!pagamentoEhSimulado()) return naoExiste();

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Envie um JSON válido." }, { status: 400 });
  }

  const dados = esquema.safeParse(corpo);
  if (!dados.success) {
    return Response.json(
      { erro: "Informe externalId e um status conhecido." },
      { status: 400 },
    );
  }

  const pagamento = await prisma.payment.findUnique({
    where: { externalId: dados.data.externalId },
    select: { id: true, provider: true },
  });

  // só se simula o que o provedor de teste criou
  if (!pagamento || pagamento.provider !== "mock") return naoExiste();

  // A chave do evento é derivada de externalId + status pelo próprio provedor
  // de teste, então clicar duas vezes no mesmo desfecho é um no-op de verdade.
  const notificacao = new Request(new URL("/api/pagamento/webhook", request.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      externalId: dados.data.externalId,
      status: dados.data.status,
    }),
  });

  return processarWebhook(notificacao);
}
