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
    <section aria-labelledby="titulo-provas-home" className="relative isolate overflow-hidden bg-[#111214] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_100%_at_88%_50%,rgba(226,22,30,0.16),transparent_62%)]"
        aria-hidden
      />
      <h2 id="titulo-provas-home" className="sr-only">Por que escolher a JB</h2>
      <div className="container-jb relative z-10 max-w-[112rem]">
        <ul className="grid min-[640px]:grid-cols-2 min-[1024px]:grid-cols-4">
          {provas.map((prova, indice) => {
            const Icone = prova.icone;
            return (
              <li
                key={prova.titulo}
className="group relative flex min-w-0 items-center gap-4 border-white/10 py-5 min-[640px]:px-5 min-[1024px]:min-h-[7rem] min-[1024px]:border-l min-[1024px]:px-7 first:min-[1024px]:border-l-0 first:min-[1024px]:pl-0"
              >
                <span className="text-[0.62rem] font-black tracking-[0.14em] text-white/25" aria-hidden>
                  0{indice + 1}
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-jb-500/35 bg-white/[0.04] text-jb-300 transition-[box-shadow,border-color] duration-300 group-hover:border-jb-500/70 group-hover:shadow-[0_0_22px_-4px_rgba(226,22,30,0.55)]">
                  <Icone className="size-[1.1rem]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.9rem] font-black tracking-[-0.02em] text-white">{prova.titulo}</p>
                  <p className="mt-1 text-[0.7rem] leading-relaxed text-white/50">{prova.detalhe}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
