"use client";

import { useActionState, useEffect } from "react";
import { Play, Send } from "lucide-react";
import { toast } from "sonner";

import {
  processarFilaAgora,
  reenviarUma,
  type EstadoMensagens,
} from "@/app/acoes/admin-mensagens";
import { Botao } from "@/components/ui/button";

/* ============================================================================
   Comandos da fila de mensagens

   Dois botões, cada um num `<form>` de verdade com a server action: funcionam
   sem JavaScript, e com JavaScript a resposta vira aviso do sonner em vez de
   empurrar a lista para baixo. A autorização não está aqui — está em
   `exigirEdicao` dentro da ação, como manda a casa.
   ============================================================================ */

function useAvisoDaAcao(estado: EstadoMensagens) {
  useEffect(() => {
    if (estado.erro) toast.error(estado.erro);
    else if (estado.ok && estado.mensagem) toast.success(estado.mensagem);
  }, [estado]);
}

export function BotaoProcessarFila({ limite }: { limite: number }) {
  const [estado, enviar, processando] = useActionState<EstadoMensagens, FormData>(
    processarFilaAgora,
    {},
  );
  useAvisoDaAcao(estado);

  return (
    <form action={enviar}>
      <input type="hidden" name="limite" value={String(limite)} />
      <Botao type="submit" variante="primario" tamanho="md" carregando={processando}>
        <Play className="size-4" aria-hidden />
        Processar a fila agora
      </Botao>
    </form>
  );
}

export function BotaoReenviar({ id, destinatario }: { id: string; destinatario: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoMensagens, FormData>(reenviarUma, {});
  useAvisoDaAcao(estado);

  return (
    <form action={enviar} className="inline-block">
      <input type="hidden" name="id" value={id} />
      <Botao
        type="submit"
        variante="secundario"
        tamanho="sm"
        carregando={enviando}
        aria-label={`Reenviar a mensagem para ${destinatario}`}
      >
        <Send className="size-3.5" aria-hidden />
        Reenviar
      </Botao>
    </form>
  );
}
