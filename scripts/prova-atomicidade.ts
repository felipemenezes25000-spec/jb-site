/**
 * Prova que as portas atômicas de `@/lib/pedido` seguram concorrência real.
 *
 * Não é teste unitário com dublê: fala com o Postgres de desenvolvimento e
 * dispara as chamadas em paralelo, que é a única forma de exercitar um lock de
 * linha do banco. Cria o próprio pedido descartável e limpa tudo no fim.
 *
 * Exige o seed de demonstração: pnpm db:demo
 *
 *   pnpm exec tsx scripts/prova-atomicidade.ts
 */
import { PrismaClient } from "@prisma/client";

import { cancelarPedido, confirmarPagamento, criarPedido } from "@/lib/pedido";

const prisma = new PrismaClient();

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe: string) {
  console.log(`  ${ok ? "ok   " : "FALHA"} ${nome} — ${detalhe}`);
  if (!ok) falhas += 1;
}

async function pedidoDescartavel(quantidade: number) {
  const produto = await prisma.product.findFirst({
    where: { slug: { startsWith: "demo-" }, trackInventory: true },
  });
  const cliente = await prisma.customer.findUnique({ where: { email: "demo@jbteste.local" } });
  if (!produto || !cliente) throw new Error("rode `pnpm db:demo` antes");

  const pedido = await prisma.order.create({
    data: {
      number: `PROVA-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      status: "aguardando_pagamento",
      customerId: cliente.id,
      buyerName: cliente.name,
      buyerEmail: cliente.email,
      subtotalCents: produto.priceCents * quantidade,
      totalCents: produto.priceCents * quantidade,
      internalNote: "prova de atomicidade",
      items: {
        create: {
          kind: "produto",
          productId: produto.id,
          name: produto.name,
          isEquipment: true,
          unitPriceCents: produto.priceCents,
          quantity: quantidade,
          totalCents: produto.priceCents * quantidade,
        },
      },
    },
  });

  return { pedido, produto, cliente };
}

async function limpar(pedidoId: string, clienteId: string, numero: string) {
  await prisma.equipment.deleteMany({ where: { orderId: pedidoId } });
  await prisma.notification.deleteMany({
    where: { customerId: clienteId, title: { contains: numero } },
  });
  await prisma.inventoryMovement.deleteMany({ where: { orderId: pedidoId } });
  await prisma.order.delete({ where: { id: pedidoId } });
}

async function main() {
  console.log("\n1. confirmarPagamento chamado 5x em paralelo");
  {
    const { pedido, cliente } = await pedidoDescartavel(2);

    await Promise.all(Array.from({ length: 5 }, () => confirmarPagamento(pedido.id)));

    const equipamentos = await prisma.equipment.count({ where: { orderId: pedido.id } });
    const avisos = await prisma.notification.count({
      where: { customerId: cliente.id, title: { contains: pedido.number } },
    });
    const eventos = await prisma.orderStatusEvent.count({
      where: { orderId: pedido.id, status: "pago" },
    });
    const depois = await prisma.order.findUnique({ where: { id: pedido.id } });

    conferir("um equipamento só", equipamentos === 1, `${equipamentos} criado(s)`);
    conferir("um aviso só", avisos === 1, `${avisos} criado(s)`);
    conferir("um evento 'pago' só", eventos === 1, `${eventos} evento(s)`);
    conferir("pedido ficou pago", depois?.status === "pago" && !!depois.paidAt, `${depois?.status}`);

    await limpar(pedido.id, cliente.id, pedido.number);
  }

  console.log("\n2. cancelarPedido chamado 5x em paralelo");
  {
    const { pedido, produto, cliente } = await pedidoDescartavel(2);
    const antes = (await prisma.product.findUnique({ where: { id: produto.id } }))?.stock ?? 0;

    await Promise.all(
      Array.from({ length: 5 }, () => cancelarPedido(pedido.id, "prova de concorrência")),
    );

    const agora = (await prisma.product.findUnique({ where: { id: produto.id } }))?.stock ?? 0;
    const devolucoes = await prisma.inventoryMovement.count({
      where: { orderId: pedido.id, kind: "devolucao" },
    });
    const eventos = await prisma.orderStatusEvent.count({
      where: { orderId: pedido.id, status: "cancelado" },
    });

    conferir(
      "estoque voltou uma vez só",
      agora === antes + 2,
      `${antes} -> ${agora} (esperado ${antes + 2})`,
    );
    conferir("uma movimentação de devolução", devolucoes === 1, `${devolucoes} movimento(s)`);
    conferir("um evento de cancelamento", eventos === 1, `${eventos} evento(s)`);

    await prisma.product.update({ where: { id: produto.id }, data: { stock: antes } });
    await limpar(pedido.id, cliente.id, pedido.number);
  }

  console.log("\n3. pagamento que chega DEPOIS do cancelamento");
  {
    const { pedido, produto, cliente } = await pedidoDescartavel(1);
    const antes = (await prisma.product.findUnique({ where: { id: produto.id } }))?.stock ?? 0;

    await cancelarPedido(pedido.id, "cancelado antes do pagamento");
    await confirmarPagamento(pedido.id);

    const depois = await prisma.order.findUnique({ where: { id: pedido.id } });
    const equipamentos = await prisma.equipment.count({ where: { orderId: pedido.id } });
    const alerta = await prisma.orderStatusEvent.findFirst({
      where: { orderId: pedido.id, note: { contains: "DEPOIS do encerramento" } },
    });

    conferir("continua cancelado", depois?.status === "cancelado", `${depois?.status}`);
    conferir("não carimbou paidAt", !depois?.paidAt, `${depois?.paidAt}`);
    conferir("não criou equipamento", equipamentos === 0, `${equipamentos}`);
    conferir("avisou a equipe por evento interno", !!alerta, alerta ? "sim" : "não");

    await prisma.product.update({ where: { id: produto.id }, data: { stock: antes } });
    await limpar(pedido.id, cliente.id, pedido.number);
  }

  console.log("\n4. cinco pedidos simultâneos do MESMO seminovo com uma unidade só");
  {
    const cliente = await prisma.customer.findUnique({ where: { email: "demo@jbteste.local" } });
    const produto = await prisma.product.findFirst({
      where: { slug: { startsWith: "demo-" } },
      select: { id: true, name: true, priceCents: true, stock: true, unique: true },
    });
    if (!cliente || !produto) throw new Error("rode `pnpm db:demo` antes");

    // `unique` liga a amarração com a unidade física; estoque folgado de
    // propósito, porque quem tem que limitar aqui é a unidade, não o número
    await prisma.product.update({
      where: { id: produto.id },
      data: { stock: 50, unique: true },
    });
    await prisma.inventoryUnit.deleteMany({ where: { serialNumber: "PROVA-UNIDADE" } });
    await prisma.inventoryUnit.create({
      data: { productId: produto.id, serialNumber: "PROVA-UNIDADE", status: "disponivel" },
    });

    const carrinhos = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.cart.create({
          data: {
            token: `prova-unidade-${i}-${Date.now()}`,
            items: { create: { productId: produto.id, quantity: 1 } },
          },
        }),
      ),
    );

    const comprador = {
      nome: cliente.name,
      email: cliente.email,
      telefone: "",
      documento: "",
      tipoPessoa: "fisica" as const,
      razaoSocial: "",
    };

    const entrega = {
      tipo: "retirada" as const,
      rotulo: "Retirada na JB",
      valorCents: 0,
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      referencia: "",
    };

    /* Guardar o motivo importa: aqui se espera que ALGUMAS chamadas falhem
       por disputa da unidade, então engolir o erro é proposital. Mas quando
       falham todas, "0 de 5" sozinho não diz se foi a trava do banco fazendo
       seu trabalho ou o fixture quebrado — e sem o motivo o passo seguinte é
       adivinhação. */
    const recusas: unknown[] = [];
    const pedidos = await Promise.all(
      carrinhos.map((carrinho) =>
        criarPedido({
          carrinhoId: carrinho.id,
          customerId: cliente.id,
          comprador,
          entrega,
          observacao: "",
        }).catch((erro) => {
          recusas.push(erro);
          return null;
        }),
      ),
    );

    const criados = pedidos.filter((p) => p !== null);
    if (criados.length === 0 && recusas.length > 0) {
      console.log(`  motivo da primeira recusa: ${String(recusas[0]).slice(0, 200)}`);
    }
    const unidade = await prisma.inventoryUnit.findFirst({
      where: { serialNumber: "PROVA-UNIDADE" },
      select: { status: true, orderItemId: true },
    });
    const vinculos = await prisma.inventoryUnit.count({
      where: { serialNumber: "PROVA-UNIDADE", orderItemId: { not: null } },
    });

    conferir("os cinco pedidos nasceram", criados.length === 5, `${criados.length} de 5`);
    conferir("a unidade foi vendida uma vez só", vinculos === 1, `${vinculos} vinculo(s)`);
    conferir("a unidade ficou marcada como vendida", unidade?.status === "vendido", `${unidade?.status}`);

    for (const pedido of criados) {
      await prisma.inventoryUnit.updateMany({
        where: { orderItem: { orderId: pedido.id } },
        data: { status: "disponivel", orderItemId: null },
      });
      await limpar(pedido.id, cliente.id, pedido.number);
    }
    await prisma.inventoryUnit.deleteMany({ where: { serialNumber: "PROVA-UNIDADE" } });
    await prisma.product.update({
      where: { id: produto.id },
      data: { stock: produto.stock, unique: produto.unique },
    });
  }

  console.log("\n5. item marcado como não equipamento não cria prontuário técnico");
  {
    const { pedido, cliente } = await pedidoDescartavel(1);
    await prisma.orderItem.updateMany({
      where: { orderId: pedido.id, kind: "produto" },
      data: { isEquipment: false },
    });

    await confirmarPagamento(pedido.id);

    const equipamentos = await prisma.equipment.count({ where: { orderId: pedido.id } });
    const aviso = await prisma.notification.findFirst({
      where: { customerId: cliente.id, title: { contains: pedido.number } },
      select: { body: true },
    });
    conferir("não criou equipamento", equipamentos === 0, `${equipamentos}`);
    conferir(
      "mensagem fala em pedido, não equipamento",
      aviso?.body === "Já estamos preparando seu pedido.",
      aviso?.body ?? "sem aviso",
    );

    await limpar(pedido.id, cliente.id, pedido.number);
  }

  console.log(`\n${falhas === 0 ? "TUDO OK" : `${falhas} FALHA(S)`}\n`);
}

main()
  .catch((erro) => {
    console.error(erro);
    falhas += 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(falhas ? 1 : 0);
  });