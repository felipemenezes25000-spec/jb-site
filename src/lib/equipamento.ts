import "server-only";

import type { DocumentKind, EquipmentOrigin, EquipmentStatus } from "@prisma/client";

import { ROTULO_CHAMADO, STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { ROTULO_VISITA } from "@/lib/manutencao";
import { ROTULO_OS } from "@/lib/os";
import { prisma } from "@/lib/prisma";

/**
 * Prontuário do equipamento (Equipment).
 *
 * A ideia é simples e é a espinha da plataforma: cada autoclave, cada cadeira,
 * cada compressor tem uma ficha que sabe quando foi comprado, quando foi
 * consertado, quem consertou e o que falta fazer. `historicoDoEquipamento`
 * junta cinco tabelas numa linha do tempo só — quem abre a ficha não deveria
 * precisar saber que existem cinco tabelas.
 */

export class ErroDeEquipamento extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeEquipamento";
  }
}

/* Os rótulos vivem em `@/lib/rotulos-equipamento`, que é puro e serve também
   ao navegador — este módulo é `server-only`. Reexportados aqui para não
   quebrar quem já os importava daqui. */
export { ROTULO_DOCUMENTO, ROTULO_EQUIPAMENTO, ROTULO_ORIGEM } from "@/lib/rotulos-equipamento";

import {
  ROTULO_DOCUMENTO,
  ROTULO_EQUIPAMENTO,
} from "@/lib/rotulos-equipamento";

const DIA_EM_MS = 86_400_000;

/**
 * Origens permitidas neste arquivo.
 *
 * `compra_jb` é carimbada pelo fluxo de pedido quando o pagamento é confirmado,
 * e `atendimento` pelo fluxo de assistência. Cadastrar manualmente como
 * "comprado na JB" abriria a porta para uma garantia que não existe.
 */
export type OrigemCadastro = Extract<
  EquipmentOrigin,
  "cadastro_cliente" | "cadastro_tecnico"
>;

export type EntradaEquipamento = {
  customerId: string;
  nome: string;
  categoriaId?: string | null;
  marca?: string;
  modelo?: string;
  serie?: string;
  voltagem?: string | null;
  locationId?: string | null;
  sala?: string;
  origem?: OrigemCadastro;
  fabricadoEm?: Date | null;
  compradoEm?: Date | null;
  instaladoEm?: Date | null;
  garantiaAte?: Date | null;
  /** Intervalo de manutenção preventiva. Define a próxima data prevista. */
  intervaloDias?: number | null;
  notas?: string;
  mediaIds?: string[];
};

/**
 * Cadastra o equipamento na ficha do cliente.
 *
 * A próxima manutenção é calculada a partir da instalação (ou da compra, ou de
 * hoje) somada ao intervalo informado. Sem intervalo, não há próxima data —
 * melhor um campo vazio do que uma data inventada que gera cobrança indevida.
 */
export async function cadastrarEquipamento(entrada: EntradaEquipamento) {
  const nome = entrada.nome.trim();
  if (!nome) throw new ErroDeEquipamento("Informe o nome do equipamento.");

  return prisma.$transaction(async (tx) => {
    if (entrada.locationId) {
      const unidade = await tx.customerLocation.findFirst({
        where: { id: entrada.locationId, customerId: entrada.customerId },
        select: { id: true },
      });
      if (!unidade) {
        throw new ErroDeEquipamento("A unidade escolhida não pertence a este cliente.");
      }
    }

    const intervalo = entrada.intervaloDias ?? null;
    const base = entrada.instaladoEm ?? entrada.compradoEm ?? new Date();
    const proxima =
      intervalo && intervalo > 0 ? new Date(base.getTime() + intervalo * DIA_EM_MS) : null;

    const equipamento = await tx.equipment.create({
      data: {
        customerId: entrada.customerId,
        name: nome,
        categoryId: entrada.categoriaId ?? null,
        brandName: entrada.marca ?? "",
        modelName: entrada.modelo ?? "",
        serialNumber: entrada.serie ?? "",
        voltage: entrada.voltagem ?? null,
        locationId: entrada.locationId ?? null,
        room: entrada.sala ?? "",
        origin: entrada.origem ?? "cadastro_cliente",
        status: "operacional",
        manufacturedAt: entrada.fabricadoEm ?? null,
        purchasedAt: entrada.compradoEm ?? null,
        installedAt: entrada.instaladoEm ?? null,
        warrantyUntil: entrada.garantiaAte ?? null,
        maintenanceIntervalDays: intervalo,
        nextMaintenanceAt: proxima,
        notes: entrada.notas ?? "",
      },
    });

    const midias = entrada.mediaIds ?? [];
    if (midias.length > 0) {
      await tx.equipmentMedia.createMany({
        data: midias.map((mediaId, ordem) => ({
          equipmentId: equipamento.id,
          mediaId,
          order: ordem,
        })),
        skipDuplicates: true,
      });
    }

    await tx.equipmentEvent.create({
      data: {
        equipmentId: equipamento.id,
        kind: "nota",
        title: "Equipamento cadastrado",
        description:
          entrada.origem === "cadastro_tecnico"
            ? "Registrado pela equipe técnica da JB."
            : "Registrado pelo cliente na área Área da Clínica.",
      },
    });

    return equipamento;
  });
}

/**
 * Equipamentos do cliente com a contagem de chamados em aberto.
 *
 * A contagem sai de um `groupBy` separado em vez de um count por linha: uma
 * consulta a mais, nenhuma consulta por equipamento.
 */
export async function equipamentosDoCliente(customerId: string) {
  const equipamentos = await prisma.equipment.findMany({
    where: { customerId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true, slug: true } },
      location: { select: { id: true, name: true } },
      media: {
        take: 1,
        orderBy: { order: "asc" },
        select: { media: { select: { url: true, alt: true } } },
      },
    },
  });

  if (equipamentos.length === 0) return [];

  const abertos = await prisma.serviceRequest.groupBy({
    by: ["equipmentId"],
    where: {
      equipmentId: { in: equipamentos.map((e) => e.id) },
      status: { in: STATUS_CHAMADO_ABERTOS },
    },
    _count: { _all: true },
  });

  const contagem = new Map(
    abertos.map((linha) => [linha.equipmentId ?? "", linha._count._all]),
  );

  return equipamentos.map((equipamento) => ({
    ...equipamento,
    imagemUrl: equipamento.media[0]?.media.url ?? null,
    imagemAlt: equipamento.media[0]?.media.alt || equipamento.name,
    chamadosAbertos: contagem.get(equipamento.id) ?? 0,
  }));
}

export type TipoHistorico = "evento" | "chamado" | "os" | "visita" | "documento";

export type ItemHistorico = {
  id: string;
  tipo: TipoHistorico;
  titulo: string;
  descricao: string;
  quando: Date;
  /** Rótulo de status, quando o item tem um. */
  etiqueta?: string;
  /** Destino na área do cliente. Ausente quando não há página para abrir. */
  href?: string;
};

/**
 * Linha do tempo completa do equipamento, do mais recente para o mais antigo.
 *
 * Junta os eventos manuais, os chamados de assistência, as ordens de serviço,
 * as visitas de manutenção e os documentos. As cinco consultas rodam em
 * paralelo — são independentes entre si.
 */
export async function historicoDoEquipamento(equipmentId: string): Promise<ItemHistorico[]> {
  const [eventos, chamados, ordens, visitas, documentos] = await Promise.all([
    prisma.equipmentEvent.findMany({
      where: { equipmentId },
      orderBy: { happenedAt: "desc" },
    }),
    prisma.serviceRequest.findMany({
      where: { equipmentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.workOrder.findMany({
      where: { equipmentId },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        reportedIssue: true,
        workDone: true,
        openedAt: true,
        requestId: true,
      },
    }),
    prisma.maintenanceVisit.findMany({
      where: { equipmentId },
      orderBy: { dueAt: "desc" },
      select: {
        id: true,
        status: true,
        dueAt: true,
        doneAt: true,
        notes: true,
        contract: { select: { number: true } },
      },
    }),
    prisma.document.findMany({
      where: { equipmentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, title: true, createdAt: true },
    }),
  ]);

  const linha: ItemHistorico[] = [
    ...eventos.map((evento) => ({
      id: `evento-${evento.id}`,
      tipo: "evento" as const,
      titulo: evento.title,
      descricao: evento.description,
      quando: evento.happenedAt,
    })),
    ...chamados.map((chamado) => ({
      id: `chamado-${chamado.id}`,
      tipo: "chamado" as const,
      titulo: `Chamado ${chamado.number}`,
      descricao: chamado.description,
      quando: chamado.createdAt,
      etiqueta: ROTULO_CHAMADO[chamado.status],
      href: `/minha-jb/assistencia/${chamado.id}`,
    })),
    ...ordens.map((ordem) => ({
      id: `os-${ordem.id}`,
      tipo: "os" as const,
      titulo: `Ordem de serviço ${ordem.number}`,
      descricao: ordem.workDone || ordem.reportedIssue,
      quando: ordem.openedAt,
      etiqueta: ROTULO_OS[ordem.status],
      // a OS é vista pelo cliente dentro do chamado que a originou
      ...(ordem.requestId ? { href: `/minha-jb/assistencia/${ordem.requestId}` } : {}),
    })),
    ...visitas.map((visita) => ({
      id: `visita-${visita.id}`,
      tipo: "visita" as const,
      titulo: visita.contract
        ? `Manutenção preventiva — contrato ${visita.contract.number}`
        : "Manutenção preventiva",
      descricao: visita.notes,
      quando: visita.doneAt ?? visita.dueAt,
      etiqueta: ROTULO_VISITA[visita.status],
      href: "/minha-jb/manutencoes",
    })),
    ...documentos.map((documento) => ({
      id: `documento-${documento.id}`,
      tipo: "documento" as const,
      titulo: documento.title,
      descricao: ROTULO_DOCUMENTO[documento.kind],
      quando: documento.createdAt,
      href: "/minha-jb/documentos",
    })),
  ];

  return linha.sort((a, b) => b.quando.getTime() - a.quando.getTime());
}

/** Anota um acontecimento na ficha. É o que sustenta a linha do tempo manual. */
export async function registrarEvento(
  equipmentId: string,
  entrada: {
    kind?: "compra" | "instalacao" | "manutencao" | "assistencia" | "nota" | "status";
    titulo: string;
    descricao?: string;
    quando?: Date;
    workOrderId?: string | null;
  },
) {
  const titulo = entrada.titulo.trim();
  if (!titulo) throw new ErroDeEquipamento("Descreva o que aconteceu.");

  return prisma.equipmentEvent.create({
    data: {
      equipmentId,
      kind: entrada.kind ?? "nota",
      title: titulo,
      description: entrada.descricao ?? "",
      happenedAt: entrada.quando ?? new Date(),
      workOrderId: entrada.workOrderId ?? null,
    },
  });
}

/**
 * Muda o estado do equipamento e registra o evento na mesma transação.
 *
 * Ninguém deveria descobrir que a autoclave está parada sem descobrir junto
 * desde quando e por quê.
 */
export async function mudarStatusEquipamento(
  equipmentId: string,
  status: EquipmentStatus,
  opcoes: { nota?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const equipamento = await tx.equipment.update({
      where: { id: equipmentId },
      data: { status },
    });

    await tx.equipmentEvent.create({
      data: {
        equipmentId,
        kind: "status",
        title: `Situação: ${ROTULO_EQUIPAMENTO[status].toLowerCase()}`,
        description: opcoes.nota ?? "",
      },
    });

    return equipamento;
  });
}
