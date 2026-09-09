import "server-only";

import {
  cancelarPedido as cancelarPedidoBase,
  confirmarPagamento as confirmarPagamentoBase,
  estornarPedido as estornarPedidoBase,
} from "@/lib/pedido-base";
import {
  cancelarEtiquetasMelhorEnvio,
  processarPedidoMelhorEnvio,
} from "@/lib/melhor-envio";
import { prisma } from "@/lib/prisma";

// Todo o domínio continua em pedido-base. Este arquivo é a borda de efeitos
// externos: estoque/pagamento confirmam primeiro no banco; logística acontece
// depois e nunca mantém a transação do pedido aberta durante uma chamada HTTP.
export * from "@/lib/pedido-base";

export async function confirmarPagamento(pedidoId: string) {
  await confirmarPagamentoBase(pedidoId);

  const pedido = await prisma.order.findUnique({
    where: { id: pedidoId },
    select: { paidAt: true, shippingLabel: true },
  });
  if (!pedido?.paidAt || !pedido.shippingLabel.startsWith("Melhor Envio · ")) return;

  const resultado = await processarPedidoMelhorEnvio(pedidoId);
  if (!resultado.ok && !("pendingInvoice" in resultado && resultado.pendingInvoice)) {
    console.error("[pedido/logistica] etiqueta não concluída:", resultado.error);
  }
}

export async function cancelarPedido(pedidoId: string, motivo: string, userId?: string) {
  await cancelarPedidoBase(pedidoId, motivo, userId);

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    // Cancelar a venda não pode falhar só porque a transportadora está fora.
    // A pendência fica gravada nos metadados do pedido para retry/manual.
    console.error("[pedido/logistica] cancelamento de etiqueta pendente:", resultado.error);
  }
}

export async function estornarPedido(pedidoId: string, motivo: string, userId?: string) {
  await estornarPedidoBase(pedidoId, motivo, userId);

  const resultado = await cancelarEtiquetasMelhorEnvio(pedidoId, motivo);
  if (!resultado.ok) {
    console.error("[pedido/logistica] cancelamento após estorno pendente:", resultado.error);
  }
}
