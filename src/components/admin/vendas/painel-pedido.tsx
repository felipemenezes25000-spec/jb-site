import {
  PainelPedidoCliente,
  type ContaDoPedido,
  type OpcaoSimples,
  type PagamentoDoPainel,
  type PedidoDoPainel,
  type TarefaInstalacao,
} from "@/components/admin/vendas/painel-pedido-blocos";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Painel de ação do pedido — carga de dados

   O painel precisa responder "quanto já entrou e quanto falta" antes de
   oferecer o registro de pagamento: equipamento odontológico sai com sinal, e
   quem opera não pode ter de somar os recebimentos de cabeça.

   Essa conta é lida aqui, no servidor, e não recebida por prop, porque a tela
   do pedido (`/admin/pedidos/[id]`) está fora do escopo desta rodada e não tem
   como passá-la. A consulta é uma só, pelo índice `[orderId, createdAt]` de
   Payment, e cai no mesmo cache de requisição da página. Quando a página puder
   ser tocada, o caminho natural é ela passar `order.payments` — que já carrega
   — e este componente virar só repasse.

   A soma de referência continua sendo a do servidor, dentro da transação de
   `confirmarPagamentoManual`. O que está aqui é para a pessoa entender a conta;
   o que impede pagar a mais é a ação.
   ============================================================================ */

export type {
  ContaDoPedido,
  OpcaoSimples,
  PagamentoDoPainel,
  PedidoDoPainel,
  TarefaInstalacao,
};

/** Lê o total do pedido, as cobranças e quanto delas já foi aprovado. */
async function carregarConta(pedidoId: string): Promise<ContaDoPedido> {
  const pedido = await prisma.order.findUnique({
    where: { id: pedidoId },
    select: {
      totalCents: true,
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          method: true,
          status: true,
          amountCents: true,
          createdAt: true,
        },
      },
    },
  });

  const totalCents = pedido?.totalCents ?? 0;
  const pagamentos = pedido?.payments ?? [];

  // recusado, expirado, cancelado e estornado não abatem nada do que se deve
  const pagoCents = pagamentos
    .filter((pagamento) => pagamento.status === "aprovado")
    .reduce((soma, pagamento) => soma + pagamento.amountCents, 0);

  return {
    totalCents,
    pagoCents,
    saldoCents: totalCents - pagoCents,
    pagamentos: pagamentos.map(
      (pagamento): PagamentoDoPainel => ({
        id: pagamento.id,
        metodo: pagamento.method,
        status: pagamento.status,
        valorCents: pagamento.amountCents,
        quando: formatarDataHora(pagamento.createdAt),
      }),
    ),
  };
}

export async function PainelPedido({
  pedido,
  statusDisponiveis,
  sugerido,
  metodos,
  tecnicos,
  tarefas,
  podeConfirmarPagamento,
}: {
  pedido: PedidoDoPainel;
  statusDisponiveis: OpcaoSimples[];
  sugerido: string | null;
  metodos: OpcaoSimples[];
  tecnicos: OpcaoSimples[];
  tarefas: TarefaInstalacao[];
  podeConfirmarPagamento: boolean;
}) {
  const conta = await carregarConta(pedido.id);

  return (
    <PainelPedidoCliente
      pedido={pedido}
      conta={conta}
      statusDisponiveis={statusDisponiveis}
      sugerido={sugerido}
      metodos={metodos}
      tecnicos={tecnicos}
      tarefas={tarefas}
      podeConfirmarPagamento={podeConfirmarPagamento}
    />
  );
}
