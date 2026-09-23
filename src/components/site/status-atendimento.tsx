"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import { situacaoDoAtendimento, type SituacaoDoAtendimento } from "@/lib/horario-atendimento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Status real do atendimento

   Calculado no navegador no fuso de São Paulo. Antes da hidratação — e sempre
   que o texto de horário não puder ser interpretado — aparece apenas a frase
   neutra recebida pela página. O ponto verde é estático de propósito: o texto
   já comunica estado real e não precisa manter uma animação rodando.

   "Em expediente" e não "atendendo agora": o horário diz quando a equipe
   trabalha, não que alguém vai responder neste minuto. Fora dele, o selo diz
   quando o expediente volta — sem prometer quando a resposta sai. Os textos
   são curtos para caber inteiros em 320px, sem reticências.
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
        "jb-status-atendimento inline-flex max-w-full items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-apoio font-semibold shadow-xs max-[359px]:gap-1.5 max-[359px]:px-3 max-[359px]:text-[0.75rem]",
        aberto ? "border-ok-500/30 text-graf-800" : "border-graf-200 text-graf-700",
        className,
      )}
    >
      {aberto ? (
        <span
          className="size-2 shrink-0 rounded-full bg-ok-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]"
          aria-hidden
        />
      ) : situacao ? (
        <Clock3 className="size-3.5 shrink-0 text-graf-500" aria-hidden />
      ) : (
        <span className="size-2 shrink-0 rounded-full bg-graf-300" aria-hidden />
      )}
      {/* Sem `aria-live`: o texto troca uma vez, logo depois da hidratação, e
          anunciar isso em cada página seria ruído para quem usa leitor de tela. */}
      <span className="truncate">{situacao?.texto ?? neutro}</span>
    </p>
  );
}
