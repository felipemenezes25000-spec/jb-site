import Image from "next/image";
import { BadgeCheck, FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Foto da abertura

   Gente trabalhando em equipamento é o que segura o olho de quem chega de
   anúncio: a foto mostra, antes de qualquer texto, que aqui se conserta
   autoclave. Ela respira (zoom lento) e dois selos boiam por cima, cada um no
   seu ritmo.

   A imagem é ilustrativa, do protótipo aprovado, e o texto alternativo diz o
   que ela mostra, sem afirmar que é a equipe da JB. Quando houver foto real
   da bancada, é só trocar `public/site/bancada.webp`.

   É a maior imagem acima da dobra, então carrega com prioridade. No celular
   ela fica com mais presença visual; no computador vira uma faixa editorial
   abaixo da conversão, sem competir com o diagnóstico em 3 toques.
   ============================================================================ */

export function FotoAbertura({ className }: { className?: string }) {
  return (
    <figure className={cn("jb-foto-premium relative", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.65rem] bg-graf-100 shadow-raised ring-1 ring-graf-950/5 sm:aspect-[16/10] lg:aspect-[16/9]">
        <Image
          src="/site/bancada.webp"
          alt="Técnico consertando uma autoclave odontológica na bancada"
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 92vw"
          className="jb-foto-viva object-cover object-[60%_40%]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.04),transparent_36%,transparent_64%,rgb(224_20_27/0.08))]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-graf-950/50 via-graf-950/10 to-transparent"
        />
        <span aria-hidden className="jb-scanline pointer-events-none absolute inset-y-0 w-28" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
          <div className="rounded-xl border border-white/20 bg-graf-950/70 px-3 py-2 text-white shadow-pop backdrop-blur-md">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-white/75">Assistência técnica odontológica</p>
            <p className="mt-0.5 text-sm font-extrabold text-white">Diagnóstico com contexto antes da visita</p>
          </div>
        </div>
      </div>

      <p className="jb-boia absolute -left-2 top-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-left-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-jb-500 text-white shadow-[0_6px_18px_-8px_rgb(224_20_27/0.9)]">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        Todas as marcas
      </p>
      <p className="jb-boia-2 absolute -right-2 top-16 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-right-4 sm:top-auto sm:bottom-5 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ok-500 text-white shadow-[0_6px_18px_-8px_rgb(16_185_129/0.9)]">
          <FileCheck2 className="size-4" aria-hidden />
        </span>
        Orçamento antes da troca
      </p>

      <figcaption className="sr-only">
        Assistência técnica de equipamentos odontológicos com orçamento informado antes da troca de peças.
      </figcaption>
    </figure>
  );
}
