import "server-only";

import type { ContractStatus, Prisma, VisitStatus } from "@prisma/client";

import { proximoCodigo } from "@/lib/codigos";
import { formatarData } from "@/lib/format";
import { enfileirar } from "@/lib/notificacoes";
import { abrirOS } from "@/lib/os";
import { prisma } from "@/lib/prisma";

/**
 * Regras da manutenção preventiva.
 *
 * O contrato (MaintenanceContract) cobre equipamentos; a periodicidade sai do
 * plano contratado. Cada visita prevista vira uma linha em MaintenanceVisit
 * assim que o contrato é assinado — a agenda do ano inteiro nasce junto.
 *
 * Duas decisões que valem explicar:
 *
 * 1. A periodicidade NÃO é campo do contrato. Ela é derivada do plano
 *    (`periodMonths` dividido por `visitsIncluded`) ou informada na chamada.
 *    Sem plano e sem parâmetro, cai no intervalo do próprio equipamento. Não
 *    havendo nenhuma das três fontes, o equipamento fica de fora da geração e
 *    é devolvido em `semPeriodicidade` — melhor não gerar do que chutar prazo.
 *
 * 2. `gerarVisitasDoContrato` é idempotente. Rodar de novo depois de renovar a
 *    vigência acrescenta só o que falta, nunca duplica o que já existe.
 */

export class ErroDeManutencao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeManutencao";
  }
}

export const ROTULO_CONTRATO: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

export const ROTULO_VISITA: Record<VisitStatus, string> = {
  prevista: "Prevista",
  agendada: "Agendada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Visitas que ainda vão acontecer. */
export const STATUS_VISITA_ABERTOS: VisitStatus[] = ["prevista", "agendada"];

const DIA_EM_MS = 86_400_000;

/** Soma meses respeitando o fim do mês: 31/01 + 1 mês vira 28/02, não 03/03. */
function somarMeses(data: Date, meses: number) {
  const d = new Date(data.getTime());
  const dia = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  if (d.getUTCDate() < dia) d.setUTCDate(0);
  return d;
}

function mesmoDia(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) < DIA_EM_MS;
}

export type EntradaContrato = {
  customerId: string;
  planId?: string | null;
  /** Equipamentos cobertos. É o que define quantas visitas serão geradas. */
  equipamentoIds: string[];
  inicio?: Date;
  fim?: Date | null;
  precoCents?: number;
  /** Meses entre visitas. Sobrepõe a periodicidade do plano. */
  intervaloMeses?: number;
  notas?: string;
  /** Gera a agenda de visitas junto com o contrato. Ligado por padrão. */
  gerarVisitas?: boolean;
};

/**
 * Cria o contrato de manutenção e, por padrão, já monta a agenda de visitas.
 *
 * O contrato nasce ativo quando tem data de início: um contrato assinado sem
 * agenda é a forma mais comum de a preventiva virar corretiva.
 */
export async function contratarPlano(entrada: EntradaContrato) {
  if (entrada.equipamentoIds.length === 0) {
    throw new ErroDeManutencao("Escolha ao menos um equipamento para cobrir.");
  }

  const contrato = await prisma.$transaction(async (tx) => {
    const equipamentos = await tx.equipment.findMany({
      where: { id: { in: entrada.equipamentoIds }, customerId: entrada.customerId },
      select: { id: true },
    });
    if (equipamentos.length === 0) {
      throw new ErroDeManutencao("Nenhum dos equipamentos informados é deste cliente.");
    }

    const plano = entrada.planId
      ? await tx.maintenancePlan.findUnique({ where: { id: entrada.planId } })
      : null;

    const inicio = entrada.inicio ?? new Date();
    const fim =
      entrada.fim ?? (plano ? somarMeses(inicio, plano.periodMonths) : null);

    const numero = await proximoCodigo("contrato", tx);

    const criado = await tx.maintenanceContract.create({
      data: {
        number: numero,
        status: "ativo",
        customerId: entrada.customerId,
        planId: plano?.id ?? null,
        startsAt: inicio,
        endsAt: fim,
        priceCents: Math.max(0, Math.trunc(entrada.precoCents ?? plano?.priceCents ?? 0)),
        notes: entrada.notas ?? "",
        items: {
          create: equipamentos.map((e) => ({ equipmentId: e.id })),
        },
      },
    });

    await tx.notification.create({
      data: {
        customerId: entrada.customerId,
        kind: "contrato_ativo",
        title: `Contrato de manutenção ${numero} ativo`,
        body: fim
          ? `Cobertura válida até ${formatarData(fim)}.`
          : "Cobertura ativa a partir de hoje.",
        href: `/minha-jb/manutencoes`,
      },
    });

    return criado;
  });

  if (entrada.gerarVisitas ?? true) {
    await gerarVisitasDoContrato(contrato.id, { intervaloMeses: entrada.intervaloMeses });
  }

  return contrato;
}

/** Muda o status do contrato (suspender, encerrar, reativar). */
export async function mudarStatusContrato(contratoId: string, status: ContractStatus) {
  const contrato = await prisma.maintenanceContract.update({
    where: { id: contratoId },
    data: { status },
  });

  // contrato encerrado não deixa visita futura pendurada na agenda
  if (status === "encerrado") {
    await prisma.maintenanceVisit.updateMany({
      where: { contractId: contratoId, status: { in: STATUS_VISITA_ABERTOS } },
      data: { status: "cancelada" },
    });
  }

  return contrato;
}

/**
 * Calcula o intervalo em meses entre visitas.
 *
 * Um plano de 12 meses com 2 visitas incluídas visita a cada 6 meses. Sem
 * plano, o intervalo do equipamento (em dias) é convertido para meses.
 */
function intervaloDoPlano(plano: { periodMonths: number; visitsIncluded: number } | null) {
  if (!plano || plano.visitsIncluded <= 0) return null;
  return Math.max(1, Math.round(plano.periodMonths / plano.visitsIncluded));
}

/**
 * Monta as visitas previstas do contrato até o fim da vigência.
 *
 * Devolve quantas foram criadas e quais equipamentos ficaram sem agenda por
 * falta de periodicidade — a tela precisa poder dizer isso em voz alta em vez
 * de fingir que está tudo agendado.
 */
export async function gerarVisitasDoContrato(
  contratoId: string,
  opcoes: { intervaloMeses?: number } = {},
) {
  const contrato = await prisma.maintenanceContract.findUnique({
    where: { id: contratoId },
    include: {
      plan: { select: { periodMonths: true, visitsIncluded: true } },
      items: {
        include: {
          equipment: { select: { id: true, name: true, maintenanceIntervalDays: true } },
        },
      },
    },
  });
  if (!contrato) throw new ErroDeManutencao("Contrato não encontrado.");

  const inicio = contrato.startsAt;
  if (!inicio) {
    throw new ErroDeManutencao("Defina a data de início antes de gerar as visitas.");
  }

  const fim =
    contrato.endsAt ?? (contrato.plan ? somarMeses(inicio, contrato.plan.periodMonths) : null);
  if (!fim) {
    throw new ErroDeManutencao(
      "Defina o fim da vigência ou escolha um plano para gerar as visitas.",
    );
  }

  const intervaloContrato = opcoes.intervaloMeses ?? intervaloDoPlano(contrato.plan);

  const existentes = await prisma.maintenanceVisit.findMany({
    where: { contractId: contratoId },
    select: { equipmentId: true, dueAt: true },
  });

  const novas: Prisma.MaintenanceVisitCreateManyInput[] = [];
  const semPeriodicidade: string[] = [];

  for (const item of contrato.items) {
    const equipamento = item.equipment;
    const dias = equipamento.maintenanceIntervalDays;

    const proxima = intervaloContrato
      ? (base: Date) => somarMeses(base, intervaloContrato)
      : dias && dias > 0
        ? (base: Date) => new Date(base.getTime() + dias * DIA_EM_MS)
        : null;

    if (!proxima) {
      semPeriodicidade.push(equipamento.name);
      continue;
    }

    const jaTem = existentes.filter((v) => v.equipmentId === equipamento.id);
    let quando = proxima(inicio);
    let guarda = 0;

    while (quando <= fim && guarda < 120) {
      guarda += 1;
      const duplicada = jaTem.some((v) => mesmoDia(v.dueAt, quando));
      if (!duplicada) {
        novas.push({
          contractId: contratoId,
          equipmentId: equipamento.id,
          status: "prevista",
          dueAt: quando,
        });
      }
      quando = proxima(quando);
    }
  }

  if (novas.length > 0) {
    await prisma.maintenanceVisit.createMany({ data: novas });
  }

  return { criadas: novas.length, semPeriodicidade };
}

/** Marca dia e técnico de uma visita prevista. */
export async function agendarVisitaDeManutencao(
  visitaId: string,
  entrada: { quando: Date; tecnicoId?: string | null; notas?: string },
) {
  const visita = await prisma.maintenanceVisit.update({
    where: { id: visitaId },
    data: {
      status: "agendada",
      scheduledAt: entrada.quando,
      technicianId: entrada.tecnicoId ?? null,
      ...(entrada.notas === undefined ? {} : { notes: entrada.notas }),
    },
    include: {
      equipment: {
        select: {
          customerId: true,
          name: true,
          // o e-mail é para o aviso de fora do site; o de dentro usa só o id
          customer: { select: { email: true } },
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      customerId: visita.equipment.customerId,
      kind: "visita_agendada",
      title: `Manutenção agendada para ${formatarData(entrada.quando)}`,
      body: `Equipamento: ${visita.equipment.name}.`,
      href: "/minha-jb/manutencoes",
    },
  });

  /*
   * Aviso por e-mail.
   *
   * A data entra no `refId` (`<id>:<instante>`) porque remarcar É um fato
   * novo: sem ela a chave de deduplicação seria a mesma e o cliente ficaria
   * esperando o técnico no dia antigo. Salvar de novo a MESMA data continua
   * caindo na chave existente e não manda segundo e-mail. O modelo corta o
   * sufixo para achar a visita.
   */
  const naFila = await enfileirar({
    canal: "email",
    para: visita.equipment.customer.email,
    assunto: `Visita de manutenção agendada para ${formatarData(entrada.quando)}`,
    corpo: "",
    refTipo: "visita",
    refId: `${visita.id}:${entrada.quando.getTime()}`,
    template: "visita_agendada",
  });
  if (!naFila.ok) {
    console.error("[manutencao] aviso de visita não entrou na fila:", naFila.motivo);
  }

  return visita;
}

export type EntradaConclusaoVisita = {
  visitaId: string;
  notas?: string;
  tecnicoId?: string | null;
  /** Abre uma OS quando a visita revelou serviço a fazer. */
  abrirOrdemDeServico?: boolean;
  defeitoEncontrado?: string;
  userId?: string | null;
};

/**
 * Conclui a visita e atualiza o prontuário do equipamento.
 *
 * A OS, quando pedida, é aberta ANTES de fechar a visita, e de propósito: abrir
 * OS já é uma transação própria: aninhar as duas colocaria as mesmas linhas de
 * Equipment sob dois bloqueios ao mesmo tempo. Aberta antes, o pior caso é uma
 * OS aberta visível no backoffice — nunca um deadlock.
 */
export async function concluirVisita(entrada: EntradaConclusaoVisita) {
  const visita = await prisma.maintenanceVisit.findUnique({
    where: { id: entrada.visitaId },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          customerId: true,
          maintenanceIntervalDays: true,
          customer: { select: { name: true } },
        },
      },
    },
  });
  if (!visita) throw new ErroDeManutencao("Visita não encontrada.");
  // já concluída: devolve como está, sem gerar segunda OS nem segundo aviso
  if (visita.status === "concluida") {
    return prisma.maintenanceVisit.findUniqueOrThrow({ where: { id: visita.id } });
  }

  const ordem = entrada.abrirOrdemDeServico
    ? await abrirOS({
        equipmentId: visita.equipmentId,
        tecnicoId: entrada.tecnicoId ?? visita.technicianId,
        nomeCliente: visita.equipment.customer.name,
        defeitoRelatado:
          entrada.defeitoEncontrado?.trim() ||
          `Pendência identificada na manutenção preventiva de ${visita.equipment.name}.`,
        userId: entrada.userId ?? null,
      })
    : null;

  return prisma.$transaction(async (tx) => {
    const agora = new Date();
    const intervalo = visita.equipment.maintenanceIntervalDays;

    const concluida = await tx.maintenanceVisit.update({
      where: { id: visita.id },
      data: {
        status: "concluida",
        doneAt: agora,
        ...(entrada.tecnicoId === undefined ? {} : { technicianId: entrada.tecnicoId }),
        notes: [visita.notes, entrada.notas?.trim(), ordem ? `OS ${ordem.number}` : ""]
          .filter(Boolean)
          .join(" — "),
      },
    });

    await tx.equipment.update({
      where: { id: visita.equipmentId },
      data: {
        lastMaintenanceAt: agora,
        ...(intervalo
          ? { nextMaintenanceAt: new Date(agora.getTime() + intervalo * DIA_EM_MS) }
          : {}),
      },
    });

    await tx.equipmentEvent.create({
      data: {
        equipmentId: visita.equipmentId,
        kind: "manutencao",
        title: "Manutenção preventiva realizada",
        description: entrada.notas ?? "",
        happenedAt: agora,
        workOrderId: ordem?.id ?? null,
        /* A visita já é uma linha da timeline por si só. A referência é o que
           permite que as duas virem uma. */
        visitId: visita.id,
      },
    });

    await tx.notification.create({
      data: {
        customerId: visita.equipment.customerId,
        kind: "visita_concluida",
        title: `Manutenção de ${visita.equipment.name} concluída`,
        body: ordem
          ? `Foi aberta a OS ${ordem.number} para o que precisa de reparo.`
          : "Equipamento revisado e em ordem.",
        href: "/minha-jb/manutencoes",
      },
    });

    return concluida;
  });
}

/** Próximas visitas do cliente, das mais urgentes para as mais distantes. */
export async function proximasVisitas(customerId: string, limite = 5) {
  return prisma.maintenanceVisit.findMany({
    where: {
      status: { in: STATUS_VISITA_ABERTOS },
      equipment: { customerId },
    },
    orderBy: { dueAt: "asc" },
    take: limite,
    include: {
      equipment: { select: { id: true, name: true, brandName: true, modelName: true } },
      contract: { select: { id: true, number: true } },
      technician: { select: { user: { select: { name: true } } } },
    },
  });
}

/**
 * Visitas que já deveriam ter acontecido. Serve tanto para o painel interno
 * quanto para avisar o cliente que a preventiva está atrasada.
 */
export async function visitasAtrasadas(referencia = new Date()) {
  return prisma.maintenanceVisit.findMany({
    where: { status: { in: STATUS_VISITA_ABERTOS }, dueAt: { lt: referencia } },
    orderBy: { dueAt: "asc" },
    include: {
      equipment: { select: { id: true, name: true, customerId: true } },
      contract: { select: { number: true } },
    },
  });
}

/**
 * Lembretes que ainda não foram enviados.
 *
 * Para cada antecedência pedida (por padrão sete dias e um dia), devolve as
 * visitas que caem dentro da janela e que ainda não têm registro daquele
 * lembrete. O registro é gravado por `enviarLembreteDaVisita` só depois de o
 * e-mail entrar na fila, então uma falha no disparo não perde o aviso.
 */
export async function lembretesPendentes(
  diasAntes: number[] = [7, 1],
  referencia = new Date(),
) {
  const pendentes = [];

  for (const dias of diasAntes) {
    const limite = new Date(referencia.getTime() + dias * DIA_EM_MS);

    const visitas = await prisma.maintenanceVisit.findMany({
      where: {
        status: { in: STATUS_VISITA_ABERTOS },
        dueAt: { gte: referencia, lte: limite },
        reminders: { none: { daysBefore: dias } },
      },
      orderBy: { dueAt: "asc" },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            customerId: true,
            customer: { select: { name: true, email: true, phone: true } },
          },
        },
        contract: { select: { number: true } },
      },
    });

    for (const visita of visitas) {
      pendentes.push({ visita, diasAntes: dias });
    }
  }

  return pendentes;
}

/**
 * Marca o lembrete como enviado. `skipDuplicates` faz o trabalho da trava:
 * chamar duas vezes não gera erro nem segundo aviso.
 */
export async function registrarLembrete(visitaId: string, diasAntes: number) {
  const resultado = await prisma.maintenanceReminder.createMany({
    data: [{ visitId: visitaId, daysBefore: diasAntes }],
    skipDuplicates: true,
  });
  return resultado.count > 0;
}

export type ResultadoLembrete = {
  visitaId: string;
  contratoId: string | null;
  /** Endereço que recebeu o e-mail, já normalizado pela fila. */
  para: string;
  /** `false` quando o mesmo lembrete já estava na fila: nenhum e-mail novo. */
  novo: boolean;
};

/**
 * Lembra o cliente da visita por e-mail e só então trava o lembrete.
 *
 * Até 22/09/2026 o lembrete gravava só `Notification`, a caixa de avisos da
 * área do cliente — que saiu do site. O `MaintenanceReminder` era gravado
 * mesmo assim e a tela respondia "Cliente avisado" sem ninguém ter sido
 * avisado; pior, o registro tirava a visita da lista e impedia o reenvio. Por
 * isso a ordem aqui é fixa: primeiro o e-mail entra na fila, depois o registro.
 * Se a fila recusar, nada é gravado e a visita continua pendente.
 *
 * A chave de deduplicação leva a antecedência e a data da visita (`refId` =
 * `<id>:<dias>d:<instante>`): o lembrete de 7 dias e o de 1 dia são e-mails
 * diferentes, e remarcar a visita é fato novo que merece lembrete novo. Clicar
 * de novo no mesmo lembrete cai na chave existente e não manda o segundo.
 */
export async function enviarLembreteDaVisita(
  visitaId: string,
  diasAntes: number,
): Promise<ResultadoLembrete> {
  const visita = await prisma.maintenanceVisit.findUnique({
    where: { id: visitaId },
    select: {
      id: true,
      status: true,
      dueAt: true,
      scheduledAt: true,
      contractId: true,
      equipment: { select: { customer: { select: { email: true } } } },
    },
  });
  if (!visita) throw new ErroDeManutencao("Visita não encontrada.");
  if (!STATUS_VISITA_ABERTOS.includes(visita.status)) {
    throw new ErroDeManutencao("Esta visita já foi concluída ou cancelada: não há o que lembrar.");
  }

  const email = visita.equipment.customer.email.trim();
  if (!email) {
    throw new ErroDeManutencao(
      "O cliente não tem e-mail cadastrado. Avise pelo WhatsApp; o lembrete não foi registrado.",
    );
  }

  const quando = visita.scheduledAt ?? visita.dueAt;
  const naFila = await enfileirar({
    canal: "email",
    para: email,
    assunto: `Lembrete da visita de manutenção de ${formatarData(quando)}`,
    corpo: "",
    refTipo: "visita",
    refId: `${visita.id}:${diasAntes}d:${quando.getTime()}`,
    template: "visita_lembrete",
  });
  if (!naFila.ok) {
    throw new ErroDeManutencao(
      `O e-mail não entrou na fila (${naFila.motivo}). Avise o cliente pelo WhatsApp; o lembrete não foi registrado.`,
    );
  }

  await registrarLembrete(visita.id, diasAntes);

  return {
    visitaId: visita.id,
    contratoId: visita.contractId,
    para: naFila.para,
    novo: !naFila.jaExistia,
  };
}
