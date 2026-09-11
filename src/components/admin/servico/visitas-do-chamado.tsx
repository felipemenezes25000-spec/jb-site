import { CalendarOff } from "lucide-react";

import {
  AcoesDoAgendamento,
  type TecnicoDaEscala,
} from "@/components/admin/servico/acoes-agendamento";
import { EtiquetaAgendamento } from "@/components/admin/servico/etiquetas";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";

/* ============================================================================
   Bloco "Visitas" da ficha do chamado

   Mesma lista de sempre, agora com os dois gestos que faltavam ao lado de cada
   linha: remarcar (que MOVE o agendamento existente) e mudar a situação
   (a caminho, concluída, cancelada).

   O componente é de servidor: nenhum estado mora aqui. Só os dois botões de
   cada linha são de cliente, e eles montam o formulário apenas quando o painel
   abre — uma ficha com oito visitas não carrega dezesseis formulários.
   ============================================================================ */

export type VisitaDoChamado = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  addressSummary: string;
  notes: string;
  technician: { id: string; user: { name: string } } | null;
};

export function VisitasDoChamado({
  visitas,
  tecnicos,
  editar,
}: {
  visitas: VisitaDoChamado[];
  tecnicos: TecnicoDaEscala[];
  /** Falso para quem abre o chamado só para consulta. */
  editar: boolean;
}) {
  return (
    <Cartao>
      <CabecalhoCartao titulo="Visitas" descricao="Agendamentos deste chamado" />
      <div className="px-5 py-5">
        {visitas.length === 0 ? (
          <Vazio
            icone={CalendarOff}
            titulo="Nenhuma visita agendada"
            descricao="Use “Agendar visita” no topo da ficha. Depois de marcada, ela é remarcada aqui — sem virar duas."
            className="border-graf-200 bg-transparent py-8"
          />
        ) : (
          <ul className="space-y-3">
            {visitas.map((visita) => (
              <li key={visita.id} className="rounded-lg border border-graf-200 p-3">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-graf-900">
                    {formatarDataHora(visita.startsAt)}
                    {visita.endsAt ? ` — ${formatarDataHora(visita.endsAt)}` : ""}
                  </span>
                  <EtiquetaAgendamento status={visita.status} />
                </p>
                <p className="mt-1 text-sm text-graf-600">{visita.title}</p>
                <p className="mt-1 text-apoio text-graf-500">
                  {visita.technician?.user.name ?? "Sem técnico definido"}
                  {visita.addressSummary ? ` · ${visita.addressSummary}` : ""}
                </p>
                {visita.notes ? (
                  <p className="mt-1 whitespace-pre-line text-apoio text-graf-500">
                    {visita.notes}
                  </p>
                ) : null}

                {editar ? (
                  <div className="mt-3 border-t border-graf-200 pt-3">
                    <AcoesDoAgendamento
                      agendamentoId={visita.id}
                      quandoAtual={visita.startsAt.toISOString()}
                      status={visita.status}
                      titulo={`a visita de ${formatarDataHora(visita.startsAt)}`}
                      tecnicoAtual={visita.technician?.id ?? null}
                      tecnicos={tecnicos}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Cartao>
  );
}
