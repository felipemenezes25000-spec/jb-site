"use client";

import { useEffect, useState } from "react";

import { situacaoDoAtendimento, type SituacaoDoAtendimento } from "@/lib/horario-atendimento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Selo "Atendendo agora"

   Calculado no navegador, na hora em que a pessoa olha. No servidor a página
   é cacheada por horas, e um "aberto" congelado no cache mentiria metade do
   dia. Até o cálculo rodar (e sempre que o horário configurado não puder ser
   lido), o selo mostra o texto neutro que recebeu.

   O ponto pulsante é estado real, não enfeite: só aparece quando a equipe
   está de fato no horário.
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

  return (
    <p
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-apoio font-semibold shadow-xs",
        aberto ? "border-ok-500/30 text-graf-800" : "border-graf-200 text-graf-700",
        className,
      )}
    >
      {aberto ? (
        <span className="relative flex size-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex size-full rounded-full bg-ok-500 opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-ok-500" />
        </span>
      ) : null}
      <span className="truncate" aria-live="polite">
        {situacao?.texto ?? neutro}
      </span>
    </p>
  );
}
