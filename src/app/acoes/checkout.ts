"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sessaoCliente } from "@/lib/auth-cliente";
import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { proximoCodigo } from "@/lib/codigos";
import { prisma } from "@/lib/prisma";

export type EstadoCheckout = { erro?: string };

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do comprador."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().min(8, "Informe um telefone para contato."),
  tipo: z.enum(["fisica", "juridica"]).default("fisica"),
  documento: z.string().trim().max(30).default(""),
  empresa: z.string().trim().max(160).default(""),
  entrega: z.enum(["retirada", "sob_orcamento"]).default("retirada"),
  cep: z.string().trim().max(20).default(""),
  endereco: z.string().trim().max(180).default(""),
  numero: z.string().trim().max(30).default(""),
  complemento: z.string().trim().max(120).default(""),
  bairro: z.string().trim().max(120).default(""),
  cidade: z.string().trim().max(120).default(""),
  estado: z.string().trim().max(2).default(""),
  referencia: z.string().trim().max(180).default(""),
  pagamento: z.enum(["pix", "cartao", "boleto"]).default("pix"),
  observacao: z.string().trim().max(1000).default(""),
});

export async function finalizarCheckout(
  _anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  const dados = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    tipo: formData.get("tipo") ?? "fisica",
    documento: formData.get("documento") ?? "",
    empresa: formData.get("empresa") ?? "",
    entrega: formData.get("entrega") ?? "retirada",
    cep: formData.get("cep") ?? "",
    endereco: formData.get("endereco") ?? "",
    numero: formData.get("numero") ?? "",
    complemento: formData.get("complemento") ?? "",
    bairro: formData.get("bairro") ?? "",
    cidade: formData.get("cidade") ?? "",
    estado: String(formData.get("estado") ?? "").toUpperCase(),
    referencia: formData.get("referencia") ?? "",
    pagamento: formData.get("pagamento") ?? "pix",
    observacao: formData.get("observacao") ?? "",
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados do pedido." };
  }

  if (dados.data.entrega === "sob_orcamento") {
    const faltandoEndereco =
      !dados.data.cep ||
      !dados.data.endereco ||
      !dados.data.numero ||
      !dados.data.cidade ||
      !dados.data.estado;
    if (faltandoEndereco) {
      return { erro: "Para entrega, informe CEP, endereço, número, cidade e UF." };
    }
  }

  const carrinho = await lerCarrinho();
  const totais = calcularTotais(carrinho);
  if (!carrinho || totais.linhas.length === 0) {
    return { erro: "Seu carrinho está vazio." };
  }

  const sessao = await sessaoCliente();
  const email = dados.data.email.toLowerCase();
  let numeroPedido = "";

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      const numero = await proximoCodigo("pedido", tx);
      const principais = carrinho.items.filter((item) => !item.parentId);

      let subtotalCents = 0;
      const itensPreparados: Array<{
        cartItemId: string;
        kind: "produto" | "servico";
        productId: string | null;
        serviceId: string | null;
        name: string;
        sku: string;
        brandName: string;
        modelName: string;
        condition: "novo" | "seminovo" | "usado" | "recondicionado" | null;
        imageUrl: string;
        unitPriceCents: number;
        quantity: number;
        totalCents: number;
        trackInventory: boolean;
        unique: boolean;
      }> = [];

      for (const item of principais) {
        if (item.productId) {
          const produto = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              brand: true,
              media: { orderBy: { order: "asc" }, take: 1, include: { media: true } },
            },
          });

          if (!produto || produto.status !== "active" || !produto.allowDirectPurchase) {
            throw new Error("Um dos equipamentos não está mais disponível para compra direta.");
          }
          if (produto.trackInventory && produto.stock < item.quantity) {
            throw new Error(`O estoque de ${produto.name} mudou. Revise o carrinho antes de continuar.`);
          }
          if (produto.unique && item.quantity !== 1) {
            throw new Error(`${produto.name} é uma unidade única.`);
          }

          const addons = carrinho.items.filter((a) => a.parentId === item.id);
          const addonsCents = addons.reduce(
            (soma, addon) => soma + (addon.service?.priceCents ?? 0) * item.quantity,
            0,
          );
          const total = produto.priceCents * item.quantity + addonsCents;
          subtotalCents += total;

          itensPreparados.push({
            cartItemId: item.id,
            kind: "produto",
            productId: produto.id,
            serviceId: null,
            name: produto.name,
            sku: produto.sku,
            brandName: produto.brand?.name ?? "",
            modelName: produto.model,
            condition: produto.condition,
            imageUrl: produto.media[0]?.media.url ?? "",
            unitPriceCents: produto.priceCents,
            quantity: item.quantity,
            totalCents: produto.priceCents * item.quantity,
            trackInventory: produto.trackInventory,
            unique: produto.unique,
          });

          for (const addon of addons) {
            const servico = addon.serviceId
              ? await tx.service.findUnique({ where: { id: addon.serviceId } })
              : null;
            if (!servico || !servico.published) continue;
            const preco = servico.priceCents ?? 0;
            itensPreparados.push({
              cartItemId: addon.id,
              kind: "servico",
              productId: null,
              serviceId: servico.id,
              name: servico.name,
              sku: "",
              brandName: "",
              modelName: "",
              condition: null,
              imageUrl: "",
              unitPriceCents: preco,
              quantity: item.quantity,
              totalCents: preco * item.quantity,
              trackInventory: false,
              unique: false,
            });
          }
        } else if (item.serviceId) {
          const servico = await tx.service.findUnique({ where: { id: item.serviceId } });
          if (!servico || !servico.published) {
            throw new Error("Um dos serviços selecionados não está mais disponível.");
          }
          const preco = servico.priceCents ?? 0;
          subtotalCents += preco * item.quantity;
          itensPreparados.push({
            cartItemId: item.id,
            kind: "servico",
            productId: null,
            serviceId: servico.id,
            name: servico.name,
            sku: "",
            brandName: "",
            modelName: "",
            condition: null,
            imageUrl: "",
            unitPriceCents: preco,
            quantity: item.quantity,
            totalCents: preco * item.quantity,
            trackInventory: false,
            unique: false,
          });
        }
      }

      let descontoCents = 0;
      const cupom = carrinho.coupon;
      if (cupom) {
        const agora = new Date();
        const valido =
          cupom.active &&
          (!cupom.startsAt || cupom.startsAt <= agora) &&
          (!cupom.endsAt || cupom.endsAt >= agora) &&
          (cupom.maxUses === null || cupom.usedCount < cupom.maxUses) &&
          subtotalCents >= cupom.minSubtotalCents;
        if (valido) {
          descontoCents =
            cupom.kind === "percentual"
              ? Math.floor((subtotalCents * cupom.value) / 100)
              : Math.min(cupom.value, subtotalCents);
        }
      }

      const aguardandoFrete = dados.data.entrega === "sob_orcamento";
      const status = aguardandoFrete ? "aguardando_frete" : "aguardando_pagamento";
      const totalCents = Math.max(0, subtotalCents - descontoCents);

      const ordem = await tx.order.create({
        data: {
          number: numero,
          status,
          customerId: sessao?.id ?? null,
          buyerName: dados.data.nome,
          buyerEmail: email,
          buyerPhone: dados.data.telefone,
          buyerDocument: dados.data.documento.replace(/\D/g, ""),
          personType: dados.data.tipo,
          companyName: dados.data.empresa,
          shippingKind: dados.data.entrega,
          shippingLabel: aguardandoFrete ? "Entrega a combinar com a JB" : "Retirada na JB",
          shipZip: dados.data.cep,
          shipStreet: dados.data.endereco,
          shipNumber: dados.data.numero,
          shipComplement: dados.data.complemento,
          shipDistrict: dados.data.bairro,
          shipCity: dados.data.cidade,
          shipState: dados.data.estado,
          shipReference: dados.data.referencia,
          subtotalCents,
          discountCents: descontoCents,
          shippingCents: 0,
          totalCents,
          couponId: cupom && descontoCents > 0 ? cupom.id : null,
          couponCode: cupom && descontoCents > 0 ? cupom.code : "",
          customerNote: dados.data.observacao,
          events: {
            create: {
              status,
              note: aguardandoFrete
                ? "Pedido recebido. A JB vai confirmar a logística antes do pagamento."
                : "Pedido recebido. Pagamento pendente.",
              visibleToCustomer: true,
            },
          },
        },
      });

      const itemPedidoPorCarrinho = new Map<string, string>();

      for (const preparado of itensPreparados) {
        const parentCartId =
          carrinho.items.find((i) => i.id === preparado.cartItemId)?.parentId ?? null;
        const parentOrderId = parentCartId
          ? itemPedidoPorCarrinho.get(parentCartId) ?? null
          : null;

        const itemPedido = await tx.orderItem.create({
          data: {
            orderId: ordem.id,
            kind: preparado.kind,
            productId: preparado.productId,
            serviceId: preparado.serviceId,
            parentId: parentOrderId,
            name: preparado.name,
            sku: preparado.sku,
            brandName: preparado.brandName,
            modelName: preparado.modelName,
            condition: preparado.condition,
            imageUrl: preparado.imageUrl,
            unitPriceCents: preparado.unitPriceCents,
            quantity: preparado.quantity,
            totalCents: preparado.totalCents,
          },
        });
        itemPedidoPorCarrinho.set(preparado.cartItemId, itemPedido.id);

        if (preparado.productId && preparado.trackInventory) {
          const atualizado = await tx.product.updateMany({
            where: { id: preparado.productId, stock: { gte: preparado.quantity } },
            data: { stock: { decrement: preparado.quantity } },
          });
          if (atualizado.count !== 1) {
            throw new Error(`O estoque de ${preparado.name} mudou durante a compra. Revise o carrinho.`);
          }

          await tx.inventoryMovement.create({
            data: {
              productId: preparado.productId,
              kind: "reserva",
              quantity: preparado.quantity,
              reason: `Reserva do pedido ${ordem.number}`,
              orderId: ordem.id,
            },
          });

          if (preparado.unique) {
            const unidade = await tx.inventoryUnit.findFirst({
              where: { productId: preparado.productId, status: "disponivel" },
              orderBy: { createdAt: "asc" },
            });
            if (unidade) {
              await tx.inventoryUnit.update({
                where: { id: unidade.id },
                data: { status: "reservado", orderItemId: itemPedido.id },
              });
            }
          }
        }
      }

      if (cupom && descontoCents > 0) {
        await tx.coupon.update({
          where: { id: cupom.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      if (!aguardandoFrete) {
        await tx.payment.create({
          data: {
            orderId: ordem.id,
            provider: "manual",
            method: dados.data.pagamento,
            status: "pendente",
            amountCents: totalCents,
          },
        });
      }

      await tx.cart.delete({ where: { id: carrinho.id } });
      return ordem;
    });

    numeroPedido = pedido.number;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível concluir o pedido.";
    return { erro: mensagem };
  }

  redirect(`/pedido-confirmado?pedido=${encodeURIComponent(numeroPedido)}`);
}
