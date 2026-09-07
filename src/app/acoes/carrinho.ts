"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessaoCliente } from "@/lib/auth-cliente";
import { obterOuCriarCarrinho } from "@/lib/carrinho";
import { prisma } from "@/lib/prisma";

export type EstadoCarrinho = {
  ok?: string;
  erro?: string;
  /** O que a pessoa digitou, devolvido para o campo não voltar vazio no erro. */
  codigo?: string;
};

const adicionar = z.object({
  produtoId: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).max(99).default(1),
  addons: z.array(z.string()).default([]),
});

/**
 * Adiciona ao carrinho. Preço nunca vem do formulário — o servidor lê do
 * banco na hora de fechar o pedido. Aqui só se guarda o que e quanto.
 */
export async function adicionarAoCarrinho(
  _anterior: EstadoCarrinho,
  formData: FormData,
): Promise<EstadoCarrinho> {
  const dados = adicionar.safeParse({
    produtoId: formData.get("produtoId"),
    quantidade: formData.get("quantidade"),
    addons: formData.getAll("addons").map(String).filter(Boolean),
  });
  if (!dados.success) return { erro: "Não foi possível adicionar este item." };

  const produto = await prisma.product.findUnique({
    where: { id: dados.data.produtoId },
    select: {
      id: true,
      name: true,
      status: true,
      trackInventory: true,
      stock: true,
      unique: true,
      allowDirectPurchase: true,
    },
  });

  if (!produto || produto.status !== "active" || !produto.allowDirectPurchase) {
    return { erro: "Este item não está disponível para compra direta." };
  }

  const cliente = await sessaoCliente();
  const carrinho = await obterOuCriarCarrinho(cliente?.id);

  const jaNoCarrinho = carrinho.items.find(
    (i) => i.productId === produto.id && !i.parentId,
  );
  const quantidadeFinal = (jaNoCarrinho?.quantity ?? 0) + dados.data.quantidade;

  if (produto.trackInventory && quantidadeFinal > produto.stock) {
    return {
      erro:
        produto.stock <= 0
          ? "Este item está sem estoque."
          : `Temos apenas ${produto.stock} ${produto.stock === 1 ? "unidade" : "unidades"} deste item.`,
    };
  }
  if (produto.unique && quantidadeFinal > 1) {
    return { erro: "Este é um item único — só existe uma unidade." };
  }

  const item = jaNoCarrinho
    ? await prisma.cartItem.update({
        where: { id: jaNoCarrinho.id },
        data: { quantity: quantidadeFinal },
      })
    : await prisma.cartItem.create({
        data: { cartId: carrinho.id, productId: produto.id, quantity: dados.data.quantidade },
      });

  // serviços adicionais entram como filhos do item, para ficarem auditáveis
  if (dados.data.addons.length) {
    const permitidos = await prisma.productAddon.findMany({
      where: { productId: produto.id, serviceId: { in: dados.data.addons } },
      select: { serviceId: true },
    });

    for (const addon of permitidos) {
      const existe = carrinho.items.find(
        (i) => i.parentId === item.id && i.serviceId === addon.serviceId,
      );
      if (!existe) {
        await prisma.cartItem.create({
          data: {
            cartId: carrinho.id,
            serviceId: addon.serviceId,
            parentId: item.id,
            quantity: 1,
          },
        });
      }
    }
  }

  revalidatePath("/carrinho");
  revalidatePath("/", "layout");
  return { ok: `${produto.name} foi adicionado ao carrinho.` };
}

export async function alterarQuantidade(itemId: string, quantidade: number) {
  const cliente = await sessaoCliente();
  const carrinho = await obterOuCriarCarrinho(cliente?.id);

  // o item precisa pertencer ao carrinho desta sessão
  const item = carrinho.items.find((i) => i.id === itemId);
  if (!item) return;

  if (quantidade <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const estoque = item.product?.trackInventory ? (item.product?.stock ?? 0) : 9999;
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(quantidade, estoque) },
    });
  }

  revalidatePath("/carrinho");
  revalidatePath("/", "layout");
}

export async function removerDoCarrinho(itemId: string) {
  const cliente = await sessaoCliente();
  const carrinho = await obterOuCriarCarrinho(cliente?.id);
  if (!carrinho.items.some((i) => i.id === itemId)) return;

  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/carrinho");
  revalidatePath("/", "layout");
}

export async function aplicarCupom(
  _anterior: EstadoCarrinho,
  formData: FormData,
): Promise<EstadoCarrinho> {
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const cliente = await sessaoCliente();
  const carrinho = await obterOuCriarCarrinho(cliente?.id);

  if (!codigo) {
    await prisma.cart.update({ where: { id: carrinho.id }, data: { couponId: null } });
    revalidatePath("/carrinho");
    return { ok: "Cupom removido." };
  }

  const cupom = await prisma.coupon.findUnique({ where: { code: codigo } });
  const agora = new Date();

  if (
    !cupom ||
    !cupom.active ||
    (cupom.endsAt && cupom.endsAt < agora) ||
    (cupom.startsAt && cupom.startsAt > agora) ||
    (cupom.maxUses !== null && cupom.usedCount >= cupom.maxUses)
  ) {
    /* Devolve o código junto do erro. Depois de uma ação o React reseta o
       formulário, e sem isto o campo voltava vazio: quem errou uma letra
       perdia o que digitou e não tinha como conferir o próprio erro. */
    return { erro: "Cupom inválido ou expirado.", codigo };
  }

  await prisma.cart.update({ where: { id: carrinho.id }, data: { couponId: cupom.id } });
  revalidatePath("/carrinho");
  return { ok: "Cupom aplicado." };
}
