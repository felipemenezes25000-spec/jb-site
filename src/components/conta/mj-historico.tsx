import Link from "next/link";
import {
  CalendarCheck,
  FileText,
  LifeBuoy,
  NotebookPen,
  Wrench,
} from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import type { ItemHistorico, TipoHistorico } from "@/lib/equipamento";
import { distanciaEmDias, formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Histórico do equipamento.
 *
 * Recebe pronto o que `historicoDoEquipamento` juntou de cinco tabelas
 * (eventos, chamados, ordens de serviço, visitas e documentos) e só desenha —
 * a ordem e a fusão são responsabilidade da camada de domínio.
 *
 * O desenho é o de uma linha do tempo de verdade: no desktop a data fica numa
 * coluna própria à esquerda, alinhada à direita, para o olho descer pelas datas
 * sem tropeçar no texto; o trilho liga um acontecimento ao outro; e cada
 * registro é um cartão, não uma linha solta de texto. No celular a coluna de
 * data recolhe para dentro do cartão — coluna estreita ali só espremeria o
 * conteúdo.
 *
 * O ícone diferencia a origem de cada linha, mas nunca sozinho: o tipo está
 * escrito por extenso acima do título.
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

/** Cor do marcador por origem — o mesmo código de cor do resto da área. */
const COR_DO_TIPO: Record<TipoHistorico, string> = {
  evento: "bg-graf-100 text-graf-700",
  chamado: "bg-jb-50 text-jb-700",
  os: "bg-info-50 text-info-700",
  visita: "bg-ok-50 text-ok-700",
  documento: "bg-graf-100 text-graf-700",
};

export function Historico({ itens }: { itens: ItemHistorico[] }) {
  return (
    <ol className="relative">
      {itens.map((item, indice) => {
        const Icone = ICONE[item.tipo];
        const ultimo = indice === itens.length - 1;
        const data = formatarData(item.quando);
        const distancia = distanciaEmDias(item.quando);

        return (
          <li key={item.id} className="flex gap-3 pb-5 last:pb-0 sm:gap-4">
            <div className="hidden w-[6.75rem] shrink-0 pt-2 text-right sm:block">
              <p className="tabular text-xs font-bold text-graf-700">{data}</p>
              <p className="mt-0.5 text-xs text-graf-500">{distancia}</p>
            </div>

            <div className="relative flex shrink-0 justify-center">
              {!ultimo ? (
                <span
                  aria-hidden
                  className="absolute -bottom-5 left-1/2 top-10 w-px -translate-x-1/2 bg-graf-200"
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-full ring-4 ring-white",
                  COR_DO_TIPO[item.tipo],
                )}
              >
                <Icone className="size-4" />
              </span>
            </div>

            <div className="min-w-0 flex-1 rounded-xl border border-graf-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.07em] text-graf-500">
                  {NOME_DO_TIPO[item.tipo]}
                </p>
                {item.etiqueta ? <Etiqueta tom="neutro">{item.etiqueta}</Etiqueta> : null}
              </div>

              <p className="mt-1 text-[0.9375rem] font-bold leading-snug text-graf-950">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded-sm underline-offset-4 transition-colors hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {item.titulo}
                  </Link>
                ) : (
                  item.titulo
                )}
              </p>

              {item.descricao ? (
                <p className="mt-1.5 line-3 text-sm leading-relaxed text-graf-600">
                  {item.descricao}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-graf-500 sm:hidden">
                <span className="tabular font-semibold text-graf-700">{data}</span>
                <span aria-hidden> · </span>
                {distancia}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
