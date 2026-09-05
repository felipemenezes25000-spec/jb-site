"use client";

import { CalendarCheck, CalendarPlus } from "lucide-react";

import {
  agendarVisitaPreventiva,
  concluirVisitaPreventiva,
  mudarStatusDaVisita,
} from "@/app/acoes/admin-servico";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import type { Tamanho } from "@/components/ui/button";
import { Marcador } from "@/components/ui/form";

/* ============================================================================
   Ações rápidas de uma visita preventiva

   Agendar, concluir e cancelar sem sair da lista. É o gesto que a rotina pede:
   o técnico volta do dia e fecha cinco visitas seguidas — obrigar a abrir e
   voltar cinco vezes só adiciona cliques.

   Os painéis só montam o conteúdo quando abrem, então uma lista de 25 linhas
   não carrega 75 formulários.
   ============================================================================ */

export type TecnicoDaLista = { id: string; nome: string };

export function AcoesDaVisita({
  visitaId,
  equipamento,
  status,
  tecnicoAtual,
  tecnicos,
  tamanho = "sm",
}: {
  visitaId: string;
  equipamento: string;
  status: string;
  tecnicoAtual: string | null;
  tecnicos: TecnicoDaLista[];
  /** "sm" na listagem, "md" no cabeçalho da ficha. */
  tamanho?: Tamanho;
}) {
  if (status === "concluida" || status === "cancelada") {
    return <span className="text-xs text-graf-500">Encerrada</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <PainelAcao
        rotulo={status === "agendada" ? "Reagendar" : "Agendar"}
        icone={<CalendarPlus className="size-4" aria-hidden />}
        variante="secundario"
        tamanho={tamanho}
        titulo={`Agendar a preventiva de ${equipamento}`}
        descricao="O cliente recebe o aviso da data na área Minha JB."
        acao={agendarVisitaPreventiva}
        rotuloConfirmar="Gravar agendamento"
      >
        <Oculto nome="visitaId" valor={visitaId} />
        <CampoAcao
          rotulo="Data e hora"
          name="quando"
          type="datetime-local"
          required
          ajuda="Horário de Brasília."
        />
        <SelecaoAcao rotulo="Técnico" name="tecnicoId" defaultValue={tecnicoAtual ?? ""}>
          <option value="">Definir depois</option>
          {tecnicos.map((tecnico) => (
            <option key={tecnico.id} value={tecnico.id}>
              {tecnico.nome}
            </option>
          ))}
        </SelecaoAcao>
        <AreaAcao rotulo="Observações internas" name="notas" rows={3} />
      </PainelAcao>

      <PainelAcao
        rotulo="Concluir"
        icone={<CalendarCheck className="size-4" aria-hidden />}
        variante="secundario"
        tamanho={tamanho}
        titulo={`Concluir a preventiva de ${equipamento}`}
        descricao="Atualiza o prontuário do equipamento e avisa o cliente."
        acao={concluirVisitaPreventiva}
        rotuloConfirmar="Concluir"
      >
        <Oculto nome="visitaId" valor={visitaId} />
        <SelecaoAcao
          rotulo="Técnico que atendeu"
          name="tecnicoId"
          defaultValue={tecnicoAtual ?? ""}
        >
          <option value="">Sem técnico definido</option>
          {tecnicos.map((tecnico) => (
            <option key={tecnico.id} value={tecnico.id}>
              {tecnico.nome}
            </option>
          ))}
        </SelecaoAcao>
        <AreaAcao
          rotulo="O que foi feito"
          name="notas"
          rows={3}
          ajuda="Entra no prontuário do equipamento."
        />
        <Marcador
          name="abrirOS"
          rotulo="Abrir ordem de serviço para uma pendência encontrada"
          ajuda="Marque quando algo precisa de reparo além da preventiva."
        />
        <AreaAcao
          rotulo="Pendência encontrada"
          name="defeitoEncontrado"
          rows={2}
          ajuda="Obrigatório se você marcou a abertura de OS."
        />
      </PainelAcao>

      <PainelAcao
        rotulo="Cancelar"
        variante="perigo"
        tamanho={tamanho}
        titulo={`Cancelar a preventiva de ${equipamento}`}
        descricao="Cancelar tira da agenda; voltar para prevista limpa data e técnico."
        acao={mudarStatusDaVisita}
        rotuloConfirmar="Gravar"
        varianteConfirmar="perigo"
      >
        <Oculto nome="visitaId" valor={visitaId} />
        <SelecaoAcao rotulo="Situação" name="status" defaultValue="cancelada" required>
          <option value="cancelada">Cancelar visita</option>
          <option value="prevista">Voltar para prevista</option>
        </SelecaoAcao>
        <AreaAcao rotulo="Motivo" name="notas" rows={3} />
      </PainelAcao>
    </span>
  );
}
