import "server-only";

import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";

import { tokenAleatorio } from "@/lib/codigos";
import { prisma } from "@/lib/prisma";

const COOKIE = "jb_carrinho";
const DURACAO = 60 * 60 * 24 * 60; // 60 dias

const INCLUI = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        include: {
          brand: true,
          media: { orderBy: { order: "asc" }, take: 1, include: { media: true } },
        },
      },
      service: true,
    },
  },
} satisfies Prisma.CartInclude;

export type CarrinhoCompleto = Prisma.CartGetPayload<{ include: typeof INCLUI }>;

/** Carrinho atual sem criar nada — para leitura (contador do cabeçalho). */
export async function lerCarrinho(): Promise<CarrinhoCompleto | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return prisma.cart.findUnique({ where: { token }, include: INCLUI });
}

/** Carrinho atual, criando um se necessário. Só chame em Server Action/Route. */
export async function obterOuCriarCarrinho(customerId?: string | null) {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;

  if (token) {
    const existente = await prisma.cart.findUnique({ where: { token }, include: INCLUI });
    if (existente) {
      if (customerId && existente.customerId !== customerId) {
        return prisma.cart.update({
          where: { id: existente.id },
          data: { customerId },
          include: INCLUI,
        });
      }
      return existente;
    }
  }

  token = tokenAleatorio();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO,
  });

  return prisma.cart.create({
    data: { token, customerId: customerId ?? null },
    include: INCLUI,
  });
}

/**
 * Junta o carrinho de visitante ao do cliente no login. O do visitante vence
 * em quantidade, porque é o que a pessoa acabou de montar.
 */
export async function fundirCarrinhoNoLogin(customerId: string) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return;

  const doVisitante = await prisma.cart.findUnique({ where: { token }, include: { items: true } });
  if (!doVisitante) return;

  if (!doVisitante.customerId) {
    const anterior = await prisma.cart.findFirst({
      where: { customerId, id: { not: doVisitante.id } },
      orderBy: { updatedAt: "desc" },
      include: { items: true },
    });

    if (anterior) {
      for (const item of anterior.items) {
        const jaTem = doVisitante.items.find(
          (i) => i.productId === item.productId && i.serviceId === item.serviceId && !i.parentId,
        );
        if (!jaTem && !item.parentId) {
          await prisma.cartItem.create({
            data: {
              cartId: doVisitante.id,
              productId: item.productId,
              serviceId: item.serviceId,
              quantity: item.quantity,
            },
          });
        }
      }
      await prisma.cart.delete({ where: { id: anterior.id } });
    }

    await prisma.cart.update({ where: { id: doVisitante.id }, data: { customerId } });
  }
}

/* ------------------------------------------------------------------ totais */

export type LinhaCarrinho = {
  id: string;
  tipo: "produto" | "servico";
  nome: string;
  slug: string | null;
  sku: string;
  marca: string;
  imagem: string | null;
  condicao: string | null;
  precoUnitarioCents: number;
  quantidade: number;
  totalCents: number;
  estoqueDisponivel: number;
  unico: boolean;
  addons: {
    id: string;
    nome: string;
    precoUnitarioCents: number;
    totalCents: number;
  }[];
};

export type TotaisCarrinho = {
  linhas: LinhaCarrinho[];
  quantidadeItens: number;
  subtotalCents: number;
  descontoCents: number;
  cupomCodigo: string;
  cupomErro: string | null;
  totalCents: number;
};

/**
 * Recalcula tudo a partir do banco. O frontend nunca envia preço — o valor
 * cobrado sai daqui, sempre.
 */
export function calcularTotais(carrinho: CarrinhoCompleto | null): TotaisCarrinho {
  const vazio: TotaisCarrinho = {
    linhas: [],
    quantidadeItens: 0,
    subtotalCents: 0,
    descontoCents: 0,
    cupomCodigo: "",
    cupomErro: null,
    totalCents: 0,
  };
  if (!carrinho) return vazio;

  const principais = carrinho.items.filter((i) => !i.parentId);
  const linhas: LinhaCarrinho[] = principais.map((item) => {
    const addons = carrinho.items
      .filter((a) => a.parentId === item.id)
      .map((a) => {
        const preco = a.service?.priceCents ?? 0;
        return {
          id: a.id,
          nome: a.service?.name ?? "Serviço",
          precoUnitarioCents: preco,
          totalCents: preco * item.quantity,
        };
      });

    const ehProduto = Boolean(item.productId);
    const preco = ehProduto ? (item.product?.priceCents ?? 0) : (item.service?.priceCents ?? 0);
    const totalAddons = addons.reduce((soma, a) => soma + a.totalCents, 0);

    return {
      id: item.id,
      tipo: ehProduto ? "produto" : "servico",
      nome: ehProduto ? (item.product?.name ?? "") : (item.service?.name ?? ""),
      slug: item.product?.slug ?? null,
      sku: item.product?.sku ?? "",
      marca: item.product?.brand?.name ?? "",
      imagem: item.product?.media[0]?.media.url ?? null,
      condicao: item.product?.condition ?? null,
      precoUnitarioCents: preco,
      quantidade: item.quantity,
      totalCents: preco * item.quantity + totalAddons,
      estoqueDisponivel: item.product?.trackInventory ? (item.product?.stock ?? 0) : 9999,
      unico: item.product?.unique ?? false,
      addons,
    };
  });

  const subtotalCents = linhas.reduce((soma, l) => soma + l.totalCents, 0);
  const quantidadeItens = linhas.reduce((soma, l) => soma + l.quantidade, 0);

  let descontoCents = 0;
  let cupomErro: string | null = null;
  const cupom = carrinho.coupon;

  if (cupom) {
    const agora = new Date();
    const expirado = cupom.endsAt ? cupom.endsAt < agora : false;
    const naoComecou = cupom.startsAt ? cupom.startsAt > agora : false;
    const esgotado = cupom.maxUses !== null && cupom.usedCount >= cupom.maxUses;
    const abaixoDoMinimo = subtotalCents < cupom.minSubtotalCents;

    if (!cupom.active || expirado || naoComecou || esgotado) {
      cupomErro = "Este cupom não está mais válido.";
    } else if (abaixoDoMinimo) {
      cupomErro = "O valor do pedido ainda não atinge o mínimo deste cupom.";
    } else {
      descontoCents =
        cupom.kind === "percentual"
          ? Math.floor((subtotalCents * cupom.value) / 100)
          : Math.min(cupom.value, subtotalCents);
    }
  }

  return {
    linhas,
    quantidadeItens,
    subtotalCents,
    descontoCents,
    cupomCodigo: cupom?.code ?? "",
    cupomErro,
    totalCents: Math.max(0, subtotalCents - descontoCents),
  };
}

/** Só o número para o cabeçalho, sem montar o carrinho inteiro. */
export async function contarItensDoCarrinho() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return 0;

  const resultado = await prisma.cartItem.aggregate({
    where: { cart: { token }, parentId: null },
    _sum: { quantity: true },
  });
  return resultado._sum.quantity ?? 0;
}
