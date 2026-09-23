import Image from "next/image";
import { BadgeCheck, FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Foto editorial da assistência

   Depois da reorganização mobile, a triagem vem antes desta imagem. Por isso
   ela não é mais pré-carregada: no celular isso evita competir com logo,
   fontes e interface que aparecem primeiro. O Next continua otimizando e
   carregando a foto quando ela se aproxima da viewport.

   A foto fica parada. Zoom lento, reflexo que atravessa e selos boiando
   rodavam em laço infinito — enfeite que custa compositor e atenção sem
   acrescentar informação.
   ============================================================================ */

export function FotoAbertura({ className }: { className?: string }) {
  return (
    <figure className={cn("jb-foto-premium relative", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.65rem] bg-graf-100 shadow-raised ring-1 ring-graf-950/5 sm:aspect-[16/10] lg:aspect-[16/9]">
        <Image
          src="/site/bancada.webp"
          alt="Técnico consertando uma autoclave odontológica na bancada"
          fill
          sizes="(min-width: 1024px) 52vw, 92vw"
          className="object-cover object-[60%_40%]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.04),transparent_36%,transparent_64%,rgb(224_20_27/0.08))]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-graf-950/50 via-graf-950/10 to-transparent"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
          <div className="rounded-xl border border-white/20 bg-graf-950/70 px-3 py-2 text-white shadow-pop backdrop-blur-md">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-white/75">Assistência técnica odontológica</p>
            <p className="mt-0.5 text-sm font-extrabold text-white">Triagem com contexto antes da avaliação</p>
          </div>
        </div>
      </div>

      <p className="absolute -left-2 top-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop sm:-left-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-jb-500 text-white shadow-[0_6px_18px_-8px_rgb(224_20_27/0.9)]">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        Todas as marcas
      </p>
      <p className="absolute -right-2 top-16 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop sm:-right-4 sm:top-auto sm:bottom-5 sm:text-sm">
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
