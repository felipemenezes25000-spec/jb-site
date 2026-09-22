import { ArrowUpRight, BadgeCheck, CalendarCheck2, FileCheck2, MapPin } from "lucide-react";

import { LISTA_EVOXX } from "@/components/site/rodape-site";

/* ============================================================================
   Autorizada EVOXX, com prova

   O selo e o link para a lista oficial do fabricante, onde qualquer um confere,
   ao lado de três fatos da JB. Vive na home e nas páginas dos equipamentos da
   linha EVOXX; na da cadeira, que não é da linha, não entra, para o selo não
   parecer cobrir o que não cobre.
   ============================================================================ */

export function FaixaAutorizada({ desde, cidade }: { desde: string; cidade: string }) {
  const provas = [
    {
      icone: CalendarCheck2,
      titulo: `Na bancada desde ${desde}`,
      texto: "Anos consertando equipamento de clínica odontológica.",
    },
    {
      icone: FileCheck2,
      titulo: "Orçamento antes da troca",
      texto: "Nenhuma peça é trocada sem a sua aprovação.",
    },
    {
      icone: MapPin,
      titulo: "Na clínica ou na bancada",
      texto: `Atendimento em ${cidade} e região.`,
    },
  ];

  return (
    <section
      id="autorizada"
      aria-labelledby="autorizada-titulo"
      className="scroll-mt-20 border-b border-graf-200 bg-surface-muted"
    >
      <div className="container-jb grid gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:items-center lg:gap-14 lg:py-14">
        <div className="jb-revela flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-jb-500 text-white shadow-card">
            <BadgeCheck className="size-6" aria-hidden />
          </span>
          <div>
            <h2 id="autorizada-titulo" className="text-title texto-forte">
              Assistência técnica autorizada EVOXX
            </h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              A JB está na lista oficial do fabricante. Não é só dizer: dá para conferir.
            </p>
            <a
              href={LISTA_EVOXX}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb mt-3 inline-flex min-h-11 items-center gap-1 rounded text-sm font-bold text-jb-700 underline-offset-4 hover:underline"
            >
              Conferir no site da EVOXX
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {provas.map((prova, indice) => (
            <li
              key={prova.titulo}
              className="jb-revela border-t-2 border-jb-500 pt-4"
              style={{ "--i": indice + 1 } as React.CSSProperties}
            >
              <prova.icone className="size-5 text-jb-600" aria-hidden />
              <p className="mt-3 text-corpo font-extrabold text-graf-950">{prova.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-graf-600">{prova.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
