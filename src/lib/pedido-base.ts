import "server-only";

import type { OrderStatus, Prisma, ShippingKind } from "@prisma/client";

import { proximoCodigo } from "@/lib/codigos";
import { descontoDoCupom, linhaElegivelAoCupom, precoDoAdicional } from "@/lib/carrinho";
import { enfileirar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";

/**
 * Regras do pedido.
 *
 * Duas coisas são inegociáveis aqui:
 *
 * 1. O valor cobrado sai do banco, nunca do navegador. O carrinho manda o que
 *    e quanto; preço, desconto e total são recalculados no servidor.
 *
 * 2. A baixa de estoque acontece dentro da mesma transação que cria o pedido,
 *    com UPDATE condicional. Dois compradores simultâneos do mesmo seminovo:
 *    o primeiro leva, o segundo recebe erro — nunca os dois.
 */

export type DadosComprador = {
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  tipoPessoa: "fisica" | "juridica";
  razaoSocial: string;
};

export type DadosEntrega = {
  tipo: ShippingKind;
  rotulo: string;
  valorCents: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string;
};

/** Item que saiu do ar entre entrar no carrinho e fechar o pedido. */
export class ErroDeItemIndisponivel extends Error {
  constructor(public readonly produto: string) {
    super(`${produto} não está mais disponível.`);
    this.name = "ErroDeItemIndisponivel";
  }
}

export class ErroDeEstoque extends Error {
  constructor(public readonly produto: string) {
    super(`Estoque insuficiente para ${produto}`);
    this.name = "ErroDeEstoque";
  }
}

/**
 * Baixa o estoque de forma atômica.
 *
 * O UPDATE com `stock >= quantidade` no WHERE é o que garante a exclusão
 * mútua: o Postgres serializa as escritas na linha e a segunda tentativa
 * simplesmente não encontra linha para atualizar.
 */
async function baixarEstoque(
  tx: Prisma.TransactionClient,
  produtoId: string,
  quantidade: number,
  nome: string,
) {
  /**
   * A condição e o desconto precisam concordar.
   *
   * Antes, o WHERE liberava a linha quando `trackInventory` era falso — o que
   * está certo, esse produto não tem controle — mas o SET descontava do mesmo
   * jeito, e o estoque de quem não controla estoque afundava para negativo,
   * poluindo relatório e alerta de reposição. Agora só desconta de quem
   * controla.
   */
  const afetadas = await tx.$executeRaw`
    UPDATE "Product"
    SET "stock" = CASE WHEN "trackInventory" THEN "stock" - ${quantidade} ELSE "stock" END
    WHERE "id" = ${produtoId}
      AND ("trackInventory" = false OR "stock" >= ${quantidade})
  `;
  if (afetadas === 0) throw new ErroDeEstoque(nome);
}

export async function criarPedido(input: {
  carrinhoId: string;
  customerId: string | null;
  comprador: DadosComprador;
  entrega: DadosEntrega;
  observacao: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      const carrinho = await tx.cart.findUnique({
        where: { id: input.carrinhoId },
        include: {
          coupon: true,
          items: {
            include: {
              product: {
                include: {
                  brand: true,
                  media: { take: 1, include: { media: true } },
                  addons: { select: { serviceId: true, priceCents: true } },
                },
              },
              service: true,
            },
          },
        },
      });

      if (!carrinho || carrinho.items.length === 0) {
        throw new Error("O carrinho está vazio.");
      }

      const principais = carrinho.items.filter((i) => !i.parentId);

      // recalcula tudo a partir do banco
      const cupom = carrinho.coupon;
      let subtotalCents = 0;
      let baseCupomCents = 0;

      for (const item of principais) {
        // despublicado depois de entrar no carrinho: não se vende o que saiu do ar
        if (item.product && item.product.status !== "active") {
          throw new ErroDeItemIndisponivel(item.product.name);
        }
        const preco = item.product?.priceCents ?? item.service?.priceCents ?? 0;
        let linhaCents = preco * item.quantity;
        for (const addon of carrinho.items.filter((a) => a.parentId === item.id)) {
          linhaCents +=
            precoDoAdicional(item.product?.addons, addon.serviceId, addon.service?.priceCents) *
            item.quantity;
        }
        subtotalCents += linhaCents;
        // cupom restrito a produto ou categoria só abate as linhas que se encaixam
        if (linhaElegivelAoCupom(cupom, item)) baseCupomCents += linhaCents;
      }

      let descontoCents = 0;
      // guarda o próprio cupom, não um booleano: é o que deixa o TypeScript
      // saber que ele não é nulo lá embaixo, na criação do pedido
      let cupomAplicado: typeof cupom = null;

      if (cupom && cupom.active && subtotalCents >= cupom.minSubtotalCents && baseCupomCents > 0) {
        const agora = new Date();
        const dentroDoPrazo =
          (!cupom.endsAt || cupom.endsAt > agora) && (!cupom.startsAt || cupom.startsAt <= agora);

        if (dentroDoPrazo) {
          /**
           * A vaga do cupom é consumida no próprio banco, com a condição junto
           * do UPDATE. Ler `usedCount`, decidir em JavaScript e incrementar
           * depois deixava dois checkouts simultâneos passarem pelo mesmo
           * último uso: os dois liam saldo disponível antes de qualquer um
           * gravar. Aqui, quem perde a corrida afeta zero linhas e simplesmente
           * não ganha o desconto.
           */
          const vagas = await tx.$executeRaw`
            UPDATE "Coupon"
               SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
             WHERE "id" = ${cupom.id}
               AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
          `;

          if (vagas === 1) {
            cupomAplicado = cupom;
            descontoCents = descontoDoCupom(cupom, baseCupomCents);
          }
        }
      }

      const totalCents = Math.max(0, subtotalCents - descontoCents) + input.entrega.valorCents;
      const numero = await proximoCodigo("pedido", tx);

      const pedido = await tx.order.create({
        data: {
          number: numero,
          status: "aguardando_pagamento",
          customerId: input.customerId,
          buyerName: input.comprador.nome,
          buyerEmail: input.comprador.email,
          buyerPhone: input.comprador.telefone,
          buyerDocument: input.comprador.documento,
          personType: input.comprador.tipoPessoa,
          companyName: input.comprador.razaoSocial,
          shippingKind: input.entrega.tipo,
          shippingLabel: input.entrega.rotulo,
          shipZip: input.entrega.cep,
          shipStreet: input.entrega.logradouro,
          shipNumber: input.entrega.numero,
          shipComplement: input.entrega.complemento,
          shipDistrict: input.entrega.bairro,
          shipCity: input.entrega.cidade,
          shipState: input.entrega.uf,
          shipReference: input.entrega.referencia,
          subtotalCents,
          discountCents: descontoCents,
          shippingCents: input.entrega.valorCents,
          totalCents,
          couponId: cupomAplicado?.id ?? null,
          couponCode: cupomAplicado?.code ?? "",
          customerNote: input.observacao,
        },
      });

      // itens com snapshot: o pedido antigo nunca depende do produto atual
      for (const item of principais) {
        const produto = item.product;
        const servico = item.service;
        const preco = produto?.priceCents ?? servico?.priceCents ?? 0;

        const criado = await tx.orderItem.create({
          data: {
            orderId: pedido.id,
            kind: produto ? "produto" : "servico",
            productId: produto?.id ?? null,
            serviceId: servico?.id ?? null,
            name: produto?.name ?? servico?.name ?? "",
            sku: produto?.sku ?? "",
            brandName: produto?.brand?.name ?? "",
            modelName: produto?.model ?? "",
            condition: produto?.condition ?? null,
            isEquipment: produto?.isEquipment ?? false,
            imageUrl: produto?.media[0]?.media.url ?? "",
            unitPriceCents: preco,
            quantity: item.quantity,
            totalCents: preco * item.quantity,
          },
        });

        if (produto) {
          await baixarEstoque(tx, produto.id, item.quantity, produto.name);
          await tx.inventoryMovement.create({
            data: {
              productId: produto.id,
              kind: "saida",
              quantity: item.quantity,
              reason: `Pedido ${numero}`,
              orderId: pedido.id,
            },
          });

          // unidade física identificável fica amarrada ao item do pedido
          if (produto.unique) {
            /**
             * A unidade é reservada num UPDATE só, com a condição junto.
             *
             * Ler a unidade disponível e só depois marcá-la como vendida abria
             * a janela pior deste sistema: dois pedidos simultâneos do mesmo
             * seminovo liam a MESMA unidade e os dois a vendiam. Aqui o banco
             * escolhe e trava a linha na mesma instrução; quem chega depois
             * afeta zero linhas e o pedido segue sem unidade vinculada, que é o
             * comportamento de antes quando não havia nenhuma.
             */
            await tx.$executeRaw`
              UPDATE "InventoryUnit"
              SET "status" = 'vendido', "orderItemId" = ${criado.id}, "updatedAt" = now()
              WHERE "id" = (
                SELECT "id" FROM "InventoryUnit"
                WHERE "productId" = ${produto.id} AND "status" = 'disponivel'
                ORDER BY "createdAt" ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
              )
            `;
          }
        }

        for (const addon of carrinho.items.filter((a) => a.parentId === item.id)) {
          const precoAddon = precoDoAdicional(
            item.product?.addons,
            addon.serviceId,
            addon.service?.priceCents,
          );
          await tx.orderItem.create({
            data: {
              orderId: pedido.id,
              kind: "servico",
              serviceId: addon.serviceId,
              parentId: criado.id,
              name: addon.service?.name ?? "Serviço",
              unitPriceCents: precoAddon,
              quantity: item.quantity,
              totalCents: precoAddon * item.quantity,
            },
          });

          // instalação comprada vira tarefa operacional assim que o pedido é pago
          if (addon.service?.kind === "instalacao") {
            await tx.installationTask.create({
              data: { orderId: pedido.id, status: "pendente" },
            });
          }
        }
      }

      await tx.orderStatusEvent.create({
        data: {
          orderId: pedido.id,
          status: "aguardando_pagamento",
          note: "Pedido registrado. Aguardando confirmação do pagamento.",
        },
      });

      // o carrinho some: o pedido agora é a fonte da verdade
      await tx.cart.delete({ where: { id: carrinho.id } });

      return pedido;
    },
    { timeout: 20_000 },
  );
}

/**
 * Muda o status registrando o evento. Toda transição relevante fica no
 * histórico — inclusive quem fez, quando é ação de alguém da equipe.
 */
export async function mudarStatus(
  pedidoId: string,
  status: OrderStatus,
  opcoes: { nota?: string; userId?: string; visivel?: boolean } = {},
) {
  const marcos: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateInput>> = {
    pago: "paidAt",
    enviado: "shippedAt",
    entregue: "deliveredAt",
    concluido: "closedAt",
    cancelado: "canceledAt",
  };

  const campo = marcos[status];
  await prisma.order.update({
    where: { id: pedidoId },
    data: { status, ...(campo ? { [campo]: new Date() } : {}) },
  });

  await prisma.orderStatusEvent.create({
    data: {
      orderId: pedidoId,
      status,
      note: opcoes.nota ?? "",
      visibleToCustomer: opcoes.visivel ?? true,
      userId: opcoes.userId ?? null,
    },
  });
}

/**
 * Confirma o pagamento e dispara o que depende dele.
 *
 * É idempotente de propósito: o webhook do provedor pode chegar repetido, e
 * repetir não pode gerar dois equipamentos nem duas baixas.
 */
export async function confirmarPagamento(pedidoId: string) {
  /**
   * Porta atômica. Quem consegue carimbar `paidAt` é quem processa.
   *
   * Ler `paidAt` e decidir em JavaScript não bastava: o webhook do provedor
   * chega repetido de propósito, e a aprovação síncrona do cartão pode cruzar
   * com ele. Os dois liam `paidAt` nulo antes de qualquer um gravar, e o
   * cliente terminava com dois equipamentos no prontuário e dois avisos.
   *
   * Pedido cancelado ou reembolsado fica de fora: dinheiro que cai depois do
   * cancelamento — um Pix antigo quitado, por exemplo — não pode ressuscitar o
   * pedido. Isso é caso para a equipe olhar, e vira evento interno abaixo.
   */
  const marcado = await prisma.order.updateMany({
    where: { id: pedidoId, paidAt: null, status: { notIn: ["cancelado", "reembolsado"] } },
    data: { paidAt: new Date(), status: "pago" },
  });

  if (marcado.count === 0) {
    const atual = await prisma.order.findUnique({
      where: { id: pedidoId },
      select: { status: true, paidAt: true },
    });
    if (atual && !atual.paidAt) {
      // pagamento chegou para um pedido que não aceita mais pagamento
      await prisma.orderStatusEvent.create({
        data: {
          orderId: pedidoId,
          status: atual.status,
          note:
            "Pagamento confirmado pelo provedor DEPOIS do encerramento do pedido. " +
            "Confira o extrato e providencie o estorno.",
          visibleToCustomer: false,
        },
      });
    }
    return;
  }

  const pedido = await prisma.order.findUnique({
    where: { id: pedidoId },
    include: {
      items: { include: { product: true, unit: true } },
      customer: true,
    },
  });
  if (!pedido) return;

  await prisma.orderStatusEvent.create({
    data: {
      orderId: pedidoId,
      status: "pago",
      note: "Pagamento confirmado pelo provedor.",
    },
  });

  // equipamentos comprados entram no prontuário do cliente
  if (pedido.customerId) {
    for (const item of pedido.items) {
      if (item.kind !== "produto" || !item.product || !item.isEquipment) continue;

      const jaExiste = await prisma.equipment.findFirst({
        where: { orderId: pedido.id, productId: item.productId },
      });
      if (jaExiste) continue;

      const garantiaMeses = item.product.warrantyMonths ?? item.unit?.warrantyMonths ?? null;
      await prisma.equipment.create({
        data: {
          customerId: pedido.customerId,
          name: item.name,
          brandName: item.brandName,
          modelName: item.modelName,
          serialNumber: item.unit?.serialNumber ?? "",
          voltage: item.product.voltage,
          productId: item.productId,
          orderId: pedido.id,
          categoryId: item.product.categoryId,
          origin: "compra_jb",
          status: "operacional",
          condition: item.condition,
          purchasedAt: new Date(),
          warrantyUntil: garantiaMeses
            ? new Date(Date.now() + garantiaMeses * 30 * 86400000)
            : null,
          maintenanceIntervalDays: 180,
          nextMaintenanceAt: new Date(Date.now() + 180 * 86400000),
          events: {
            create: {
              kind: "compra",
              title: `Adquirido no pedido ${pedido.number}`,
            },
          },
        },
      });
    }

    await prisma.notification.create({
      data: {
        customerId: pedido.customerId,
        kind: "pedido_pago",
        title: `Pagamento do pedido ${pedido.number} aprovado`,
        body: pedido.items.some((item) => item.kind === "produto" && item.isEquipment)
          ? "Já estamos preparando seu equipamento."
          : "Já estamos preparando seu pedido.",
        // a rota do cliente é /minha-jb/pedidos/[numero]; o id daria 404
        href: `/minha-jb/pedidos/${pedido.number}`,
      },
    });
  }

  /*
   * Aviso por e-mail do pagamento aprovado.
   *
   * Vale para quem comprou como convidado também, por isso sai de
   * `buyerEmail` e não da conta: o aviso de dentro do site, logo acima, só
   * alcança quem tem cadastro.
   *
   * Só chega aqui quem passou pela porta atômica do começo da função, então
   * o webhook repetido do provedor não vira segundo e-mail. A idempotência
   * da fila é a segunda linha de defesa, não a primeira.
   */
  const naFila = await enfileirar({
    canal: "email",
    para: pedido.buyerEmail,
    assunto: `Pagamento aprovado — pedido ${pedido.number}`,
    corpo: "",
    refTipo: "pedido",
    refId: pedido.id,
    template: "pagamento_aprovado",
  });
  if (!naFila.ok) {
    console.error("[pagamento] aviso não entrou na fila:", naFila.motivo);
  }
}

/**
 * Encerra o pedido devolvendo o que dá para devolver.
 *
 * `cancelado` e `reembolsado` compartilham quase tudo, e a diferença importa:
 * cancelamento acontece antes de sair, estorno pode acontecer depois. Por isso
 * a devolução de estoque é condicional — equipamento que já saiu da JB não
 * volta para a prateleira só porque o dinheiro voltou.
 *
 * Tudo acontece dentro de UMA transação, inclusive a escrita do status. Antes
 * a guarda lia o status dentro da transação e o status era gravado depois,
 * fora dela: dois cancelamentos simultâneos passavam os dois pela guarda e o
 * estoque voltava em dobro.
 */
async function encerrarPedido(
  pedidoId: string,
  destino: "cancelado" | "reembolsado",
  motivo: string,
  userId?: string,
) {
  await prisma.$transaction(async (tx) => {
    // porta atômica: a condição vai junto do UPDATE, e o segundo a chegar
    // espera o lock da linha e reavalia o WHERE já com o status novo
    const marcado = await tx.order.updateMany({
      where: { id: pedidoId, status: { notIn: ["cancelado", "reembolsado"] } },
      data: {
        status: destino,
        canceledAt: new Date(),
      },
    });
    if (marcado.count === 0) return;

    const pedido = await tx.order.findUnique({
      where: { id: pedidoId },
      include: { items: true },
    });
    if (!pedido) return;

    // saiu da JB? então o estoque físico não volta sozinho — quem devolve é a
    // logística reversa, com entrada manual no estoque
    const jaSaiu = Boolean(pedido.shippedAt) || Boolean(pedido.deliveredAt);

    if (!jaSaiu) {
      for (const item of pedido.items) {
        if (item.kind !== "produto" || !item.productId) continue;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            kind: "devolucao",
            quantity: item.quantity,
            reason: `${destino === "cancelado" ? "Cancelamento" : "Estorno"} do pedido ${pedido.number}`,
            orderId: pedido.id,
          },
        });
      }

      await tx.inventoryUnit.updateMany({
        where: { orderItem: { orderId: pedidoId } },
        data: { status: "disponivel", orderItemId: null },
      });
    }

    await tx.orderStatusEvent.create({
      data: {
        orderId: pedidoId,
        status: destino,
        note: jaSaiu
          ? `${motivo} O equipamento já havia saído: o estoque NÃO foi devolvido automaticamente.`
          : motivo,
        userId: userId ?? null,
      },
    });
  });
}

/** Devolve o estoque quando o pedido é cancelado antes de sair. */
export async function cancelarPedido(pedidoId: string, motivo: string, userId?: string) {
  await encerrarPedido(pedidoId, "cancelado", motivo, userId);
}

/** Estorno confirmado pelo provedor. Mantém o pedido como reembolsado. */
export async function estornarPedido(pedidoId: string, motivo: string, userId?: string) {
  await encerrarPedido(pedidoId, "reembolsado", motivo, userId);
}

export const ROTULO_STATUS: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_em_analise: "Pagamento em análise",
  pago: "Pagamento aprovado",
  separacao: "Em separação",
  revisao_tecnica: "Revisão técnica",
  aguardando_frete: "Aguardando frete",
  pronto_retirada: "Pronto para retirada",
  enviado: "Enviado",
  instalacao_agendada: "Instalação agendada",
  entregue: "Entregue",
  concluido: "Concluído",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

/** Ordem das etapas exibidas na linha do tempo do cliente. */
export const FLUXO_PADRAO: OrderStatus[] = [
  "aguardando_pagamento",
  "pago",
  "separacao",
  "enviado",
  "entregue",
  "concluido",
];
