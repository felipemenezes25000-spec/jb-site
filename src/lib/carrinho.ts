import "server-only";

import { cookies } from "next/headers";
import type { CouponKind, Prisma } from "@prisma/client";

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
          // preço que o produto dá ao serviço adicional; sem isto o carrinho
          // cobraria o preço padrão do serviço, diferente do que a página mostra
          addons: { select: { serviceId: true, priceCents: true } },
        },
      },
      service: true,
    },
  },
} satisfies Prisma.CartInclude;

export type CarrinhoCompleto = Prisma.CartGetPayload<{ include: typeof INCLUI }>;

/**
 * Preço de um serviço vendido como adicional de um produto.
 *
 * `ProductAddon.priceCents` sobrepõe o preço padrão do serviço, e é esse o
 * valor que a página do produto exibe. Ler `Service.priceCents` direto faria a
 * loja cobrar diferente do que mostrou — por isso a regra mora aqui, em um
 * lugar só, e é usada tanto no carrinho quanto no fechamento do pedido.
 */
export function precoDoAdicional(
  adicionaisDoProduto: readonly { serviceId: string; priceCents: number | null }[] | undefined,
  serviceId: string | null,
  precoDoServico: number | null | undefined,
): number {
  const proprio = adicionaisDoProduto?.find((a) => a.serviceId === serviceId)?.priceCents;
  return proprio ?? precoDoServico ?? 0;
}

/**
 * Regras do cupom, num lugar só.
 *
 * O carrinho mostra o desconto e o pedido cobra o desconto. Se as duas contas
 * morarem em arquivos diferentes elas divergem na primeira mudança — e o
 * cliente vê um valor na tela e outro na fatura.
 *
 * `Coupon` pode ser restrito a um produto ou a uma categoria. Quando é, o
 * desconto incide só sobre as linhas que se encaixam, não sobre o carrinho
 * inteiro: um cupom de 10% em peças não pode abater 10% de uma autoclave.
 */
export function linhaElegivelAoCupom(
  cupom: { productId: string | null; categoryId: string | null } | null | undefined,
  item: { productId: string | null; product?: { categoryId: string | null } | null },
): boolean {
  if (!cupom) return false;
  if (cupom.productId) return item.productId === cupom.productId;
  if (cupom.categoryId) return item.product?.categoryId === cupom.categoryId;
  return true;
}

/** Desconto em centavos sobre a base elegível. Nunca passa da própria base. */
export function descontoDoCupom(
  cupom: { kind: CouponKind; value: number },
  baseCents: number,
): number {
  if (baseCents <= 0) return 0;
  return cupom.kind === "percentual"
    ? Math.floor((baseCents * cupom.value) / 100)
    : Math.min(cupom.value, baseCents);
}

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

    /**
     * Carrinho com dono pertence ao dono, e a mais ninguém.
     *
     * Antes, quem entrasse com outra conta no mesmo navegador simplesmente
     * tomava o carrinho: o código regravava o `customerId` e a pessoa via os
     * itens de quem tinha usado antes. Numa recepção de clínica, com um
     * computador compartilhado, isso acontece no primeiro dia.
     *
     * Agora só carrinho sem dono é adotado. Se o carrinho é de outra conta —
     * ou se ninguém está logado e ele tem dono — o cookie é trocado e a pessoa
     * começa limpa. O carrinho salvo de quem entra volta pelo
     * `fundirCarrinhoNoLogin`, que procura pelo `customerId`.
     */
    if (existente) {
      if (existente.customerId === (customerId ?? null)) return existente;

      if (existente.customerId === null && customerId) {
        return prisma.cart.update({
          where: { id: existente.id },
          data: { customerId },
          include: INCLUI,
        });
      }
      // pertence a outra pessoa: cai adiante e nasce um carrinho novo
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
 * Solta o carrinho deste navegador.
 *
 * Chamado no logout: apagar só o cookie de sessão deixava o cookie do carrinho
 * apontando para o carrinho de quem saiu, e o próximo a usar o computador
 * enxergava os itens dele.
 */
export async function esquecerCarrinhoDoNavegador() {
  const jar = await cookies();
  jar.delete(COOKIE);
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
  /** produto saiu do ar (rascunho ou arquivado): não soma e não deixa fechar */
  disponivel: boolean;
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
        const preco = precoDoAdicional(item.product?.addons, a.serviceId, a.service?.priceCents);
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

    // produto despublicado depois de entrar no carrinho continua na lista para
    // a pessoa entender o que aconteceu, mas não entra na conta nem no pedido
    const disponivel = !ehProduto || item.product?.status === "active";

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
      totalCents: disponivel ? preco * item.quantity + totalAddons : 0,
      disponivel,
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

    // `principais` e `linhas` andam em paralelo: linhas nasceu do map daquele
    const baseCupomCents = principais.reduce(
      (soma, item, i) =>
        linhaElegivelAoCupom(cupom, item) ? soma + (linhas[i]?.totalCents ?? 0) : soma,
      0,
    );

    if (!cupom.active || expirado || naoComecou || esgotado) {
      cupomErro = "Este cupom não está mais válido.";
    } else if (abaixoDoMinimo) {
      cupomErro = "O valor do pedido ainda não atinge o mínimo deste cupom.";
    } else if (baseCupomCents <= 0) {
      cupomErro = "Este cupom não vale para os itens deste carrinho.";
    } else {
      descontoCents = descontoDoCupom(cupom, baseCupomCents);
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
