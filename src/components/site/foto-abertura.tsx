import Image from "next/image";

import { CamadasRaioX } from "@/components/site/raio-x";
import { plantaDaFoto } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

/* ============================================================================
   Foto editorial da assistência

   Depois da reorganização mobile, a triagem vem antes desta imagem. Por isso
   ela não é mais pré-carregada: no celular isso evita competir com logo,
   fontes e interface que aparecem primeiro. O Next continua otimizando e
   carregando a foto quando ela se aproxima da viewport.

   A foto fica parada. O que se move é o raio-X (`CamadasRaioX`): no
   computador, o scanner passa uma vez depois da chegada e a lente segue o
   mouse; no celular, o scanner passa quando a foto cruza o meio da tela, com
   a rolagem. Nada em laço. Os selos "Todas as marcas" e "Orçamento antes da
   troca" saíram daqui: repetiam as provas logo acima da foto.
   ============================================================================ */

const FOTO = "/site/bancada.webp";
const POSICAO = "60% 40%";

export function FotoAbertura({ className }: { className?: string }) {
  const planta = plantaDaFoto(FOTO);

  return (
    <figure className={cn("jb-foto-premium relative", className)}>
      <div
        data-raiox={planta ? "abertura" : undefined}
        data-luz={planta ? "" : undefined}
        className="jb-raiox relative aspect-[4/3] overflow-hidden rounded-[1.65rem] bg-graf-100 shadow-raised ring-1 ring-graf-950/5 sm:aspect-[16/10] lg:aspect-[16/9]"
      >
        <Image
          src={FOTO}
          alt="Técnico consertando uma autoclave odontológica na bancada"
          fill
          sizes="(min-width: 1024px) 52vw, 92vw"
          className="object-cover"
          style={{ objectPosition: POSICAO }}
        />
        {planta ? (
          <CamadasRaioX planta={planta} ajuste="object-cover" posicao={POSICAO} lente rotulo="Raio-X da bancada" />
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.04),transparent_36%,transparent_64%,rgb(224_20_27/0.08))]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-graf-950/50 via-graf-950/10 to-transparent"
        />
        {/* Acima do scanner (`z-[6]`): a faixa passa por baixo da legenda. */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[6] flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
          <div className="rounded-xl border border-white/20 bg-graf-950/70 px-3 py-2 text-white shadow-pop backdrop-blur-md">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-white/75">Assistência técnica odontológica</p>
            <p className="mt-0.5 text-sm font-extrabold text-white">Triagem com contexto antes da avaliação</p>
          </div>
        </div>
        {planta ? (
          <span aria-hidden className="jb-raiox-dica">
            <span className="jb-raiox-dica-ponto" />
            <span className="jb-raiox-dica-mouse">Passe o mouse: raio-X</span>
            <span className="jb-raiox-dica-toque">Raio-X da bancada</span>
          </span>
        ) : null}
      </div>

      <figcaption className="sr-only">
        Assistência técnica de equipamentos odontológicos com orçamento informado antes da troca de peças.
      </figcaption>
    </figure>
  );
}
