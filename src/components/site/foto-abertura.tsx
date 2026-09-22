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
   ela vem antes do título, mais baixa (2:1), para o título e o botão do
   WhatsApp ainda caberem na primeira tela; no computador fica sob os botões,
   ao lado do diagnóstico. A ordem é de CSS, e a imagem existe uma vez só.
   ============================================================================ */

export function FotoAbertura({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-graf-100 shadow-raised ring-1 ring-graf-950/5 sm:aspect-[16/10] lg:aspect-[16/9]">
        <Image
          src="/site/bancada.webp"
          alt="Técnico consertando uma autoclave odontológica na bancada"
          fill
          priority
          sizes="(min-width: 1024px) 44vw, 92vw"
          className="jb-foto-viva object-cover object-[60%_40%]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-graf-950/35 to-transparent"
        />
      </div>

      <p className="jb-boia absolute -left-2 top-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-left-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-jb-500 text-white">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        Autorizada EVOXX
      </p>
      <p className="jb-boia-2 absolute -right-2 bottom-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-right-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ok-500 text-white">
          <FileCheck2 className="size-4" aria-hidden />
        </span>
        Orçamento antes da troca
      </p>
    </div>
  );
}
