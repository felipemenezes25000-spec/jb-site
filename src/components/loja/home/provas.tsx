import { CalendarClock, ClipboardList, Package, Wrench } from "lucide-react";

import { Secao } from "@/components/ui/secao";
import { contagemProva } from "@/lib/prova";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Provas objetivas

   Faixa de confiança logo abaixo do hero. Só entra aqui o que é verificável:
   o ano em que a JB começou e a cidade em que atende, que vêm das
   configurações, e o que a própria plataforma faz — condição declarada em
   cada anúncio e prontuário do equipamento na Área da Clínica. Nenhum número
   de clientes, nota, porcentagem ou selo. Se não está no dado, não existe.

   Por que a contagem de catálogo não aparece por padrão: "7 equipamentos no
   catálogo" é um número verdadeiro que trabalha contra quem o publica — a
   prova vira confissão de vitrine vazia. O critério está em
   `src/lib/prova.ts`, compartilhado com a faixa de estatísticas do Sobre,
   para que as duas telas não discordem sobre quando um número convence.
   ============================================================================ */

type Prova = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

export function ProvasObjetivas({
  configuracoes: s,
  equipamentos,
}: {
  configuracoes: SettingsMap;
  /** Produtos publicados no catálogo. */
  equipamentos: number;
  /** Marcas publicadas com pelo menos um produto no ar. */
  marcas: number;
}) {
  const desde = s.empresa_desde.trim();
  const cidade = s.endereco_cidade.trim();

  const provas: Prova[] = [];

  if (desde) {
    provas.push({
      icone: CalendarClock,
      titulo: `Desde ${desde}`,
      detalhe: "Venda e assistência técnica de equipamento odontológico.",
    });
  }

  provas.push({
    icone: Wrench,
    titulo: "Equipe técnica própria",
    detalhe: cidade
      ? `Atendimento em ${cidade}. O serviço não é terceirizado.`
      : "O atendimento técnico não é terceirizado.",
  });

  if (contagemProva("equipamentos", equipamentos)) {
    provas.push({
      icone: Package,
      titulo: `${equipamentos} equipamentos no catálogo`,
      detalhe: "Com ficha técnica, condição e disponibilidade atualizadas.",
    });
  } else {
    provas.push({
      icone: Package,
      titulo: "Novos, seminovos e recondicionados",
      detalhe: "Cada anúncio declara a condição real da unidade anunciada.",
    });
  }

  provas.push({
    icone: ClipboardList,
    titulo: "Prontuário do equipamento",
    detalhe: "Compra, manutenção e chamados registrados na Área da Clínica.",
  });

  return (
    <Secao
      fundo="branco"
      espaco="sm"
      rotulo="Por que comprar e consertar na JB"
      className="border-b border-graf-200"
    >
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {provas.map((prova) => {
          const Icone = prova.icone;
          return (
            <li key={prova.titulo} className="flex gap-3.5">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600"
              >
                <Icone className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-bold leading-snug text-graf-950">
                  {prova.titulo}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-graf-500">{prova.detalhe}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
