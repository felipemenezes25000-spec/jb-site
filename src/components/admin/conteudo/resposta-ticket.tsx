"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { ROTULO_TICKET } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Resposta de um ticket de suporte

   O mesmo formulário escreve duas coisas diferentes: resposta ao cliente (ele
   recebe aviso na área logada) e nota interna (fica só na equipe). A diferença
   é uma caixa marcada, e a tela mostra por escrito o que vai acontecer antes de
   enviar — para ninguém mandar por engano um comentário interno ao cliente.
   ============================================================================ */

const VAZIO: EstadoAcao = {};

const OPCOES_STATUS = ["respondido", "aguardando_cliente", "aberto", "fechado"] as const;

export function RespostaDoTicket({
  acao,
  id,
  temCliente,
}: {
  acao: AcaoDeFormulario;
  id: string;
  /** Sem cliente cadastrado não há caixa de avisos para notificar. */
  temCliente: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const [visivel, setVisivel] = useState(true);

  return (
    <form action={executar}>
      <Bloco
        titulo="Responder"
        descricao="A resposta entra na conversa do ticket, na ordem em que foi escrita."
      >
        <input type="hidden" name="id" value={id} />

        <Area
          rotulo="Mensagem"
          name="body"
          required
          rows={6}
          maxLength={6000}
          erro={erroDoCampo(estado, "body")}
          ajuda="Texto simples. Escreva como você falaria com o cliente ao telefone."
        />

        <Marcador
          rotulo="Enviar para o cliente"
          name="visivel"
          checked={visivel}
          onChange={(evento) => setVisivel(evento.target.checked)}
          ajuda="Desmarcado, o texto vira nota interna e o cliente nunca vê."
        />

        {visivel ? (
          temCliente ? (
            <Aviso tom="info">
              O cliente vai ver esta mensagem no ticket e receber um aviso na área logada.
            </Aviso>
          ) : (
            <Aviso tom="atencao" titulo="Ticket sem conta de cliente">
              A mensagem fica registrada no ticket, mas não há caixa de avisos para notificar —
              este contato não tem cadastro no site. Retorne por telefone ou e-mail.
            </Aviso>
          )
        ) : (
          <Aviso tom="atencao">Esta mensagem ficará visível apenas para a equipe.</Aviso>
        )}

        <Selecao
          rotulo="Situação depois de enviar"
          name="status"
          defaultValue="respondido"
          erro={erroDoCampo(estado, "status")}
        >
          {OPCOES_STATUS.map((chave) => (
            <option key={chave} value={chave}>
              {ROTULO_TICKET[chave]}
            </option>
          ))}
        </Selecao>

        <MensagemDoFormulario estado={estado} tituloDoErro="Não foi possível enviar" />

        <div>
          <Botao type="submit" carregando={pendente}>
            <Send className="size-4" aria-hidden />
            {visivel ? "Enviar resposta" : "Salvar nota interna"}
          </Botao>
        </div>
      </Bloco>
    </form>
  );
}
