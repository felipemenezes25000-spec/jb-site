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
 *
 * Serviços obrigatórios também nunca dependem do formulário: um cliente
 * alterado pode omitir qualquer hidden input. A fonte de verdade é
 * ProductAddon.required. Se um serviço que precisa entrar no pedido está sob
 * orçamento, a compra direta para antes de criar/alterar qualquer item.
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
      priceCents: true,
      trackInventory: true,
      stock: true,
      unique: true,
      allowDirectPurchase: true,
    },
  });

  if (
    !produto ||
    produto.status !== "active" ||
    !produto.allowDirectPurchase ||
    produto.priceCents <= 0
  ) {
    return { erro: "Este item não está disponível para compra direta." };
  }

  /* Resolve todos os adicionais antes de tocar no carrinho. Além de garantir
     os obrigatórios, isto impede uma compra parcialmente criada quando algum
     serviço selecionado ainda depende de orçamento. */
  const adicionais = await prisma.productAddon.findMany({
    where: { productId: produto.id },
    select: {
      serviceId: true,
      required: true,
      priceCents: true,
      service: { select: { priceCents: true } },
    },
  });

  const porId = new Map(adicionais.map((addon) => [addon.serviceId, addon]));
  const idsFinais = new Set<string>();

  for (const addon of adicionais) {
    if (addon.required) idsFinais.add(addon.serviceId);
  }
  for (const serviceId of dados.data.addons) {
    if (porId.has(serviceId)) idsFinais.add(serviceId);
  }

  const semPreco = [...idsFinais]
    .map((serviceId) => porId.get(serviceId))
    .find((addon) => addon && (addon.priceCents ?? addon.service.priceCents ?? 0) <= 0);

  if (semPreco) {
    return {
      erro: semPreco.required
        ? "Este equipamento possui um serviço obrigatório sob orçamento. Solicite uma proposta para fechar a compra."
        : "Um dos serviços selecionados está sob orçamento. Remova esse serviço ou solicite uma proposta.",
    };
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

  // Serviços entram como filhos do produto para ficarem auditáveis. A lista
  // final já contém todos os required do banco mesmo se o navegador os omitir.
  for (const serviceId of idsFinais) {
    const existe = carrinho.items.find(
      (i) => i.parentId === item.id && i.serviceId === serviceId,
    );
    if (!existe) {
      await prisma.cartItem.create({
        data: {
          cartId: carrinho.id,
          serviceId,
          parentId: item.id,
          quantity: 1,
        },
      });
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

/**
 * Adicionar direto do cartão do catálogo.
 *
 * `adicionarAoCarrinho` tem a forma de `useActionState` — recebe o estado
 * anterior e devolve o novo — e por isso não serve a um `<form action>` puro.
 * O cartão do catálogo tem vinte e quatro instâncias numa página: montar um
 * `useActionState` em cada um transforma a grade inteira em componente de
 * cliente para um botão.
 *
 * Este invólucro existe só para isso: mesma regra, mesma validação, mesmo
 * estoque — só a assinatura muda. Erro não vira tela de erro; o carrinho já
 * revalida e o contador do topo mostra o resultado. Quem precisa de mensagem
 * (a ficha do produto, o carrinho) continua usando a versão com estado.
 */
export async function adicionarAoCarrinhoDoCartao(formData: FormData): Promise<void> {
  await adicionarAoCarrinho({}, formData);
}
