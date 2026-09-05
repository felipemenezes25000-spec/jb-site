"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";

import { responderChamado, type EstadoMinhaJb } from "@/app/acoes/minha-jb";
import { Anexos } from "@/components/conta/mj-anexos";
import { Botao } from "@/components/ui/button";
import { Area } from "@/components/ui/form";

/**
 * Resposta do cliente dentro do chamado.
 *
 * O campo é limpo só quando o envio dá certo — se der erro, o texto continua
 * lá para a pessoa tentar de novo sem reescrever tudo. O aviso de sucesso vai
 * numa região viva, porque a mensagem enviada aparece no fim da conversa e
 * quem usa leitor de tela não veria o resultado de outro jeito.
 */
export function ResponderChamado({
  chamadoId,
  aguardandoCliente,
}: {
  chamadoId: string;
  /** O chamado está parado esperando você — muda o texto de apoio. */
  aguardandoCliente: boolean;
}) {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(
    responderChamado,
    {},
  );
  const refFormulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) refFormulario.current?.reset();
  }, [estado.ok]);

  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <form ref={refFormulario} action={acao} noValidate className="space-y-4">
      <input type="hidden" name="chamadoId" value={chamadoId} />

      <p aria-live="polite" className="sr-only">
        {estado.ok ?? (estado.campo ? estado.erro : "")}
      </p>

      {aguardandoCliente ? (
        <p className="rounded-lg bg-warn-50 px-4 py-3 text-sm leading-relaxed text-warn-700 ring-1 ring-inset ring-warn-500/25">
          Este chamado está aguardando a sua resposta. Assim que você escrever, ele volta
          para a fila da equipe técnica.
        </p>
      ) : null}

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      {estado.ok ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-ok-500/25 bg-ok-50 px-4 py-3 text-sm leading-relaxed text-ok-700"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.ok}</span>
        </p>
      ) : null}

      <Area
        rotulo="Sua mensagem"
        name="mensagem"
        required
        rows={4}
        maxLength={4000}
        placeholder="Responda à equipe, mande uma informação nova ou pergunte o que precisar."
        erro={estado.campo === "mensagem" ? estado.erro : undefined}
      />

      <Anexos nome="midias" rotulo="Anexar fotos (opcional)" pasta="chamados" maximo={4} />

      <Botao type="submit" carregando={enviando}>
        <Send className="size-4" aria-hidden />
        {enviando ? "Enviando…" : "Enviar mensagem"}
      </Botao>
    </form>
  );
}
