import type { OrderStatus, ShippingKind } from "@prisma/client";

import { LinhaDoTempo, type PassoLinha } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";

/**
 * Linha do tempo do pedido para o cliente.
 *
 * Os treze status do banco viram seis etapas legíveis, do mesmo jeito que
 * `passosDoChamado` faz na assistência. A data de cada etapa sai do primeiro
 * evento que a alcançou — não do `updatedAt`, que mudaria a cada anotação
 * interna da equipe.
 *
 * Quem retira na loja não vê "Enviado": vê "Pronto para retirada". É a mesma
 * etapa do fluxo, com o nome do que realmente vai acontecer.
 */

const ETAPAS: OrderStatus[] = [
  "aguardando_pagamento",
  "pago",
  "separacao",
  "enviado",
  "entregue",
  "concluido",
];

const ETAPA_DO_STATUS: Record<OrderStatus, OrderStatus> = {
  aguardando_pagamento: "aguardando_pagamento",
  pagamento_em_analise: "aguardando_pagamento",
  pago: "pago",
  separacao: "separacao",
  revisao_tecnica: "separacao",
  aguardando_frete: "separacao",
  pronto_retirada: "enviado",
  enviado: "enviado",
  instalacao_agendada: "enviado",
  entregue: "entregue",
  concluido: "concluido",
  cancelado: "concluido",
  reembolsado: "concluido",
};

const DESCRICAO: Record<OrderStatus, string> = {
  aguardando_pagamento: "Pedido registrado. Assim que o pagamento cair, a preparação começa.",
  pago: "Pagamento confirmado. O pedido entra na fila de separação.",
  separacao: "Equipamento separado, conferido e testado pela equipe técnica.",
  enviado: "A caminho do endereço informado.",
  entregue: "Entrega concluída no endereço do pedido.",
  concluido: "Pedido encerrado. A nota fiscal e os documentos ficam guardados na sua conta.",
  // status que não são etapa visível — mantidos para o Record ficar completo
  pagamento_em_analise: "",
  revisao_tecnica: "",
  aguardando_frete: "",
  pronto_retirada: "",
  instalacao_agendada: "",
  cancelado: "",
  reembolsado: "",
};

function rotuloDaEtapa(etapa: OrderStatus, entrega: ShippingKind) {
  if (etapa === "enviado") {
    if (entrega === "retirada") return "Pronto para retirada";
    if (entrega === "nao_aplicavel") return "Liberado";
  }
  if (etapa === "entregue" && entrega === "retirada") return "Retirado";
  return ROTULO_STATUS[etapa];
}

function descricaoDaEtapa(etapa: OrderStatus, entrega: ShippingKind) {
  if (etapa === "enviado" && entrega === "retirada") {
    return "Pode retirar no endereço da JB, em horário comercial.";
  }
  if (etapa === "entregue" && entrega === "retirada") {
    return "Retirada confirmada na loja.";
  }
  return DESCRICAO[etapa];
}

export type PedidoParaLinha = {
  status: OrderStatus;
  shippingKind: ShippingKind;
  placedAt: Date;
  canceledAt: Date | null;
  events: { status: OrderStatus; createdAt: Date }[];
};

export function passosDoPedido(pedido: PedidoParaLinha): PassoLinha[] {
  const eventos = [...pedido.events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const quandoDaEtapa = new Map<OrderStatus, Date>();
  quandoDaEtapa.set("aguardando_pagamento", pedido.placedAt);
  for (const evento of eventos) {
    // cancelamento e reembolso não são avanço: sem esta linha, o evento de
    // cancelado carimbaria a última etapa e o pedido apareceria como concluído
    if (evento.status === "cancelado" || evento.status === "reembolsado") continue;
    const etapa = ETAPA_DO_STATUS[evento.status];
    if (!quandoDaEtapa.has(etapa)) quandoDaEtapa.set(etapa, evento.createdAt);
  }

  const encerradoSemEntrega =
    pedido.status === "cancelado" || pedido.status === "reembolsado";

  const indiceAtual = encerradoSemEntrega
    ? ETAPAS.reduce((maior, etapa, i) => (quandoDaEtapa.has(etapa) ? i : maior), 0)
    : ETAPAS.indexOf(ETAPA_DO_STATUS[pedido.status]);

  const passos: PassoLinha[] = ETAPAS.map((etapa, i) => {
    const quando = quandoDaEtapa.get(etapa);
    const estado: PassoLinha["estado"] = encerradoSemEntrega
      ? i <= indiceAtual
        ? "concluido"
        : "cancelado"
      : i < indiceAtual
        ? "concluido"
        : i === indiceAtual
          ? "atual"
          : "futuro";

    return {
      titulo: rotuloDaEtapa(etapa, pedido.shippingKind),
      descricao: descricaoDaEtapa(etapa, pedido.shippingKind),
      quando: quando ? formatarDataHora(quando) : undefined,
      estado,
    };
  });

  if (encerradoSemEntrega) {
    passos.push({
      titulo: ROTULO_STATUS[pedido.status],
      descricao:
        pedido.status === "reembolsado"
          ? "O valor foi devolvido pelo mesmo meio do pagamento."
          : "Pedido cancelado. Se precisar retomar a compra, fale com a equipe.",
      quando: pedido.canceledAt ? formatarDataHora(pedido.canceledAt) : undefined,
      estado: "cancelado",
    });
  }

  return passos;
}

export function LinhaDoPedido({ pedido }: { pedido: PedidoParaLinha }) {
  return <LinhaDoTempo passos={passosDoPedido(pedido)} />;
}
