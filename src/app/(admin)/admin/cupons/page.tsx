import type { Metadata } from "next";
import { CircleCheck, ShoppingCart, TicketPercent } from "lucide-react";

import { Indicador, Indicadores } from "@/components/admin/indicador";
import { CabecalhoPagina } from "@/components/admin/vendas/comuns";
import { GestorCupons } from "@/components/admin/vendas/formulario-cupom";
import { LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { PODE } from "@/lib/auth";
import { formatarPreco, paraInputDate, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Cupons",
};

/**
 * Cupons de desconto.
 *
 * A área usada na guarda é "produtos": cupom é precificação, então segue a mesma
 * regra do catálogo — administrador e gestor editam, comercial consulta. Quando
 * `@/lib/permissoes` ganhar uma área própria para promoções, é só trocar a
 * constante aqui e nas ações.
 */
export default async function CupomPage() {
  const usuario = await exigirArea("produtos");

  const [cupons, categorias, produtos] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { orders: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, sku: true },
    }),
  ]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.name]));
  const nomeProduto = new Map(produtos.map((p) => [p.id, p.name]));

  const agora = new Date();
  const ativos = cupons.filter((cupom) => cupom.active);
  const usosTotais = cupons.reduce((soma, cupom) => soma + cupom.usedCount, 0);

  const descontoConcedido = await prisma.order.aggregate({
    where: { couponId: { not: null }, status: { notIn: ["cancelado"] } },
    _sum: { discountCents: true },
  });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Cupons"
        apoio="Códigos de desconto aplicados no carrinho."
        acoes={
          <LinkBotao href="/admin/pedidos" variante="secundario" tamanho="sm">
            <ShoppingCart className="size-4" aria-hidden />
            Pedidos
          </LinkBotao>
        }
      />

      {!podeEditar(usuario, "produtos") ? (
        <Aviso tom="info" titulo="Somente leitura">
          Seu papel abre esta área para consulta. Criar e editar cupons é permissão de gestor ou
          administrador.
        </Aviso>
      ) : null}

      <Indicadores>
        <Indicador
          rotulo="Cupons cadastrados"
          valor={cupons.length}
          icone={TicketPercent}
          detalhe={`${plural(ativos.length, "ativo", "ativos")}`}
        />
        <Indicador
          rotulo="Usos registrados"
          valor={usosTotais}
          icone={CircleCheck}
          detalhe="Contados no fechamento de cada pedido"
        />
        <Indicador
          rotulo="Desconto concedido"
          valor={formatarPreco(descontoConcedido._sum.discountCents ?? 0)}
          tom="marca"
          detalhe="Somando os pedidos não cancelados com cupom"
        />
        <Indicador
          rotulo="Com prazo vencido"
          valor={cupons.filter((cupom) => cupom.endsAt && cupom.endsAt < agora).length}
          detalhe="Continuam no histórico, mas não valem mais"
        />
      </Indicadores>

      <GestorCupons
        podeEditar={podeEditar(usuario, "produtos")}
        podeExcluir={PODE.excluirRegistros(usuario)}
        categorias={categorias.map((categoria) => ({
          id: categoria.id,
          rotulo: categoria.name,
        }))}
        produtos={produtos.map((produto) => ({
          id: produto.id,
          rotulo: produto.sku ? `${produto.name} (${produto.sku})` : produto.name,
        }))}
        cupons={cupons.map((cupom) => ({
          id: cupom.id,
          codigo: cupom.code,
          tipo: cupom.kind,
          valor: cupom.value,
          valorFormatado:
            cupom.kind === "percentual"
              ? `${cupom.value}% de desconto`
              : `${formatarPreco(cupom.value)} de desconto`,
          minimo: cupom.minSubtotalCents,
          maxUsos: cupom.maxUses,
          maxPorCliente: cupom.maxUsesPerCustomer,
          usados: Math.max(cupom.usedCount, cupom._count.orders),
          inicio: paraInputDate(cupom.startsAt),
          fim: paraInputDate(cupom.endsAt),
          ativo: cupom.active,
          categoriaId: cupom.categoryId ?? "",
          produtoId: cupom.productId ?? "",
          escopo: cupom.productId
            ? `Só para ${nomeProduto.get(cupom.productId) ?? "um produto específico"}`
            : cupom.categoryId
              ? `Só na categoria ${nomeCategoria.get(cupom.categoryId) ?? "selecionada"}`
              : "Vale para o catálogo inteiro",
          vencido: Boolean(cupom.endsAt && cupom.endsAt < agora),
        }))}
      />
    </div>
  );
}
