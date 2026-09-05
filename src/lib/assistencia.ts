import "server-only";

import type { Prisma, ServiceRequestStatus, Urgency } from "@prisma/client";

import type { PassoLinha } from "@/components/ui/data";
import { proximoCodigo } from "@/lib/codigos";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Regras do chamado de assistência técnica (ServiceRequest).
 *
 * Três coisas guiam este arquivo:
 *
 * 1. Todo chamado nasce com número (AT-xxxxxx) e com um evento. O histórico
 *    nunca começa vazio — o cliente precisa ver que a solicitação existe desde
 *    o primeiro segundo.
 *
 * 2. Status e evento andam juntos, sempre na mesma transação. Um status sem
 *    evento é um buraco na linha do tempo; um evento sem status é uma mentira.
 *
 * 3. O cliente só vê o que foi marcado como visível. Nota interna de triagem
 *    existe e é útil, mas fica do lado de cá.
 */

export class ErroDeAssistencia extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeAssistencia";
  }
}

export type StatusAgendamento = "agendado" | "em_andamento" | "concluido" | "cancelado";

export const ROTULO_AGENDAMENTO: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ROTULO_CHAMADO: Record<ServiceRequestStatus, string> = {
  solicitacao_recebida: "Solicitação recebida",
  triagem: "Em triagem",
  aguardando_cliente: "Aguardando o cliente",
  visita_agendada: "Visita agendada",
  tecnico_a_caminho: "Técnico a caminho",
  em_diagnostico: "Em diagnóstico",
  orcamento_enviado: "Orçamento enviado",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Orçamento aprovado",
  aguardando_peca: "Aguardando peça",
  em_manutencao: "Em manutenção",
  testes: "Em testes",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ROTULO_URGENCIA: Record<Urgency, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  parado: "Equipamento parado",
};

/**
 * Ordem canônica do atendimento. `aguardando_cliente` e `cancelado` ficam de
 * fora porque não são etapas de avanço: são desvios que podem acontecer em
 * qualquer ponto do caminho.
 */
export const FLUXO_CHAMADO: ServiceRequestStatus[] = [
  "solicitacao_recebida",
  "triagem",
  "visita_agendada",
  "tecnico_a_caminho",
  "em_diagnostico",
  "orcamento_enviado",
  "aguardando_aprovacao",
  "aprovado",
  "aguardando_peca",
  "em_manutencao",
  "testes",
  "concluido",
];

/** Chamado que ainda consome atenção da equipe — tudo que não terminou. */
export const STATUS_CHAMADO_ABERTOS: ServiceRequestStatus[] = [
  ...FLUXO_CHAMADO.filter((status) => status !== "concluido"),
  "aguardando_cliente",
];

/** Etapas mostradas ao cliente. Menos ruído do que os catorze status reais. */
const ETAPAS_VISIVEIS: ServiceRequestStatus[] = [
  "solicitacao_recebida",
  "triagem",
  "visita_agendada",
  "em_diagnostico",
  "em_manutencao",
  "concluido",
];

/**
 * Em que etapa visível cada status cai. `aguardando_peca` continua sendo
 * manutenção aos olhos de quem espera o equipamento voltar a funcionar.
 */
const ETAPA_DO_STATUS: Record<ServiceRequestStatus, ServiceRequestStatus> = {
  solicitacao_recebida: "solicitacao_recebida",
  triagem: "triagem",
  aguardando_cliente: "triagem",
  visita_agendada: "visita_agendada",
  tecnico_a_caminho: "visita_agendada",
  em_diagnostico: "em_diagnostico",
  orcamento_enviado: "em_diagnostico",
  aguardando_aprovacao: "em_diagnostico",
  aprovado: "em_diagnostico",
  aguardando_peca: "em_manutencao",
  em_manutencao: "em_manutencao",
  testes: "em_manutencao",
  concluido: "concluido",
  cancelado: "concluido",
};

const DESCRICAO_ETAPA: Partial<Record<ServiceRequestStatus, string>> = {
  solicitacao_recebida: "Recebemos seu chamado e ele já está na fila da equipe técnica.",
  triagem: "Analisamos o relato para definir peça, técnico e prazo.",
  visita_agendada: "Data confirmada com você. O técnico vai até o equipamento.",
  em_diagnostico: "O técnico avalia a causa e monta o orçamento do reparo.",
  em_manutencao: "Reparo em execução na bancada ou na sua clínica.",
  concluido: "Equipamento testado e devolvido em funcionamento.",
};

/** Status que fecham o chamado e carimbam `closedAt`. */
const STATUS_FINAIS: ServiceRequestStatus[] = ["concluido", "cancelado"];

export type EntradaChamado = {
  customerId?: string | null;
  equipmentId?: string | null;
  /**
   * Unidade do cliente. O ServiceRequest não guarda a unidade: o que ele guarda
   * é o endereço já resolvido, para que o chamado antigo não mude de lugar se a
   * clínica for renomeada ou mudar de rua depois.
   */
  locationId?: string | null;
  contato: { nome: string; email: string; telefone?: string };
  equipamento?: {
    categoryId?: string | null;
    marca?: string;
    modelo?: string;
    serie?: string;
  };
  problema: {
    tipo?: string;
    descricao: string;
    urgencia?: Urgency;
  };
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  disponibilidade?: string;
  notaInterna?: string;
  /** Fotos e vídeos já enviados ao storage, na ordem em que devem aparecer. */
  mediaIds?: string[];
};

type Endereco = {
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
};

const ENDERECO_VAZIO: Endereco = {
  addressZip: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
};

/**
 * Descobre o endereço do atendimento.
 *
 * Ordem de preferência: o que foi digitado no formulário, depois o endereço da
 * unidade escolhida, depois o endereço padrão do cliente. Nada é inventado — se
 * não houver nenhuma das três fontes, o chamado nasce sem endereço e a triagem
 * pergunta.
 */
async function resolverEndereco(
  tx: Prisma.TransactionClient,
  entrada: EntradaChamado,
): Promise<Endereco> {
  const digitado = entrada.endereco;
  /**
   * Qualquer campo preenchido já significa "o atendimento é aqui".
   *
   * A condição antiga exigia CEP ou logradouro. Quem informasse só cidade e
   * bairro — endereço rural, ou obra sem número — tinha o texto jogado fora e o
   * chamado nascia com o endereço padrão da conta: o técnico ia para o lugar
   * errado sem ninguém perceber.
   */
  const informouAlgo = Boolean(
    digitado &&
      (digitado.cep ||
        digitado.logradouro ||
        digitado.numero ||
        digitado.complemento ||
        digitado.bairro ||
        digitado.cidade ||
        digitado.uf),
  );

  if (digitado && informouAlgo) {
    return {
      addressZip: digitado.cep ?? "",
      addressStreet: digitado.logradouro ?? "",
      addressNumber: digitado.numero ?? "",
      addressComplement: digitado.complemento ?? "",
      addressDistrict: digitado.bairro ?? "",
      addressCity: digitado.cidade ?? "",
      addressState: digitado.uf ?? "",
    };
  }

  if (entrada.locationId) {
    const unidade = await tx.customerLocation.findUnique({
      where: { id: entrada.locationId },
      include: { address: true },
    });
    if (unidade?.address) {
      const e = unidade.address;
      return {
        addressZip: e.zip,
        addressStreet: e.street,
        addressNumber: e.number,
        addressComplement: e.complement,
        addressDistrict: e.district,
        addressCity: e.city,
        addressState: e.state,
      };
    }
  }

  if (entrada.customerId) {
    const padrao = await tx.customerAddress.findFirst({
      where: { customerId: entrada.customerId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    if (padrao) {
      return {
        addressZip: padrao.zip,
        addressStreet: padrao.street,
        addressNumber: padrao.number,
        addressComplement: padrao.complement,
        addressDistrict: padrao.district,
        addressCity: padrao.city,
        addressState: padrao.state,
      };
    }
  }

  return ENDERECO_VAZIO;
}

/**
 * Grava o status e o evento correspondente na mesma transação, carimbando
 * `closedAt` quando o chamado termina. Todo caminho que mexe em status passa
 * por aqui — inclusive o agendamento de visita.
 */
async function aplicarStatus(
  tx: Prisma.TransactionClient,
  chamadoId: string,
  status: ServiceRequestStatus,
  opcoes: {
    titulo?: string;
    nota?: string;
    userId?: string | null;
    visivelParaCliente?: boolean;
  } = {},
) {
  const fecha = STATUS_FINAIS.includes(status);

  const chamado = await tx.serviceRequest.update({
    where: { id: chamadoId },
    data: {
      status,
      ...(fecha ? { closedAt: new Date() } : { closedAt: null }),
    },
  });

  const visivel = opcoes.visivelParaCliente ?? true;

  await tx.serviceRequestEvent.create({
    data: {
      requestId: chamadoId,
      status,
      title: opcoes.titulo ?? ROTULO_CHAMADO[status],
      message: opcoes.nota ?? "",
      visibleToCustomer: visivel,
      userId: opcoes.userId ?? null,
    },
  });

  if (visivel && chamado.customerId) {
    await tx.notification.create({
      data: {
        customerId: chamado.customerId,
        kind: "chamado_status",
        title: `Chamado ${chamado.number}: ${ROTULO_CHAMADO[status].toLowerCase()}`,
        body: opcoes.nota ?? "",
        href: `/minha-jb/assistencia/${chamado.id}`,
      },
    });
  }

  return chamado;
}

/**
 * Abre o chamado.
 *
 * Cria o número, o registro, as mídias, o primeiro evento e — quando existe
 * conta — a notificação. Quando o chamado aponta para um equipamento do
 * prontuário, o equipamento também ganha um evento: quem abre a ficha dele
 * depois enxerga a assistência sem precisar cruzar tabelas na cabeça.
 */
export async function abrirChamado(entrada: EntradaChamado) {
  const descricao = entrada.problema.descricao.trim();
  if (!descricao) {
    throw new ErroDeAssistencia("Descreva o problema para abrirmos o chamado.");
  }

  return prisma.$transaction(async (tx) => {
    const numero = await proximoCodigo("chamado", tx);
    const endereco = await resolverEndereco(tx, entrada);

    const chamado = await tx.serviceRequest.create({
      data: {
        number: numero,
        status: "solicitacao_recebida",
        customerId: entrada.customerId ?? null,
        equipmentId: entrada.equipmentId ?? null,
        contactName: entrada.contato.nome,
        contactEmail: entrada.contato.email,
        contactPhone: entrada.contato.telefone ?? "",
        categoryId: entrada.equipamento?.categoryId ?? null,
        brandName: entrada.equipamento?.marca ?? "",
        modelName: entrada.equipamento?.modelo ?? "",
        serialNumber: entrada.equipamento?.serie ?? "",
        problemKind: entrada.problema.tipo ?? "",
        description: descricao,
        urgency: entrada.problema.urgencia ?? "normal",
        availability: entrada.disponibilidade ?? "",
        internalNote: entrada.notaInterna ?? "",
        ...endereco,
      },
    });

    const midias = entrada.mediaIds ?? [];
    if (midias.length > 0) {
      await tx.serviceRequestMedia.createMany({
        data: midias.map((mediaId, ordem) => ({
          requestId: chamado.id,
          mediaId,
          order: ordem,
        })),
        skipDuplicates: true,
      });
    }

    await tx.serviceRequestEvent.create({
      data: {
        requestId: chamado.id,
        status: "solicitacao_recebida",
        title: "Chamado aberto",
        message: `Recebemos sua solicitação com o número ${numero}. Nossa equipe entra em contato para a triagem.`,
      },
    });

    if (entrada.equipmentId) {
      await tx.equipmentEvent.create({
        data: {
          equipmentId: entrada.equipmentId,
          kind: "assistencia",
          title: `Chamado ${numero} aberto`,
          description: descricao,
        },
      });
    }

    if (chamado.customerId) {
      await tx.notification.create({
        data: {
          customerId: chamado.customerId,
          kind: "chamado_aberto",
          title: `Chamado ${numero} registrado`,
          body: "Acompanhe o andamento pela sua área.",
          href: `/minha-jb/assistencia/${chamado.id}`,
        },
      });
    }

    return chamado;
  });
}

/** Move o chamado de status registrando o evento correspondente. */
export async function mudarStatusChamado(
  chamadoId: string,
  status: ServiceRequestStatus,
  opcoes: {
    userId?: string | null;
    nota?: string;
    titulo?: string;
    visivelParaCliente?: boolean;
  } = {},
) {
  return prisma.$transaction((tx) => aplicarStatus(tx, chamadoId, status, opcoes));
}

export type EntradaVisita = {
  chamadoId: string;
  tecnicoId?: string | null;
  titulo?: string;
  inicio: Date;
  fim?: Date | null;
  observacoes?: string;
  userId?: string | null;
};

/**
 * Agenda a visita técnica e move o chamado.
 *
 * O resumo do endereço é copiado do chamado no momento do agendamento: a agenda
 * do técnico precisa continuar legível mesmo que o chamado seja editado depois.
 */
export async function agendarVisita(entrada: EntradaVisita) {
  return prisma.$transaction(async (tx) => {
    const chamado = await tx.serviceRequest.findUnique({
      where: { id: entrada.chamadoId },
    });
    if (!chamado) throw new ErroDeAssistencia("Chamado não encontrado.");
    if (chamado.status === "cancelado") {
      throw new ErroDeAssistencia("Este chamado foi cancelado e não pode receber visita.");
    }

    const partes = [
      [chamado.addressStreet, chamado.addressNumber].filter(Boolean).join(", "),
      chamado.addressDistrict,
      [chamado.addressCity, chamado.addressState].filter(Boolean).join("/"),
    ].filter(Boolean);

    const visita = await tx.serviceAppointment.create({
      data: {
        requestId: chamado.id,
        technicianId: entrada.tecnicoId ?? null,
        title: entrada.titulo?.trim() || `Visita técnica — chamado ${chamado.number}`,
        startsAt: entrada.inicio,
        endsAt: entrada.fim ?? null,
        status: "agendado",
        addressSummary: partes.join(" — "),
        notes: entrada.observacoes ?? "",
      },
    });

    await aplicarStatus(tx, chamado.id, "visita_agendada", {
      titulo: "Visita agendada",
      nota: `Visita marcada para ${formatarDataHora(entrada.inicio)}.`,
      userId: entrada.userId ?? null,
    });

    return visita;
  });
}

/**
 * Atribui o técnico responsável.
 *
 * O chamado em si não tem dono: quem tem dono é a visita e a ordem de serviço.
 * Atribuir, então, é carimbar o técnico em tudo que está aberto sob aquele
 * chamado. Se não há nada aberto, a atribuição não teria onde morar — por isso
 * o erro pede que se agende a visita ou se abra a OS antes.
 */
export async function atribuirTecnico(
  chamadoId: string,
  tecnicoId: string | null,
  opcoes: { userId?: string | null; nota?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const chamado = await tx.serviceRequest.findUnique({
      where: { id: chamadoId },
      select: { id: true, number: true },
    });
    if (!chamado) throw new ErroDeAssistencia("Chamado não encontrado.");

    const visitas = await tx.serviceAppointment.updateMany({
      where: { requestId: chamadoId, status: { in: ["agendado", "em_andamento"] } },
      data: { technicianId: tecnicoId },
    });

    const ordens = await tx.workOrder.updateMany({
      where: {
        requestId: chamadoId,
        status: { in: ["aberta", "em_execucao", "aguardando_peca", "aguardando_aprovacao"] },
      },
      data: { technicianId: tecnicoId },
    });

    if (visitas.count === 0 && ordens.count === 0) {
      throw new ErroDeAssistencia(
        "Agende uma visita ou abra uma OS antes de atribuir o técnico.",
      );
    }

    const tecnico = tecnicoId
      ? await tx.technician.findUnique({
          where: { id: tecnicoId },
          select: { user: { select: { name: true } } },
        })
      : null;

    await tx.serviceRequestEvent.create({
      data: {
        requestId: chamadoId,
        title: tecnico ? `Técnico responsável: ${tecnico.user.name}` : "Técnico removido",
        message: opcoes.nota ?? "",
        // decisão de escala é assunto interno
        visibleToCustomer: false,
        userId: opcoes.userId ?? null,
      },
    });

    return { visitas: visitas.count, ordens: ordens.count };
  });
}

/**
 * Formato mínimo que `passosDoChamado` precisa. É estrutural de propósito:
 * qualquer consulta que traga status, datas e eventos serve, sem obrigar a
 * página a usar um `include` específico.
 */
export type ChamadoParaLinha = {
  status: ServiceRequestStatus;
  createdAt: Date;
  closedAt: Date | null;
  events?: { status: ServiceRequestStatus | null; createdAt: Date }[];
};

/**
 * Linha do tempo do chamado para o cliente.
 *
 * Os catorze status viram seis etapas legíveis. A data de cada etapa sai do
 * primeiro evento que a alcançou — não do `updatedAt`, que mudaria a cada
 * anotação interna.
 */
export function passosDoChamado(chamado: ChamadoParaLinha): PassoLinha[] {
  const eventos = [...(chamado.events ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const quandoDaEtapa = new Map<ServiceRequestStatus, Date>();
  quandoDaEtapa.set("solicitacao_recebida", chamado.createdAt);
  for (const evento of eventos) {
    if (!evento.status) continue;
    const etapa = ETAPA_DO_STATUS[evento.status];
    if (!quandoDaEtapa.has(etapa)) quandoDaEtapa.set(etapa, evento.createdAt);
  }

  const cancelado = chamado.status === "cancelado";
  const etapaAtual = ETAPA_DO_STATUS[chamado.status];
  const indiceAtual = cancelado
    ? Math.max(
        0,
        ETAPAS_VISIVEIS.reduce(
          (maior, etapa, i) => (quandoDaEtapa.has(etapa) ? i : maior),
          0,
        ),
      )
    : ETAPAS_VISIVEIS.indexOf(etapaAtual);

  const passos: PassoLinha[] = ETAPAS_VISIVEIS.map((etapa, i) => {
    const quando = quandoDaEtapa.get(etapa);
    const estado: PassoLinha["estado"] = cancelado
      ? i <= indiceAtual
        ? "concluido"
        : "cancelado"
      : i < indiceAtual
        ? "concluido"
        : i === indiceAtual
          ? "atual"
          : "futuro";

    return {
      titulo: ROTULO_CHAMADO[etapa],
      descricao: DESCRICAO_ETAPA[etapa],
      quando: quando ? formatarDataHora(quando) : undefined,
      estado,
    };
  });

  if (cancelado) {
    passos.push({
      titulo: "Chamado cancelado",
      quando: chamado.closedAt ? formatarDataHora(chamado.closedAt) : undefined,
      estado: "cancelado",
    });
  }

  return passos;
}
