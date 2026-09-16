import type {
  ContractStatus,
  EquipmentStatus,
  QuoteStatus,
  ServiceRequestStatus,
  Urgency,
  VisitStatus,
  WorkOrderStatus,
} from "@prisma/client";

import { Etiqueta, type Tom } from "@/components/ui/data";
import { ROTULO_CHAMADO, ROTULO_URGENCIA, type StatusAgendamento } from "@/lib/assistencia";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import { ROTULO_CONTRATO, ROTULO_VISITA } from "@/lib/manutencao";
import { ROTULO_ORCAMENTO } from "@/lib/orcamento";
import { ROTULO_OS } from "@/lib/os";

/* ============================================================================
   Etiquetas de estado do backoffice técnico

   Um lugar só decide qual tom cada status recebe. Sem isto, a mesma "aguardando
   peça" acabaria âmbar numa tela e azul na outra, e quem varre a lista com o
   olho aprenderia a cor errada.

   Toda etiqueta carrega o texto do status: cor nunca é o único indicador.
   ============================================================================ */

const TOM_CHAMADO: Record<ServiceRequestStatus, Tom> = {
  solicitacao_recebida: "aguardando",
  triagem: "aguardando",
  aguardando_cliente: "aguardando",
  visita_agendada: "andamento",
  tecnico_a_caminho: "andamento",
  em_diagnostico: "andamento",
  orcamento_enviado: "aguardando",
  aguardando_aprovacao: "aguardando",
  aprovado: "andamento",
  aguardando_peca: "alerta",
  em_manutencao: "andamento",
  testes: "andamento",
  concluido: "ok",
  cancelado: "neutro",
};

export function EtiquetaChamado({ status }: { status: ServiceRequestStatus }) {
  return (
    <Etiqueta tom={TOM_CHAMADO[status]} ponto>
      {ROTULO_CHAMADO[status]}
    </Etiqueta>
  );
}

const TOM_URGENCIA: Record<Urgency, Tom> = {
  parado: "alerta",
  alta: "aguardando",
  normal: "andamento",
  baixa: "neutro",
};

export function EtiquetaUrgencia({ urgencia }: { urgencia: Urgency }) {
  return <Etiqueta tom={TOM_URGENCIA[urgencia]}>{ROTULO_URGENCIA[urgencia]}</Etiqueta>;
}

const TOM_OS: Record<WorkOrderStatus, Tom> = {
  aberta: "aguardando",
  em_execucao: "andamento",
  aguardando_peca: "alerta",
  aguardando_aprovacao: "aguardando",
  concluida: "ok",
  cancelada: "neutro",
};

export function EtiquetaOS({ status }: { status: WorkOrderStatus }) {
  return (
    <Etiqueta tom={TOM_OS[status]} ponto>
      {ROTULO_OS[status]}
    </Etiqueta>
  );
}

const TOM_VISITA: Record<VisitStatus, Tom> = {
  prevista: "aguardando",
  agendada: "andamento",
  concluida: "ok",
  cancelada: "neutro",
};

export function EtiquetaVisita({ status }: { status: VisitStatus }) {
  return <Etiqueta tom={TOM_VISITA[status]}>{ROTULO_VISITA[status]}</Etiqueta>;
}

const TOM_CONTRATO: Record<ContractStatus, Tom> = {
  rascunho: "neutro",
  ativo: "ok",
  suspenso: "aguardando",
  encerrado: "neutro",
};

export function EtiquetaContrato({ status }: { status: ContractStatus }) {
  return <Etiqueta tom={TOM_CONTRATO[status]}>{ROTULO_CONTRATO[status]}</Etiqueta>;
}

const TOM_EQUIPAMENTO: Record<EquipmentStatus, Tom> = {
  operacional: "ok",
  em_manutencao: "andamento",
  aguardando_peca: "alerta",
  inoperante: "alerta",
  desativado: "neutro",
};

export function EtiquetaEquipamento({ status }: { status: EquipmentStatus }) {
  return (
    <Etiqueta tom={TOM_EQUIPAMENTO[status]} ponto>
      {ROTULO_EQUIPAMENTO[status]}
    </Etiqueta>
  );
}

const TOM_ORCAMENTO: Record<QuoteStatus, Tom> = {
  rascunho: "neutro",
  enviado: "andamento",
  em_duvida: "aguardando",
  aprovado: "ok",
  recusado: "alerta",
  expirado: "neutro",
  convertido: "ok",
};

export function EtiquetaOrcamento({ status }: { status: QuoteStatus }) {
  return <Etiqueta tom={TOM_ORCAMENTO[status]}>{ROTULO_ORCAMENTO[status]}</Etiqueta>;
}

const ROTULO_AGENDAMENTO: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const TOM_AGENDAMENTO: Record<StatusAgendamento, Tom> = {
  agendado: "andamento",
  em_andamento: "aguardando",
  concluido: "ok",
  cancelado: "neutro",
};

/** O status do agendamento é texto livre no banco; o que não conhecemos vira neutro. */
export function EtiquetaAgendamento({ status }: { status: string }) {
  const conhecido = (["agendado", "em_andamento", "concluido", "cancelado"] as const).find(
    (valor) => valor === status,
  );
  if (!conhecido) return <Etiqueta tom="neutro">{status}</Etiqueta>;
  return <Etiqueta tom={TOM_AGENDAMENTO[conhecido]}>{ROTULO_AGENDAMENTO[conhecido]}</Etiqueta>;
}

const ROTULO_INSTALACAO: Record<string, string> = {
  pendente: "Pendente",
  agendada: "Agendada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TOM_INSTALACAO: Record<string, Tom> = {
  pendente: "aguardando",
  agendada: "andamento",
  concluida: "ok",
  cancelada: "neutro",
};

export function EtiquetaInstalacao({ status }: { status: string }) {
  return (
    <Etiqueta tom={TOM_INSTALACAO[status] ?? "neutro"}>
      {ROTULO_INSTALACAO[status] ?? status}
    </Etiqueta>
  );
}
