import "server-only";

import type { Prisma, WorkOrderStatus } from "@prisma/client";

import type { PassoLinha } from "@/components/ui/data";
import { ROTULO_CHAMADO } from "@/lib/assistencia";
import { proximoCodigo } from "@/lib/codigos";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Regras da ordem de serviço (WorkOrder).
 *
 * O ponto central aqui é o dinheiro. `laborCents`, `travelCents` e `partsCents`
 * NÃO são campos digitáveis: são somas dos itens da OS, recalculadas no
 * servidor a cada mudança. Assim a OS impressa nunca mostra um total que não
 * bate com a lista de peças e serviços logo acima dele.
 *
 * A segunda regra é a mesma do chamado: status e evento na mesma transação.
 */

export class ErroDeOS extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeOS";
  }
}

/** Bucket de custo do item. Define em qual total a linha entra. */
export type TipoItemOS = "peca" | "servico" | "deslocamento";

export const ROTULO_ITEM_OS: Record<TipoItemOS, string> = {
  peca: "Peça",
  servico: "Serviço",
  deslocamento: "Deslocamento",
};

export const ROTULO_OS: Record<WorkOrderStatus, string> = {
  aberta: "Aberta",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  aguardando_aprovacao: "Aguardando aprovação",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Ordem canônica. `cancelada` fica fora: é saída, não etapa. */
export const FLUXO_OS: WorkOrderStatus[] = [
  "aberta",
  "em_execucao",
  "aguardando_aprovacao",
  "aguardando_peca",
  "concluida",
];

/** Status em que a OS ainda ocupa a agenda de alguém. */
export const STATUS_OS_ABERTOS: WorkOrderStatus[] = [
  "aberta",
  "em_execucao",
  "aguardando_peca",
  "aguardando_aprovacao",
];

const ETAPAS_VISIVEIS: WorkOrderStatus[] = ["aberta", "em_execucao", "concluida"];

const ETAPA_DO_STATUS: Record<WorkOrderStatus, WorkOrderStatus> = {
  aberta: "aberta",
  em_execucao: "em_execucao",
  aguardando_peca: "em_execucao",
  aguardando_aprovacao: "em_execucao",
  concluida: "concluida",
  cancelada: "concluida",
};

const DESCRICAO_ETAPA: Partial<Record<WorkOrderStatus, string>> = {
  aberta: "Ordem de serviço registrada com o defeito relatado.",
  em_execucao: "Diagnóstico e reparo em andamento.",
  concluida: "Serviço finalizado, testado e encerrado.",
};

/**
 * Refaz os três totais a partir dos itens e devolve a OS atualizada.
 *
 * Fica exportada porque qualquer rota que mexa em item precisa chamá-la — e
 * porque é ela quem garante que o total nunca venha do formulário.
 */
export async function recalcularTotaisDaOS(
  workOrderId: string,
  cliente: Prisma.TransactionClient = prisma,
) {
  const itens = await cliente.workOrderItem.findMany({
    where: { workOrderId },
    select: { kind: true, totalCents: true },
  });

  const soma = (tipo: TipoItemOS) =>
    itens.filter((i) => i.kind === tipo).reduce((acc, i) => acc + i.totalCents, 0);

  const partsCents = soma("peca");
  const laborCents = soma("servico");
  const travelCents = soma("deslocamento");

  const atual = await cliente.workOrder.findUnique({
    where: { id: workOrderId },
    select: { discountCents: true },
  });
  if (!atual) throw new ErroDeOS("Ordem de serviço não encontrada.");

  const totalCents = Math.max(0, partsCents + laborCents + travelCents - atual.discountCents);

  return cliente.workOrder.update({
    where: { id: workOrderId },
    data: { partsCents, laborCents, travelCents, totalCents },
  });
}

export type EntradaOS = {
  /** Chamado de origem. Quando informado, herda equipamento, cliente e relato. */
  chamadoId?: string | null;
  equipmentId?: string | null;
  tecnicoId?: string | null;
  nomeCliente?: string;
  defeitoRelatado?: string;
  observacoes?: string;
  garantiaDias?: number | null;
  userId?: string | null;
};

/**
 * Abre a OS, avulsa ou a partir de um chamado.
 *
 * Vinda de um chamado, os campos em branco são preenchidos com o que o chamado
 * já sabe (equipamento, nome do solicitante, relato) e o chamado avança para
 * diagnóstico. Isso evita a redigitação que sempre acaba divergindo.
 */
export async function abrirOS(entrada: EntradaOS) {
  return prisma.$transaction(async (tx) => {
    const chamado = entrada.chamadoId
      ? await tx.serviceRequest.findUnique({
          where: { id: entrada.chamadoId },
          include: { customer: { select: { name: true } } },
        })
      : null;

    if (entrada.chamadoId && !chamado) {
      throw new ErroDeOS("Chamado não encontrado.");
    }

    const numero = await proximoCodigo("ordemServico", tx);

    const ordem = await tx.workOrder.create({
      data: {
        number: numero,
        status: "aberta",
        requestId: chamado?.id ?? null,
        equipmentId: entrada.equipmentId ?? chamado?.equipmentId ?? null,
        technicianId: entrada.tecnicoId ?? null,
        customerName:
          entrada.nomeCliente?.trim() ||
          chamado?.customer?.name ||
          chamado?.contactName ||
          "",
        reportedIssue: entrada.defeitoRelatado?.trim() || chamado?.description || "",
        notes: entrada.observacoes ?? "",
        serviceWarrantyDays: entrada.garantiaDias ?? null,
      },
    });

    await tx.workOrderEvent.create({
      data: {
        workOrderId: ordem.id,
        title: "Ordem de serviço aberta",
        message: chamado ? `Originada do chamado ${chamado.number}.` : "",
        userId: entrada.userId ?? null,
      },
    });

    if (chamado) {
      // o chamado não é atualizado por mudarStatusChamado de propósito: aquilo
      // abriria uma segunda transação enquanto esta ainda segura as linhas.
      await tx.serviceRequest.update({
        where: { id: chamado.id },
        data: { status: "em_diagnostico" },
      });
      await tx.serviceRequestEvent.create({
        data: {
          requestId: chamado.id,
          status: "em_diagnostico",
          title: ROTULO_CHAMADO.em_diagnostico,
          message: `Ordem de serviço ${numero} aberta para o seu equipamento.`,
          userId: entrada.userId ?? null,
        },
      });
    }

    if (ordem.equipmentId) {
      await tx.equipmentEvent.create({
        data: {
          equipmentId: ordem.equipmentId,
          kind: "assistencia",
          title: `OS ${numero} aberta`,
          description: ordem.reportedIssue,
          workOrderId: ordem.id,
        },
      });
    }

    return ordem;
  });
}

export type EntradaItemOS = {
  workOrderId: string;
  tipo?: TipoItemOS;
  descricao: string;
  quantidade?: number;
  valorUnitarioCents: number;
};

/** Acrescenta um item e refaz os totais. O total da linha é sempre calculado. */
export async function adicionarItem(entrada: EntradaItemOS) {
  const descricao = entrada.descricao.trim();
  if (!descricao) throw new ErroDeOS("Descreva o item.");

  const quantidade = Math.max(1, Math.trunc(entrada.quantidade ?? 1));
  const unitario = Math.max(0, Math.trunc(entrada.valorUnitarioCents));

  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.workOrderItem.findFirst({
      where: { workOrderId: entrada.workOrderId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const item = await tx.workOrderItem.create({
      data: {
        workOrderId: entrada.workOrderId,
        kind: entrada.tipo ?? "peca",
        description: descricao,
        quantity: quantidade,
        unitPriceCents: unitario,
        totalCents: unitario * quantidade,
        order: (ultimo?.order ?? -1) + 1,
      },
    });

    await recalcularTotaisDaOS(entrada.workOrderId, tx);
    return item;
  });
}

/** Remove um item e refaz os totais. */
export async function removerItem(itemId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.workOrderItem.findUnique({
      where: { id: itemId },
      select: { workOrderId: true },
    });
    if (!item) return null;

    await tx.workOrderItem.delete({ where: { id: itemId } });
    return recalcularTotaisDaOS(item.workOrderId, tx);
  });
}

/** Desconto em centavos concedido na OS inteira. Nunca deixa o total negativo. */
export async function definirDesconto(workOrderId: string, descontoCents: number) {
  return prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { discountCents: Math.max(0, Math.trunc(descontoCents)) },
    });
    return recalcularTotaisDaOS(workOrderId, tx);
  });
}

/**
 * Substitui o checklist inteiro.
 *
 * Substituir em vez de mesclar é intencional: o checklist é um roteiro de
 * conferência e meia troca deixaria itens órfãos de um roteiro antigo.
 */
export async function definirChecklist(
  workOrderId: string,
  itens: { label: string; done?: boolean; nota?: string }[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.workOrderCheckItem.deleteMany({ where: { workOrderId } });

    const limpos = itens
      .map((item, ordem) => ({
        workOrderId,
        label: item.label.trim(),
        done: item.done ?? false,
        note: item.nota ?? "",
        order: ordem,
      }))
      .filter((item) => item.label.length > 0);

    if (limpos.length > 0) {
      await tx.workOrderCheckItem.createMany({ data: limpos });
    }

    return limpos.length;
  });
}

/** Marca ou desmarca um item do checklist. */
export async function marcarChecklist(itemId: string, feito: boolean, nota?: string) {
  return prisma.workOrderCheckItem.update({
    where: { id: itemId },
    data: { done: feito, ...(nota === undefined ? {} : { note: nota }) },
  });
}

/**
 * Anexa fotos à OS. `fase` separa o antes do depois — é o que sustenta o laudo
 * quando o cliente pergunta o que exatamente foi feito.
 */
export async function registrarMidia(
  workOrderId: string,
  mediaIds: string[],
  fase: "antes" | "depois" = "antes",
) {
  if (mediaIds.length === 0) return 0;

  const anteriores = await prisma.workOrderMedia.count({ where: { workOrderId } });

  const resultado = await prisma.workOrderMedia.createMany({
    data: mediaIds.map((mediaId, i) => ({
      workOrderId,
      mediaId,
      phase: fase,
      order: anteriores + i,
    })),
    skipDuplicates: true,
  });

  return resultado.count;
}

/** Muda o status da OS registrando o evento. */
export async function mudarStatusOS(
  workOrderId: string,
  status: WorkOrderStatus,
  opcoes: {
    userId?: string | null;
    nota?: string;
    titulo?: string;
    visivelParaCliente?: boolean;
  } = {},
) {
  return prisma.$transaction(async (tx) => {
    const fecha = status === "concluida" || status === "cancelada";

    const ordem = await tx.workOrder.update({
      where: { id: workOrderId },
      data: { status, ...(fecha ? { closedAt: new Date() } : { closedAt: null }) },
    });

    await tx.workOrderEvent.create({
      data: {
        workOrderId,
        title: opcoes.titulo ?? ROTULO_OS[status],
        message: opcoes.nota ?? "",
        visibleToCustomer: opcoes.visivelParaCliente ?? true,
        userId: opcoes.userId ?? null,
      },
    });

    return ordem;
  });
}

export type EntradaConclusaoOS = {
  workOrderId: string;
  diagnostico?: string;
  servicoExecutado?: string;
  testeFinal?: string;
  garantiaDias?: number | null;
  nota?: string;
  userId?: string | null;
  /** Aceite do cliente, quando colhido na hora da entrega. */
  aceite?: { nome: string; ip?: string };
  /**
   * Laudo já gravado no storage privado. Só existe Document quando existe
   * arquivo: uma linha de laudo apontando para o vazio seria pior que nenhuma.
   */
  laudo?: { storageKey: string; titulo?: string; mime?: string; size?: number };
  /** Encerra também o chamado de origem. Ligado por padrão. */
  encerrarChamado?: boolean;
};

/**
 * Fecha a OS.
 *
 * Fecha de verdade: recalcula os totais a partir dos itens, carimba o aceite,
 * grava o laudo quando há arquivo, atualiza o prontuário do equipamento (última
 * e próxima manutenção) e encerra o chamado que originou o serviço.
 */
export async function concluirOS(entrada: EntradaConclusaoOS) {
  return prisma.$transaction(
    async (tx) => {
      const ordem = await tx.workOrder.findUnique({
        where: { id: entrada.workOrderId },
        include: {
          request: { select: { id: true, number: true, customerId: true } },
          equipment: {
            select: { id: true, customerId: true, maintenanceIntervalDays: true },
          },
        },
      });
      if (!ordem) throw new ErroDeOS("Ordem de serviço não encontrada.");
      if (ordem.status === "concluida") return ordem;
      if (ordem.status === "cancelada") {
        throw new ErroDeOS("Esta OS foi cancelada e não pode ser concluída.");
      }

      const agora = new Date();

      await tx.workOrder.update({
        where: { id: ordem.id },
        data: {
          status: "concluida",
          closedAt: agora,
          ...(entrada.diagnostico === undefined ? {} : { diagnosis: entrada.diagnostico }),
          ...(entrada.servicoExecutado === undefined
            ? {}
            : { workDone: entrada.servicoExecutado }),
          ...(entrada.testeFinal === undefined ? {} : { finalTest: entrada.testeFinal }),
          ...(entrada.garantiaDias === undefined
            ? {}
            : { serviceWarrantyDays: entrada.garantiaDias }),
          ...(entrada.aceite
            ? {
                acceptedAt: agora,
                acceptedByName: entrada.aceite.nome,
                acceptedIp: entrada.aceite.ip ?? "",
              }
            : {}),
        },
      });

      const fechada = await recalcularTotaisDaOS(ordem.id, tx);

      await tx.workOrderEvent.create({
        data: {
          workOrderId: ordem.id,
          title: "Serviço concluído",
          message: entrada.nota ?? entrada.servicoExecutado ?? "",
          userId: entrada.userId ?? null,
        },
      });

      // prontuário do equipamento
      if (ordem.equipment) {
        const intervalo = ordem.equipment.maintenanceIntervalDays;
        await tx.equipment.update({
          where: { id: ordem.equipment.id },
          data: {
            status: "operacional",
            lastMaintenanceAt: agora,
            ...(intervalo
              ? { nextMaintenanceAt: new Date(agora.getTime() + intervalo * 86_400_000) }
              : {}),
          },
        });
        await tx.equipmentEvent.create({
          data: {
            equipmentId: ordem.equipment.id,
            kind: "manutencao",
            title: `OS ${ordem.number} concluída`,
            description: entrada.servicoExecutado ?? "",
            happenedAt: agora,
            workOrderId: ordem.id,
          },
        });
      }

      if (entrada.laudo) {
        await tx.document.create({
          data: {
            kind: "laudo",
            title: entrada.laudo.titulo ?? `Laudo técnico — OS ${ordem.number}`,
            storageKey: entrada.laudo.storageKey,
            mime: entrada.laudo.mime ?? "application/pdf",
            size: entrada.laudo.size ?? 0,
            customerId: ordem.equipment?.customerId ?? ordem.request?.customerId ?? null,
            equipmentId: ordem.equipmentId,
            workOrderId: ordem.id,
          },
        });
      }

      if (ordem.request && (entrada.encerrarChamado ?? true)) {
        await tx.serviceRequest.update({
          where: { id: ordem.request.id },
          data: { status: "concluido", closedAt: agora },
        });
        await tx.serviceRequestEvent.create({
          data: {
            requestId: ordem.request.id,
            status: "concluido",
            title: ROTULO_CHAMADO.concluido,
            message: `Serviço finalizado na OS ${ordem.number}.`,
            userId: entrada.userId ?? null,
          },
        });
        if (ordem.request.customerId) {
          await tx.notification.create({
            data: {
              customerId: ordem.request.customerId,
              kind: "chamado_concluido",
              title: `Chamado ${ordem.request.number} concluído`,
              body: "Seu equipamento foi testado e liberado.",
              href: `/minha-jb/assistencia/${ordem.request.id}`,
            },
          });
        }
      }

      return fechada;
    },
    { timeout: 20_000 },
  );
}

/** Formato mínimo para desenhar a linha do tempo da OS. */
export type OSParaLinha = {
  status: WorkOrderStatus;
  openedAt: Date;
  closedAt: Date | null;
  acceptedAt: Date | null;
};

/**
 * Linha do tempo da OS.
 *
 * `WorkOrderEvent` não guarda status, então as datas vêm dos carimbos da
 * própria OS. A etapa do meio pode aparecer sem data — melhor sem data do que
 * com uma data adivinhada.
 */
export function passosDaOS(ordem: OSParaLinha): PassoLinha[] {
  const cancelada = ordem.status === "cancelada";
  const etapaAtual = ETAPA_DO_STATUS[ordem.status];
  const indiceAtual = ETAPAS_VISIVEIS.indexOf(etapaAtual);

  const datas: Partial<Record<WorkOrderStatus, Date | null>> = {
    aberta: ordem.openedAt,
    concluida: ordem.status === "concluida" ? ordem.closedAt : null,
  };

  const passos: PassoLinha[] = ETAPAS_VISIVEIS.map((etapa, i) => {
    const quando = datas[etapa];
    const estado: PassoLinha["estado"] = cancelada
      ? i === 0
        ? "concluido"
        : "cancelado"
      : i < indiceAtual
        ? "concluido"
        : i === indiceAtual
          ? "atual"
          : "futuro";

    return {
      titulo: ROTULO_OS[etapa],
      descricao: DESCRICAO_ETAPA[etapa],
      quando: quando ? formatarDataHora(quando) : undefined,
      estado,
    };
  });

  passos.push({
    titulo: "Aceite do cliente",
    descricao: "Confirmação de que o equipamento foi entregue funcionando.",
    quando: ordem.acceptedAt ? formatarDataHora(ordem.acceptedAt) : undefined,
    estado: cancelada
      ? "cancelado"
      : ordem.acceptedAt
        ? "concluido"
        : ordem.status === "concluida"
          ? "atual"
          : "futuro",
  });

  return passos;
}
