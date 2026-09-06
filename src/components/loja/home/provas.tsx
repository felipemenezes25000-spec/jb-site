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
      ? { icone: CalendarClock, titulo: `Desde ${desde}`, detalhe: "Experiência em equipamento odontológico." }
      : { icone: Wrench, titulo: "Atendimento especializado", detalhe: "Venda e assistência no mesmo ecossistema." },
    contagemProva("marcas", marcas)
      ? { icone: Wrench, titulo: `${marcas} marcas atendidas`, detalhe: cidade ? `Equipe técnica própria em ${cidade}.` : "Equipe técnica própria." }
      : { icone: Wrench, titulo: "Assistência própria", detalhe: cidade ? `Equipe JB em ${cidade}.` : "Equipe técnica da própria JB." },
    contagemProva("equipamentos", equipamentos)
      ? { icone: Package, titulo: `${equipamentos} equipamentos`, detalhe: "Catálogo com condição e disponibilidade atuais." }
      : { icone: Package, titulo: "Novo, seminovo e recondicionado", detalhe: "A condição real aparece em cada anúncio." },
    { icone: ClipboardList, titulo: "Pós-venda organizado", detalhe: "Compras, chamados e histórico na Área da Clínica." },
  ];

  return (
    <section aria-labelledby="titulo-provas-home" className="border-b border-graf-200 bg-white">
      <h2 id="titulo-provas-home" className="sr-only">Por que escolher a JB</h2>
      <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-graf-200">
          {provas.map((prova) => {
            const Icone = prova.icone;
            return (
              <li key={prova.titulo} className="flex min-w-0 items-center gap-4 py-5 sm:px-5 lg:min-h-[6.25rem] lg:px-7">
                <Icone className="size-7 shrink-0 stroke-[1.8] text-jb-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[0.92rem] font-extrabold tracking-[-0.02em] text-graf-950">{prova.titulo}</p>
                  <p className="mt-1 text-[0.74rem] leading-relaxed text-graf-500">{prova.detalhe}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
