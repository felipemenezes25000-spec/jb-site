"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import { situacaoDoAtendimento, type SituacaoDoAtendimento } from "@/lib/horario-atendimento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Status real do atendimento

   Calculado no navegador no fuso de São Paulo. Antes da hidratação — e sempre
   que o texto de horário não puder ser interpretado — aparece apenas a frase
   neutra recebida pela página. Nada de inventar "aberto" a partir de cache.
   ============================================================================ */

export function StatusAtendimento({
  horario,
  neutro,
  className,
}: {
  horario: string;
  neutro: string;
  className?: string;
}) {
  const [situacao, setSituacao] = useState<SituacaoDoAtendimento | null>(null);

  useEffect(() => {
    const atualizar = () => setSituacao(situacaoDoAtendimento(horario, new Date()));
    const quadro = requestAnimationFrame(atualizar);
    const relogio = window.setInterval(atualizar, 60_000);
    return () => {
      cancelAnimationFrame(quadro);
      window.clearInterval(relogio);
    };
  }, [horario]);

  const aberto = situacao?.aberto === true;
  const estado = situacao ? (aberto ? "aberto" : "fechado") : "neutro";

  return (
    <p
      data-status-atendimento={estado}
      className={cn(
        "jb-status-atendimento inline-flex max-w-full items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-apoio font-semibold shadow-xs",
        aberto
          ? "border-ok-500/30 text-graf-800"
          : situacao
            ? "border-graf-200 text-graf-700"
            : "border-graf-200 text-graf-700",
        className,
      )}
    >
      {aberto ? (
        <span className="jb-status-ponto relative flex size-2 shrink-0" aria-hidden>
          <span className="jb-status-pulso absolute inline-flex size-full rounded-full bg-ok-500 opacity-55 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-ok-500" />
        </span>
      ) : situacao ? (
        <Clock3 className="size-3.5 shrink-0 text-graf-500" aria-hidden />
      ) : (
        <span className="size-2 shrink-0 rounded-full bg-graf-300" aria-hidden />
      )}
      <span className="truncate" aria-live="polite">
        {situacao?.texto ?? neutro}
      </span>
    </p>
  );
}
