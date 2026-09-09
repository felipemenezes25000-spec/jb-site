"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { somenteDigitos } from "@/lib/format";
import { salvarNfeMelhorEnvio } from "@/lib/melhor-envio-admin";
import {
  atualizarRastreioMelhorEnvio,
  cotacoesMelhorEnvio,
  processarPedidoMelhorEnvio,
  statusMelhorEnvio,
} from "@/lib/melhor-envio";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export type EstadoLogistica = {
  ok?: boolean;
  erro?: string;
  mensagem?: string;
  campo?: string;
  opcoes?: {
    serviceId: number;
    companyName: string;
    serviceName: string;
    priceCents: number;
    deliveryDays: number | null;
  }[];
  labelUrl?: string;
};

const inteiroPositivo = (max: number, nome: string) =>
  z.coerce
    .number()
    .int(`${nome} precisa ser um número inteiro.`)
    .min(1, `${nome} precisa ser maior que zero.`)
    .max(max, `${nome} acima do limite aceito.`);

const esquemaDimensoes = z.object({
  productId: z.string().trim().min(1),
  weightGrams: inteiroPositivo(1_000_000, "Peso"),
  widthMm: inteiroPositivo(5_000, "Largura"),
  heightMm: inteiroPositivo(5_000, "Altura"),
  depthMm: inteiroPositivo(5_000, "Comprimento"),
});

export async function salvarDimensoesProduto(
  _anterior: EstadoLogistica,
  formData: FormData,
): Promise<EstadoLogistica> {
  const usuario = await exigirEdicao("frete");
  const dados = esquemaDimensoes.safeParse({
    productId: String(formData.get("productId") ?? ""),
    weightGrams: String(formData.get("weightGrams") ?? ""),
    widthMm: String(formData.get("widthMm") ?? ""),
    heightMm: String(formData.get("heightMm") ?? ""),
    depthMm: String(formData.get("depthMm") ?? ""),
  });
  if (!dados.success) {
    const issue = dados.error.issues[0];
    return { erro: issue?.message ?? "Confira as dimensões.", campo: String(issue?.path[0] ?? "") };
  }

  const antes = await prisma.product.findUnique({
    where: { id: dados.data.productId },
    select: {
      id: true,
      name: true,
      slug: true,
      weightGrams: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
    },
  });
  if (!antes) return { erro: "Produto não encontrado." };

  const depois = await prisma.product.update({
    where: { id: antes.id },
    data: {
      weightGrams: dados.data.weightGrams,
      widthMm: dados.data.widthMm,
      heightMm: dados.data.heightMm,
      depthMm: dados.data.depthMm,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      weightGrams: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
    },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "produto",
    entidadeId: depois.id,
    antes,
    depois,
    resumo: `Atualizou peso e dimensões de transporte de ${depois.name}`,
  });

  revalidatePath("/admin/frete");
  revalidatePath(`/admin/produtos/${depois.id}`);
  revalidatePath(`/loja/${depois.slug}`);
  return { ok: true, mensagem: "Peso e dimensões salvos. O cálculo já passa a usar estes dados." };
}

export async function testarCotacaoProduto(
  _anterior: EstadoLogistica,
  formData: FormData,
): Promise<EstadoLogistica> {
  await exigirEdicao("frete");
  const productId = String(formData.get("productId") ?? "").trim();
  const cep = somenteDigitos(String(formData.get("cep") ?? ""));
  if (!productId) return { erro: "Escolha um produto.", campo: "productId" };
  if (cep.length !== 8) return { erro: "Informe um CEP com 8 dígitos.", campo: "cep" };

  const produto = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      weightGrams: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
    },
  });
  if (!produto) return { erro: "Produto não encontrado." };

  try {
    const opcoes = await cotacoesMelhorEnvio({
      postalCode: cep,
      items: [
        {
          id: produto.id,
          name: produto.name,
          quantity: 1,
          unitPriceCents: produto.priceCents,
          weightGrams: produto.weightGrams,
          widthMm: produto.widthMm,
          heightMm: produto.heightMm,
          depthMm: produto.depthMm,
        },
      ],
    });
    return {
      ok: true,
      mensagem: opcoes.length
        ? `${opcoes.length} modalidade(s) disponível(is).`
        : "Nenhuma modalidade disponível.",
      opcoes: opcoes.map((item) => ({
        serviceId: item.serviceId,
        companyName: item.companyName,
        serviceName: item.serviceName,
        priceCents: item.priceCents,
        deliveryDays: item.deliveryDays,
      })),
    };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Não foi possível testar a cotação." };
  }
}

async function revalidarPedido(orderId: string) {
  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true },
  });
  revalidatePath("/admin/frete");
  revalidatePath(`/admin/pedidos/${orderId}`);
  if (pedido) {
    revalidatePath(`/pedido/${pedido.number}`);
    revalidatePath(`/minha-jb/pedidos/${pedido.number}`);
  }
}

export async function gerarEtiquetaPedido(
  _anterior: EstadoLogistica,
  formData: FormData,
): Promise<EstadoLogistica> {
  await exigirEdicao("frete");
  const orderId = String(formData.get("orderId") ?? "").trim();
  const invoiceKey = somenteDigitos(String(formData.get("invoiceKey") ?? ""));
  if (!orderId) return { erro: "Pedido não informado." };

  const pedido = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, shippingLabel: true, paidAt: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (!pedido.paidAt) return { erro: "O pedido precisa estar pago antes de comprar a etiqueta." };
  if (!pedido.shippingLabel.startsWith("Melhor Envio · ")) {
    return { erro: "Este pedido não usa Melhor Envio." };
  }

  const status = statusMelhorEnvio();
  if (!status.nonCommercial) {
    const salvo = await salvarNfeMelhorEnvio(orderId, invoiceKey);
    if (!salvo.ok) return { erro: salvo.error, campo: "invoiceKey" };
  }

  const resultado = await processarPedidoMelhorEnvio(orderId);
  await revalidarPedido(orderId);
  if (!resultado.ok) return { erro: resultado.error };
  return {
    ok: true,
    mensagem: "Etiqueta comprada e gerada no Melhor Envio.",
    labelUrl: "labelUrl" in resultado ? resultado.labelUrl : undefined,
  };
}

export async function reprocessarEtiquetaPedido(
  _anterior: EstadoLogistica,
  formData: FormData,
): Promise<EstadoLogistica> {
  await exigirEdicao("frete");
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { erro: "Pedido não informado." };
  const resultado = await processarPedidoMelhorEnvio(orderId);
  await revalidarPedido(orderId);
  return resultado.ok
    ? {
        ok: true,
        mensagem: "Logística reprocessada.",
        labelUrl: "labelUrl" in resultado ? resultado.labelUrl : undefined,
      }
    : { erro: resultado.error };
}

export async function atualizarRastreioPedido(
  _anterior: EstadoLogistica,
  formData: FormData,
): Promise<EstadoLogistica> {
  await exigirEdicao("frete");
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return { erro: "Pedido não informado." };
  const resultado = await atualizarRastreioMelhorEnvio(orderId);
  await revalidarPedido(orderId);
  return resultado.ok
    ? { ok: true, mensagem: "Rastreio atualizado." }
    : { erro: resultado.error };
}
