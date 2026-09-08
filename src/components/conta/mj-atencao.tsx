import Link from "next/link";
import { ArrowRight, CircleAlert, TriangleAlert } from "lucide-react";

import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Urgencia = "alta" | "media";

export type Pendencia = {
  chave: string;
  urgencia: Urgencia;
  titulo: string;
  detalhe: string;
  href: string;
  acao: string;
};

const TONS: Record<Urgencia, { selo: string; icone: typeof TriangleAlert }> = {
  alta: { selo: "bg-jb-50 text-jb-700 ring-jb-500/10", icone: TriangleAlert },
  media: { selo: "bg-warn-50 text-warn-700 ring-warn-500/10", icone: CircleAlert },
};

export function PrecisaDeAtencao({ pendencias }: { pendencias: Pendencia[] }) {
  if (pendencias.length === 0) return null;

  const altas = pendencias.filter((p) => p.urgencia === "alta").length;

  return (
    <section
      aria-labelledby="mj-atencao"
      className="overflow-hidden rounded-2xl border border-graf-200/90 bg-white shadow-[0_1px_2px_rgba(18,24,35,0.025),0_18px_46px_-36px_rgba(18,24,35,0.34)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-graf-200/90 bg-gradient-to-r from-[#fff9f9] via-white to-graf-50/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-jb-50 text-jb-700 ring-1 ring-inset ring-jb-500/10">
            <TriangleAlert className="size-[17px]" aria-hidden />
          </span>
          <h2 id="mj-atencao" className="text-[1.03rem] font-extrabold tracking-[-0.015em] text-graf-950">
            Precisa da sua atenção
          </h2>
        </div>
        <p className="text-sm text-graf-600">
          {plural(pendencias.length, "item", "itens")}
          {altas > 0 ? (
            <span className="font-bold text-jb-700">
              {` · ${altas} ${altas === 1 ? "urgente" : "urgentes"}`}
            </span>
          ) : null}
        </p>
      </div>

      <ul className="divide-y divide-graf-100">
        {pendencias.map((pendencia) => {
          const tom = TONS[pendencia.urgencia];
          const Icone = tom.icone;

          return (
            <li key={pendencia.chave}>
              <Link
                href={pendencia.href}
                className="group flex items-center gap-4 px-5 py-4 transition-all hover:bg-graf-50/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset",
                    tom.selo,
                  )}
                >
                  <Icone className="size-[18px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[0.92rem] font-extrabold leading-snug tracking-[-0.01em] text-graf-950">
                    {pendencia.titulo}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-graf-500">
                    {pendencia.detalhe}
                  </span>
                </span>

                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
                  <span className="hidden sm:inline">{pendencia.acao}</span>
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
