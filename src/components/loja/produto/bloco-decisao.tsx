import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
  aberto?: boolean;
  contador?: string;
};

export function BlocoDecisao({
  id,
  titulo,
  resumo,
  children,
  lateral,
  aberto = false,
  contador,
}: Props) {
  if (id === "relacionados") return null;

  return (
    <details
      id={id}
      open={aberto}
      className="group scroll-mt-[var(--jb-topo-secoes)] mt-5 overflow-hidden rounded-[1.6rem] border border-graf-200 bg-white transition-all open:border-graf-300 open:shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] hover:border-graf-300"
    >
      <summary className="foco-jb relative flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 marker:hidden sm:px-8 sm:py-6 [&::-webkit-details-marker]:hidden">
        <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-jb-600 opacity-0 transition-opacity group-open:opacity-100" aria-hidden />

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2
              id={`${id}-titulo`}
              className="fonte-display text-[clamp(1.45rem,1.25rem+0.65vw,2rem)] leading-tight tracking-[-0.025em] text-graf-950"
            >
              {titulo}
            </h2>
            {contador ? (
              <span className="micro rounded-full border border-graf-200 bg-graf-50 px-2.5 py-1 text-graf-700">
                {contador}
              </span>
            ) : null}
          </span>
          {resumo ? (
            <span className="mt-2 block max-w-3xl text-sm leading-6 text-graf-600">{resumo}</span>
          ) : null}
        </span>

        <span className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-graf-200 bg-graf-50/70 px-4 text-apoio font-bold text-graf-800 transition-all group-hover:border-jb-300 group-hover:bg-white group-hover:text-jb-700 group-open:border-jb-100 group-open:bg-jb-50/70 group-open:text-jb-700">
          <span className="hidden sm:inline group-open:sm:hidden">Ver detalhes</span>
          <span className="hidden group-open:sm:inline">Fechar</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <div className="border-t border-graf-200 bg-graf-50/20 px-6 py-8 sm:px-8 sm:py-10">
        {lateral ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
            <div className="min-w-0">{children}</div>
            <aside className="min-w-0">{lateral}</aside>
          </div>
        ) : (
          <div className="min-w-0">{children}</div>
        )}
      </div>
    </details>
  );
}
