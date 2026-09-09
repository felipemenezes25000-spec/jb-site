import "server-only";

import { lerMetaMelhorEnvio } from "@/lib/logistica-meta";
import {
  cancelarEtiquetasMelhorEnvio,
  processarPendenciasMelhorEnvio as processarAtivas,
} from "@/lib/melhor-envio-core";
import { prisma } from "@/lib/prisma";

/**
 * Worker completo: além de emitir/rastrear pedidos ativos, volta em etiquetas
 * de pedidos encerrados cujo cancelamento falhou por indisponibilidade externa.
 */
export async function processarPendenciasMelhorEnvio(limite = 20) {
  const teto = Math.min(100, Math.max(1, limite));
  const ativos = await processarAtivas(teto);

  const encerrados = await prisma.order.findMany({
    where: {
      status: { in: ["cancelado", "reembolsado"] },
      shippingLabel: { startsWith: "Melhor Envio · " },
    },
    orderBy: { updatedAt: "asc" },
    take: teto,
    select: { id: true, internalNote: true, number: true },
  });

  let cancelados = 0;
  let cancelamentosFalhos = 0;
  for (const pedido of encerrados) {
    const meta = lerMetaMelhorEnvio(pedido.internalNote);
    const ids = meta?.providerOrderIds ?? meta?.providerShipments?.map((item) => item.id) ?? [];
    if (ids.length === 0 || meta?.status === "cancelado") continue;

    // Sem etiqueta comprada/gerada não há o que pedir de volta à transportadora.
    // Com ID presente, tenta novamente inclusive quando a passada anterior caiu
    // antes de conseguir gravar `cancelamento_pendente`.
    const resultado = await cancelarEtiquetasMelhorEnvio(
      pedido.id,
      `Pedido ${pedido.number} encerrado na JB`,
    );
    if (resultado.ok) cancelados += 1;
    else cancelamentosFalhos += 1;
  }

  return {
    ...ativos,
    cancelados,
    cancelamentosFalhos,
  };
}
