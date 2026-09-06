"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";

import { responderChamadoPublico, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area } from "@/components/ui/form";

/**
 * Resposta do cliente dentro do chamado.
 *
 * A mensagem entra na mesma linha do tempo que a equipe usa — não é um canal
 * paralelo. Quando o chamado estava parado esperando o cliente, responder
 * devolve o atendimento para a triagem; quem faz isso é a Server Action, que
 * também confere de novo se esta pessoa pode mesmo escrever aqui.
 *
 * Erro de campo fica colado ao campo; recusa geral (limite de envios, chamado
 * encerrado no meio do caminho) vira aviso, porque não é o texto que está
 * errado.
 */
export function ResponderChamado({ numero }: { numero: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAssistencia, FormData>(
    responderChamadoPublico,
    {},
  );
  const refFormulario = useRef<HTMLFormElement>(null);

  // Mensagem aceita: limpa o campo para não reenviar o mesmo texto sem querer.
  useEffect(() => {
    if (estado.ok) refFormulario.current?.reset();
  }, [estado]);

  return (
    <form action={acao} ref={refFormulario}>
      <input type="hidden" name="numero" value={numero} />

      <Area
        rotulo="Escrever para a equipe técnica"
        name="mensagem"
        required
        rows={4}
        maxLength={2000}
        placeholder="Ex.: aprovo o orçamento enviado. A clínica funciona das 8h às 17h."
        ajuda="A equipe recebe a mensagem por e-mail e responde aqui mesmo."
        erro={estado.campo === "mensagem" ? estado.erro : undefined}
      />

      <div aria-live="polite" className="mt-4 empty:mt-0">
        {estado.ok ? <Aviso tom="sucesso">{estado.ok}</Aviso> : null}
        {estado.erro && estado.campo !== "mensagem" ? (
          <Aviso tom="erro">{estado.erro}</Aviso>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Botao type="submit" carregando={pendente}>
          {pendente ? null : <Send className="size-4" aria-hidden />}
          {pendente ? "Enviando…" : "Enviar mensagem"}
        </Botao>
      </div>
    </form>
  );
}
