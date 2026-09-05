import Link from "next/link";
import { FileText, LifeBuoy, NotebookPen, Wrench, CalendarCheck } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import type { ItemHistorico, TipoHistorico } from "@/lib/equipamento";
import { formatarDataHora } from "@/lib/format";

/**
 * Histórico do equipamento.
 *
 * Recebe pronto o que `historicoDoEquipamento` juntou de cinco tabelas
 * (eventos, chamados, ordens de serviço, visitas e documentos) e só desenha —
 * a ordem e a fusão são responsabilidade da camada de domínio.
 *
 * O ícone diferencia a origem de cada linha, mas nunca sozinho: o tipo também
 * está escrito no rótulo lido por leitor de tela.
 */

const ICONE: Record<TipoHistorico, React.ComponentType<{ className?: string }>> = {
  evento: NotebookPen,
  chamado: LifeBuoy,
  os: Wrench,
  visita: CalendarCheck,
  documento: FileText,
};

const NOME_DO_TIPO: Record<TipoHistorico, string> = {
  evento: "Anotação",
  chamado: "Chamado de assistência",
  os: "Ordem de serviço",
  visita: "Visita de manutenção",
  documento: "Documento",
};

export function Historico({ itens }: { itens: ItemHistorico[] }) {
  return (
    <ol className="relative">
      {itens.map((item, indice) => {
        const Icone = ICONE[item.tipo];
        const ultimo = indice === itens.length - 1;

        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!ultimo ? (
              <span
                aria-hidden
                className="absolute left-[15px] top-9 h-[calc(100%-1.5rem)] w-0.5 bg-graf-200"
              />
            ) : null}

            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-graf-100 text-graf-600">
              <Icone className="size-4" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-graf-900">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="rounded-sm underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {item.titulo}
                    </Link>
                  ) : (
                    item.titulo
                  )}
                </p>
                {item.etiqueta ? <Etiqueta tom="neutro">{item.etiqueta}</Etiqueta> : null}
              </div>

              {item.descricao ? (
                <p className="mt-1 line-3 text-sm leading-relaxed text-graf-600">
                  {item.descricao}
                </p>
              ) : null}

              <p className="mt-1 text-xs text-graf-500">
                <span className="sr-only">{NOME_DO_TIPO[item.tipo]} · </span>
                {formatarDataHora(item.quando)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
