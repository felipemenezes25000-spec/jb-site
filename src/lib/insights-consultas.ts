import "server-only";

import { comVolumeMinimo, mediana, type ValorDoIndicador } from "@/lib/insights";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   As consultas dos indicadores

   Cada função aqui implementa exatamente a definição declarada em
   `@/lib/insights` — janela, população, exclusões e denominador. Quando a
   consulta e a definição divergirem, é a definição que está certa e a consulta
   que está errada: ela é o contrato com quem lê o número.

   Todas passam por `comVolumeMinimo`, e nenhuma devolve número abaixo dele.
   ============================================================================ */

const DIA = 86_400_000;

function mesesAtras(meses: number) {
  return new Date(Date.now() - meses * 30 * DIA);
}

/** Modelos com mais chamados nos últimos 12 meses. */
export async function chamadosPorModelo(): Promise<ValorDoIndicador> {
  const chamados = await prisma.serviceRequest.findMany({
    where: {
      createdAt: { gte: mesesAtras(12) },
      status: { not: "cancelado" },
      equipmentId: { not: null },
    },
    select: { equipment: { select: { brandName: true, modelName: true, name: true } } },
  });

  const contagem = new Map<string, number>();
  for (const chamado of chamados) {
    if (!chamado.equipment) continue;
    const rotulo =
      [chamado.equipment.brandName, chamado.equipment.modelName].filter(Boolean).join(" ") ||
      chamado.equipment.name;
    contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1);
  }

  const linhas = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([rotulo, valor]) => ({ rotulo, valor, unidade: "chamados" }));

  return comVolumeMinimo("chamados_por_modelo", linhas, chamados.length);
}

/** Peças mais substituídas em OS concluída. */
export async function pecasSubstituidas(): Promise<ValorDoIndicador> {
  const itens = await prisma.workOrderItem.findMany({
    where: {
      kind: "peca",
      workOrder: { status: "concluida", closedAt: { gte: mesesAtras(12) } },
    },
    select: { description: true, quantity: true },
  });

  const contagem = new Map<string, number>();
  for (const item of itens) {
    const rotulo = item.description.trim() || "sem descrição";
    contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + item.quantity);
  }

  const linhas = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([rotulo, valor]) => ({ rotulo, valor, unidade: "unidades" }));

  return comVolumeMinimo("pecas_substituidas", linhas, itens.length);
}

/**
 * Mediana de dias entre duas OS concluídas do mesmo equipamento.
 *
 * O nome do indicador é literal de propósito. Ver a definição: isto não é
 * MTBF e não é vida útil.
 */
export async function intervaloEntreIntervencoes(): Promise<ValorDoIndicador> {
  const ordens = await prisma.workOrder.findMany({
    where: {
      status: "concluida",
      closedAt: { gte: mesesAtras(24), not: null },
      equipmentId: { not: null },
    },
    orderBy: { closedAt: "asc" },
    select: { equipmentId: true, closedAt: true },
  });

  const porEquipamento = new Map<string, Date[]>();
  for (const ordem of ordens) {
    if (!ordem.equipmentId || !ordem.closedAt) continue;
    const lista = porEquipamento.get(ordem.equipmentId);
    if (lista) lista.push(ordem.closedAt);
    else porEquipamento.set(ordem.equipmentId, [ordem.closedAt]);
  }

  const intervalos: number[] = [];
  for (const datas of porEquipamento.values()) {
    /* Equipamento com uma OS só não tem intervalo. Contá-lo como zero
       derrubaria a mediana inteira. */
    for (let i = 1; i < datas.length; i += 1) {
      intervalos.push((datas[i].getTime() - datas[i - 1].getTime()) / DIA);
    }
  }

  const valor = mediana(intervalos);
  const linhas =
    valor === null
      ? []
      : [{ rotulo: "Mediana", valor: Math.round(valor), unidade: "dias entre OS" }];

  return comVolumeMinimo("intervalo_entre_intervencoes", linhas, intervalos.length);
}

/** Mediana de anos desde a compra ou a instalação. */
export async function idadeDoParque(): Promise<ValorDoIndicador> {
  const equipamentos = await prisma.equipment.findMany({
    where: {
      status: { not: "desativado" },
      OR: [{ purchasedAt: { not: null } }, { installedAt: { not: null } }],
    },
    select: { purchasedAt: true, installedAt: true },
  });

  const agora = Date.now();
  const idades = equipamentos
    .map((equipamento) => equipamento.installedAt ?? equipamento.purchasedAt)
    .filter((data): data is Date => data !== null)
    .map((data) => (agora - data.getTime()) / (DIA * 365));

  const valor = mediana(idades);
  const linhas =
    valor === null
      ? []
      : [{ rotulo: "Mediana", valor: Math.round(valor * 10) / 10, unidade: "anos" }];

  return comVolumeMinimo("idade_do_parque", linhas, idades.length);
}

/**
 * Preventivas vencidas hoje.
 *
 * O denominador é quem TEM plano. Equipamento sem periodicidade cadastrada não
 * está atrasado — está sem plano, e misturar os dois inventa um atraso.
 */
export async function preventivasVencidas(): Promise<ValorDoIndicador> {
  const agora = new Date();

  const [comPlano, vencidas] = await Promise.all([
    prisma.equipment.count({
      where: {
        status: { not: "desativado" },
        maintenanceIntervalDays: { not: null },
        nextMaintenanceAt: { not: null },
      },
    }),
    prisma.equipment.count({
      where: {
        status: { not: "desativado" },
        maintenanceIntervalDays: { not: null },
        nextMaintenanceAt: { lt: agora },
      },
    }),
  ]);

  const linhas = [
    { rotulo: "Vencidas", valor: vencidas, unidade: "equipamentos" },
    { rotulo: "Com plano de manutenção", valor: comPlano, unidade: "equipamentos" },
    {
      rotulo: "Proporção",
      valor: comPlano > 0 ? Math.round((vencidas / comPlano) * 1000) / 10 : 0,
      unidade: "% de quem tem plano",
    },
  ];

  return comVolumeMinimo("preventivas_vencidas", linhas, comPlano);
}

/**
 * Reincidência em 90 dias.
 *
 * A janela para de 3 meses atrás: OS mais recente ainda não teve 90 dias para
 * reincidir, e incluí-la baixaria o indicador artificialmente.
 */
export async function reincidencia(): Promise<ValorDoIndicador> {
  const ordens = await prisma.workOrder.findMany({
    where: {
      status: "concluida",
      closedAt: { gte: mesesAtras(12), lte: mesesAtras(3) },
      equipmentId: { not: null },
    },
    select: { id: true, equipmentId: true, closedAt: true },
  });

  const seguintes = await prisma.workOrder.findMany({
    where: {
      equipmentId: { in: ordens.map((ordem) => ordem.equipmentId as string) },
      openedAt: { gte: mesesAtras(12) },
    },
    select: { equipmentId: true, openedAt: true },
  });

  let reincidiram = 0;
  for (const ordem of ordens) {
    if (!ordem.closedAt) continue;
    const limite = ordem.closedAt.getTime() + 90 * DIA;
    const houve = seguintes.some(
      (outra) =>
        outra.equipmentId === ordem.equipmentId &&
        outra.openedAt.getTime() > ordem.closedAt!.getTime() &&
        outra.openedAt.getTime() <= limite,
    );
    if (houve) reincidiram += 1;
  }

  const linhas = [
    { rotulo: "OS seguidas de outra em 90 dias", valor: reincidiram, unidade: "OS" },
    { rotulo: "OS na janela", valor: ordens.length, unidade: "OS" },
    {
      rotulo: "Proporção",
      valor: ordens.length > 0 ? Math.round((reincidiram / ordens.length) * 1000) / 10 : 0,
      unidade: "%",
    },
  ];

  return comVolumeMinimo("reincidencia", linhas, ordens.length);
}

/** Mediana de dias entre enviar um orçamento e o cliente decidir. */
export async function tempoAteDecisao(): Promise<ValorDoIndicador> {
  const orcamentos = await prisma.quote.findMany({
    where: {
      sentAt: { gte: mesesAtras(12), not: null },
      status: { in: ["aprovado", "recusado"] },
      decidedAt: { not: null },
    },
    select: { sentAt: true, decidedAt: true },
  });

  const dias = orcamentos
    .filter((orcamento) => orcamento.sentAt && orcamento.decidedAt)
    .map(
      (orcamento) =>
        ((orcamento.decidedAt as Date).getTime() - (orcamento.sentAt as Date).getTime()) / DIA,
    );

  const valor = mediana(dias);
  const linhas =
    valor === null ? [] : [{ rotulo: "Mediana", valor: Math.round(valor), unidade: "dias" }];

  return comVolumeMinimo("tempo_ate_decisao", linhas, dias.length);
}
