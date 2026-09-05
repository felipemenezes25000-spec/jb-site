import { UserRound } from "lucide-react";

import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Conversa do chamado.
 *
 * O que era uma pilha de caixas iguais vira um diálogo: dá para ver de relance
 * quem falou, quando, e o que mudou no atendimento. Quem escreveu está escrito
 * — "Você" ou "Equipe JB" —, nunca só sugerido pela cor.
 *
 * Só entra aqui o que o chamado já filtrou como visível ao cliente. A nota
 * interna (`visibleToCustomer: false`) não passa nem pela consulta.
 */

/**
 * Título gravado por `responderChamado` quando é o cliente que escreve.
 *
 * O schema de `ServiceRequestEvent` não tem coluna de autor — tem `userId`, que
 * é da equipe interna. Mensagem sem `userId` e com este título é a que o
 * próprio cliente enviou pela Área da Clínica; qualquer outro registro visível veio do
 * lado da JB. Na dúvida, o crédito vai para a JB: dizer "Você" para uma frase
 * que o cliente não escreveu seria mentir para ele sobre o próprio atendimento.
 */
export const TITULO_DA_CLINICA = "Mensagem do cliente";

export function ehFalaDaClinica(evento: {
  title: string;
  userId?: string | null;
}): boolean {
  return !evento.userId && evento.title === TITULO_DA_CLINICA;
}

export function Fala({
  autor,
  titulo,
  quando,
  corpo,
  complemento,
  etiqueta,
}: {
  autor: "voce" | "jb";
  titulo: string;
  quando: Date;
  corpo?: string;
  /** Uma linha de contexto abaixo do texto — tipo de problema, referência. */
  complemento?: string;
  etiqueta?: React.ReactNode;
}) {
  const daClinica = autor === "voce";

  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold tracking-wide",
          daClinica ? "bg-graf-100 text-graf-600" : "bg-graf-950 text-white",
        )}
      >
        {daClinica ? <UserRound className="size-4" /> : "JB"}
      </span>

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border p-4",
          daClinica ? "border-graf-200 bg-graf-50" : "border-graf-200 bg-white shadow-card",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-bold text-graf-950">
            {daClinica ? "Você" : "Equipe JB"}
          </p>
          {etiqueta}
          <p className="ml-auto text-xs text-graf-500">{formatarDataHora(quando)}</p>
        </div>

        <p className="mt-1 text-sm font-semibold text-graf-800">{titulo}</p>

        {corpo ? (
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graf-700">
            {corpo}
          </p>
        ) : null}

        {complemento ? (
          <p className="mt-2 text-xs text-graf-500">{complemento}</p>
        ) : null}
      </div>
    </li>
  );
}
