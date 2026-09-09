import "server-only";

import { somenteDigitos } from "@/lib/format";
import {
  escreverMetaMelhorEnvio,
  lerMetaMelhorEnvio,
  type MetaMelhorEnvio,
} from "@/lib/logistica-meta";
import { prisma } from "@/lib/prisma";

/**
 * Atualiza só a NF-e sem apagar IDs, lock, rastreio ou erro escrito por outra
 * execução. O compare-and-swap pela `internalNote` fecha a corrida com worker,
 * webhook e botão de reprocessar.
 */
export async function salvarNfeMelhorEnvio(orderId: string, chaveBruta: string) {
  const invoiceKey = somenteDigitos(chaveBruta);
  if (invoiceKey.length !== 44) {
    return { ok: false as const, error: "Informe a chave de 44 dígitos da NF-e." };
  }

  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const pedido = await prisma.order.findUnique({
      where: { id: orderId },
      select: { internalNote: true },
    });
    if (!pedido) return { ok: false as const, error: "Pedido não encontrado." };

    const atual = lerMetaMelhorEnvio(pedido.internalNote) ?? ({ provider: "melhor_envio" } satisfies MetaMelhorEnvio);
    const proxima: MetaMelhorEnvio = {
      ...atual,
      provider: "melhor_envio",
      invoiceKey,
      error: "",
      status: atual.status === "aguardando_nfe" ? "pendente" : atual.status,
    };
    const nota = escreverMetaMelhorEnvio(pedido.internalNote, proxima);
    const mudou = await prisma.order.updateMany({
      where: { id: orderId, internalNote: pedido.internalNote },
      data: { internalNote: nota },
    });
    if (mudou.count === 1) return { ok: true as const };
  }

  return {
    ok: false as const,
    error: "O pedido está sendo atualizado por outro processo. Tente salvar a NF-e novamente.",
  };
}
