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
      : { icone: Package, titulo: "Novos, seminovos e recondicionados", detalhe: "A condição real aparece em cada anúncio." },
    { icone: ClipboardList, titulo: "Pós-venda organizado", detalhe: "Compras, chamados e histórico na Área da Clínica." },
  ];

  return (
    <section aria-labelledby="titulo-provas-home" className="bg-jb-500 text-white">
      <h2 id="titulo-provas-home" className="sr-only">Por que escolher a JB</h2>
      <div className="container-jb max-w-[104rem]">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
          {provas.map((prova, indice) => {
            const Icone = prova.icone;
            return (
              <li
                key={prova.titulo}
                className={`flex min-w-0 gap-3 py-5 sm:px-5 lg:px-7 ${indice > 0 ? "lg:border-l lg:border-white/25" : ""}`}
              >
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/45 text-white">
                  <Icone className="size-4.5" />
                </span>
                <div className="min-w-0 self-center">
                  <p className="text-[0.95rem] font-extrabold leading-tight text-white">{prova.titulo}</p>
                  <p className="mt-1 text-[0.78rem] leading-relaxed text-white/78">{prova.detalhe}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
