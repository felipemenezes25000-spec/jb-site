import { CalendarClock, ClipboardList, Package, Wrench } from "lucide-react";

import { contagemProva } from "@/lib/prova";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Faixa de confiança

   Uma faixa curta, legível em um olhar. O hero já explica a proposta; aqui só
   entram provas objetivas vindas de configuração e banco.
   ============================================================================ */

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
      ? {
          icone: CalendarClock,
          titulo: `Desde ${desde}`,
          detalhe: "Experiência em equipamento odontológico.",
        }
      : {
          icone: Wrench,
          titulo: "Atendimento especializado",
          detalhe: "Venda e assistência no mesmo ecossistema.",
        },
    contagemProva("marcas", marcas)
      ? {
          icone: Wrench,
          titulo: `${marcas} marcas atendidas`,
          detalhe: cidade ? `Equipe técnica própria em ${cidade}.` : "Equipe técnica própria.",
        }
      : {
          icone: Wrench,
          titulo: "Assistência própria",
          detalhe: cidade ? `Equipe JB em ${cidade}, sem terceirização.` : "Equipe técnica da própria JB.",
        },
    contagemProva("equipamentos", equipamentos)
      ? {
          icone: Package,
          titulo: `${equipamentos} equipamentos`,
          detalhe: "Catálogo com condição e disponibilidade atuais.",
        }
      : {
          icone: Package,
          titulo: "Novo, seminovo e recondicionado",
          detalhe: "A condição real aparece em cada anúncio.",
        },
    {
      icone: ClipboardList,
      titulo: "Pós-venda organizado",
      detalhe: "Compras, chamados e histórico na Área da Clínica.",
    },
  ];

  return (
    <section aria-labelledby="titulo-provas-home" className="border-b border-graf-200 bg-white">
      <h2 id="titulo-provas-home" className="sr-only">
        Por que escolher a JB
      </h2>

      <div className="container-jb">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
          {provas.map((prova, indice) => {
            const Icone = prova.icone;
            return (
              <li
                key={prova.titulo}
                className={`flex min-w-0 gap-4 py-5 sm:px-5 sm:py-6 lg:px-7 xl:px-9 ${
                  indice > 0 ? "lg:border-l lg:border-graf-200" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-jb-50 text-jb-600"
                >
                  <Icone className="size-5" />
                </span>
                <div className="min-w-0 self-center">
                  <p className="text-[1.02rem] font-extrabold leading-tight text-graf-950">
                    {prova.titulo}
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-graf-500">
                    {prova.detalhe}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
