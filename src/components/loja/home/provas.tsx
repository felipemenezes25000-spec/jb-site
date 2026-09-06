import { CalendarClock, ClipboardList, Package, Wrench } from "lucide-react";

import { contagemProva } from "@/lib/prova";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Faixa de confiança

   O hero é emocional; esta faixa é objetiva. Ela usa apenas informação que o
   próprio banco/configuração consegue provar. Nada de "+5.000 clientes",
   avaliação inventada ou cobertura nacional sem dado para sustentar.
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
          detalhe: "Venda e assistência técnica odontológica.",
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
          titulo: "Equipe técnica própria",
          detalhe: cidade ? `Atendimento em ${cidade}, sem terceirização.` : "Atendimento sem terceirização.",
        },
    contagemProva("equipamentos", equipamentos)
      ? {
          icone: Package,
          titulo: `${equipamentos} equipamentos no catálogo`,
          detalhe: "Ficha, condição e disponibilidade atualizadas.",
        }
      : {
          icone: Package,
          titulo: "Novos, seminovos e recondicionados",
          detalhe: "A condição real é declarada em cada anúncio.",
        },
    {
      icone: ClipboardList,
      titulo: "Prontuário do equipamento",
      detalhe: "Compra, manutenção e chamados reunidos na Área da Clínica.",
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
                className={`flex min-w-0 gap-4 py-6 sm:px-5 sm:py-7 lg:px-7 ${
                  indice > 0 ? "lg:border-l lg:border-graf-200" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600"
                >
                  <Icone className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-extrabold leading-snug text-graf-950">{prova.titulo}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graf-500">{prova.detalhe}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
