import { ArrowUpRight, BadgeCheck, CalendarCheck2, FileCheck2, MapPin } from "lucide-react";

import { LISTA_EVOXX } from "@/components/site/rodape-site";

/* ============================================================================
   Todas as marcas, e a autorização como credencial

   Primeiro o que a pessoa precisa saber: a JB conserta equipamento de
   qualquer marca. Depois a prova de seriedade: é assistência técnica
   autorizada EVOXX, com link para a lista oficial do fabricante. A ordem
   importa: com "autorizada EVOXX" no título, o site parecia atender só EVOXX.
   Vive na home e em toda página de equipamento, ao lado de três fatos da JB.
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
      <div className="container-jb py-12 lg:py-16">
        <div className="grid overflow-hidden rounded-3xl border border-graf-200/90 bg-white shadow-[0_30px_80px_-58px_rgb(17_19_21/0.5)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.7fr)]">
          <div className="jb-revela relative overflow-hidden border-b border-graf-100 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-9">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-24 size-60 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.11),transparent)]"
            />
            <div className="relative">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-jb-500 text-white shadow-[0_18px_38px_-24px_rgb(224_20_27/0.7)]">
                <BadgeCheck className="size-6" aria-hidden />
              </span>
              <p className="mt-5 text-[0.6875rem] font-extrabold uppercase tracking-[0.15em] text-jb-700">
                Cobertura + credencial verificável
              </p>
              <h2 id="autorizada-titulo" className="text-title texto-forte mt-2 max-w-md">
                Atendemos todas as marcas
              </h2>
              <p className="mt-3 max-w-lg text-corpo leading-relaxed text-graf-600">
                E a JB é assistência técnica autorizada EVOXX, na lista oficial do fabricante. Não
                é só dizer: dá para conferir.
              </p>
              <a
                href={LISTA_EVOXX}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-jb-200 bg-jb-50 px-4 text-sm font-extrabold text-jb-800 shadow-xs transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-jb-300 hover:bg-white hover:shadow-card"
              >
                Conferir na lista oficial EVOXX
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          </div>

          <ul className="grid gap-px bg-graf-100 sm:grid-cols-3">
            {provas.map((prova, indice) => (
              <li
                key={prova.titulo}
                className="jb-revela group relative min-h-[11rem] bg-white p-6 transition-colors duration-300 hover:bg-graf-50/70 sm:p-7 lg:min-h-full"
                style={{ "--i": indice + 1 } as React.CSSProperties}
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-graf-200 bg-graf-50 text-jb-600 shadow-xs transition-[transform,background-color,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-jb-200 group-hover:bg-jb-50">
                  <prova.icone className="size-5" aria-hidden />
                </span>
                <p className="mt-5 text-corpo font-extrabold leading-tight text-graf-950">{prova.titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-graf-600">{prova.texto}</p>
                <span
                  aria-hidden
                  className="absolute inset-x-6 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-jb-500 to-jb-300 transition-transform duration-300 group-hover:scale-x-100"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
