import { BadgeCheck, Clock3, MapPin, Phone } from "lucide-react";

import { telHref } from "@/lib/format";

/* ============================================================================
   Faixa operacional do topo

   Informação de operação, parada: o que a JB faz, onde atende, quando atende
   e o telefone fixo. Até 23/09/2026 era uma marquise infinita com frases de
   efeito ("chame agora"), que se mexia sem botão de pausa acima da dobra —
   movimento automático de mais de cinco segundos sem controle é exatamente o
   que a WCAG 2.2.2 pede para evitar, e frase de urgência não é informação.

   No celular sobra uma linha curta: a primeira dobra já tem status, promessa e
   os dois WhatsApps, e a faixa não pode roubar altura deles.
   ============================================================================ */

export function FaixaTopo({
  cidade,
  horario,
  telefone,
}: {
  cidade: string;
  horario: string;
  telefone: string;
}) {
  const ligar = telHref(telefone);

  return (
    <div className="jb-ticker relative z-50 bg-jb-600 text-white">
      <p className="flex h-8 items-center justify-center gap-2 px-3 text-[0.7rem] font-extrabold uppercase tracking-[0.08em] sm:hidden">
        <BadgeCheck className="size-3.5 shrink-0 text-white/90" aria-hidden />
        <span className="truncate">Assistência técnica · todas as marcas</span>
      </p>

      <div className="container-jb hidden h-9 items-center justify-between gap-6 text-[0.8125rem] font-bold tracking-tight sm:flex">
        <p className="flex min-w-0 items-center gap-5">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <BadgeCheck className="size-3.5 shrink-0 text-white/85" aria-hidden />
            Assistência técnica odontológica · todas as marcas
          </span>
          <span className="hidden items-center gap-2 whitespace-nowrap lg:flex">
            <MapPin className="size-3.5 shrink-0 text-white/85" aria-hidden />
            {cidade} e região
          </span>
        </p>
        <p className="flex shrink-0 items-center gap-5">
          <span className="hidden items-center gap-2 whitespace-nowrap lg:flex">
            <Clock3 className="size-3.5 shrink-0 text-white/85" aria-hidden />
            {horario}
          </span>
          {ligar ? (
            <a
              href={ligar}
              className="flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md px-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Phone className="size-3.5 shrink-0 text-white/85" aria-hidden />
              <span className="sr-only">Telefone: </span>
              {telefone}
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}
