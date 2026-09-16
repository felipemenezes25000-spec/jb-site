"use client";

import { CalendarClock, CalendarX2 } from "lucide-react";

import {
  mudarStatusDoAgendamento,
  remarcarVisitaDoChamado,
} from "@/app/acoes/admin-servico";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import type { Tamanho } from "@/components/ui/button";

/* ============================================================================
   Remarcar e cancelar a visita de um chamado

   Remarcar MOVE o agendamento que existe. Antes disto, a única saída era
   agendar de novo: nascia uma segunda visita e a primeira ficava "agendada"
   para sempre, entulhando a agenda do técnico com um compromisso que ninguém
   mais esperava.

   O campo escondido `quandoAtual` leva a data que esta tela está mostrando. É
   ela que o servidor usa como guarda: se outra pessoa remarcou no meio-tempo,
   o UPDATE não acha a linha e a mudança é recusada com a explicação, em vez de
   passar por cima do que já foi combinado com o cliente.
   ============================================================================ */

export type TecnicoDaEscala = { id: string; nome: string };

const FUSO = "America/Sao_Paulo";

/**
 * `Date` → "AAAA-MM-DDTHH:MM" no fuso de São Paulo, que é o formato que o
 * `<input type="datetime-local">` entende. O locale sueco é usado porque
 * produz exatamente "AAAA-MM-DD HH:MM:SS" — não é preferência, é o formato.
 */
function paraCampoDataHora(data: Date) {
  const texto = new Intl.DateTimeFormat("sv-SE", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
  return texto.replace(" ", "T").slice(0, 16);
}

export function AcoesDoAgendamento({
  agendamentoId,
  quandoAtual,
  status,
  titulo,
  tecnicoAtual,
  tecnicos,
  tamanho = "sm",
}: {
  agendamentoId: string;
  /** Data que a tela está mostrando, em ISO. Vai como guarda de concorrência. */
  quandoAtual: string;
  status: string;
  /** Aparece no título do diálogo, para a pessoa saber que visita está mexendo. */
  titulo: string;
  tecnicoAtual: string | null;
  tecnicos: TecnicoDaEscala[];
  tamanho?: Tamanho;
}) {
  if (status === "concluido" || status === "cancelado") {
    return (
      <span className="text-[0.8125rem] text-graf-500">
        {status === "concluido" ? "Visita concluída" : "Visita cancelada"}
      </span>
    );
  }

  const quando = new Date(quandoAtual);
  const valorInicial = Number.isNaN(quando.getTime()) ? "" : paraCampoDataHora(quando);

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <PainelAcao
        rotulo="Remarcar"
        icone={<CalendarClock className="size-4" aria-hidden />}
        variante="secundario"
        tamanho={tamanho}
        titulo={`Remarcar ${titulo}`}
        descricao="A visita muda de dia — não é criada outra. O cliente recebe o aviso da nova data."
        acao={remarcarVisitaDoChamado}
        rotuloConfirmar="Remarcar visita"
      >
        <Oculto nome="agendamentoId" valor={agendamentoId} />
        <Oculto nome="quandoAtual" valor={quandoAtual} />
        <CampoAcao
          rotulo="Nova data e hora"
          name="inicio"
          type="datetime-local"
          required
          defaultValue={valorInicial}
          ajuda="Horário de Brasília."
        />
        <CampoAcao
          rotulo="Término previsto"
          name="fim"
          type="datetime-local"
          ajuda="Opcional. Ajuda a agenda a não marcar duas visitas em cima."
        />
        {/* Sem escala carregada o campo não aparece: um select vazio enviaria
            "" e apagaria o técnico que já estava na visita. Campo ausente é
            campo que o servidor não toca. */}
        {tecnicos.length > 0 ? (
          <SelecaoAcao rotulo="Técnico" name="tecnicoId" defaultValue={tecnicoAtual ?? ""}>
            <option value="">Definir depois</option>
            {tecnicos.map((tecnico) => (
              <option key={tecnico.id} value={tecnico.id}>
                {tecnico.nome}
              </option>
            ))}
          </SelecaoAcao>
        ) : null}
        <AreaAcao
          rotulo="Motivo"
          name="motivo"
          rows={2}
          ajuda="Entra na linha do tempo que o cliente lê."
          placeholder="Ex.: a clínica pediu para adiar; peça só chega na quinta."
        />
      </PainelAcao>

      <PainelAcao
        rotulo="Situação"
        icone={<CalendarX2 className="size-4" aria-hidden />}
        variante="secundario"
        tamanho={tamanho}
        titulo={`Situação de ${titulo}`}
        descricao="Cancelar avisa o cliente e devolve o chamado para a triagem quando não sobra visita marcada."
        acao={mudarStatusDoAgendamento}
        rotuloConfirmar="Gravar"
      >
        <Oculto nome="agendamentoId" valor={agendamentoId} />
        <SelecaoAcao rotulo="Situação da visita" name="status" defaultValue={status} required>
          <option value="agendado">Agendada</option>
          <option value="em_andamento">Técnico a caminho</option>
          <option value="concluido">Concluída</option>
          <option value="cancelado">Cancelada</option>
        </SelecaoAcao>
        <AreaAcao
          rotulo="Motivo ou observação"
          name="motivo"
          rows={2}
          ajuda="No cancelamento e na conclusão, o texto vai junto para o cliente."
        />
      </PainelAcao>
    </span>
  );
}
