import { CalendarClock, ClipboardList, Package, Wrench } from "lucide-react";

import { contagemProva } from "@/lib/prova";
import type { SettingsMap } from "@/lib/settings";

type Prova = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

export function ProvasObjetivas({
  configuracoes: s,
  equipamentos,
  marcas,
}: {
  configuracoes: SettingsMap;
  equipamentos: number;
  marcas: number;
}) {
  const desde = s.empresa_desde.trim();
  const cidade = s.endereco_cidade.trim();

  const provas: Prova[] = [
    desde
      ? { icone: CalendarClock, titulo: `Desde ${desde}`, detalhe: "Experiência com equipamento odontológico." }
      : { icone: Wrench, titulo: "Atendimento especializado", detalhe: "Venda e assistência no mesmo ecossistema." },
    contagemProva("marcas", marcas)
      ? { icone: Wrench, titulo: `${marcas} marcas no ecossistema`, detalhe: cidade ? `Equipe técnica própria em ${cidade}.` : "Equipe técnica própria." }
      : { icone: Wrench, titulo: "Assistência própria", detalhe: cidade ? `Equipe JB em ${cidade}.` : "Equipe técnica da própria JB." },
    contagemProva("equipamentos", equipamentos)
      ? { icone: Package, titulo: `${equipamentos} equipamentos`, detalhe: "Catálogo com condição e disponibilidade atuais." }
      : { icone: Package, titulo: "Novos e seminovos", detalhe: "Condição identificada em cada anúncio." },
    { icone: ClipboardList, titulo: "Pós-venda organizado", detalhe: "Compra e atendimento conectados à mesma relação." },
  ];

  return (
    <section aria-labelledby="titulo-provas-home" className="bg-[#111214] text-white">
      <h2 id="titulo-provas-home" className="sr-only">Por que escolher a JB</h2>
      <div className="container-jb max-w-[112rem]">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
          {provas.map((prova, indice) => {
            const Icone = prova.icone;
            return (
              <li
                key={prova.titulo}
                className="relative flex min-w-0 items-center gap-4 border-white/10 py-5 sm:px-5 lg:min-h-[6.5rem] lg:border-l lg:px-7 first:lg:border-l-0"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-jb-300">
                  <Icone className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.9rem] font-black tracking-[-0.02em] text-white">{prova.titulo}</p>
                  <p className="mt-1 text-[0.7rem] leading-relaxed text-white/50">{prova.detalhe}</p>
                </div>
                <span className="absolute right-3 top-3 text-[0.58rem] font-black tracking-[0.12em] text-white/10" aria-hidden>
                  0{indice + 1}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
