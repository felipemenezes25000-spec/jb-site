import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
};

const SECOES_RECOLHIVEIS = new Set([
  "ficha-tecnica",
  "preparo",
  "entrega-e-garantia",
]);

export function BlocoDecisao({ id, titulo, resumo, children, lateral }: Props) {
  if (id === "relacionados") return null;

  if (SECOES_RECOLHIVEIS.has(id)) {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-titulo`}
        className="scroll-mt-32 border-t border-graf-200"
      >
        <details className="group">
          <summary className="foco-jb -mx-2 flex min-h-[4.25rem] cursor-pointer list-none items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-graf-50/70 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <h2
                id={`${id}-titulo`}
                className="text-[1rem] font-extrabold tracking-[-0.015em] text-graf-950 sm:text-[1.0625rem]"
              >
                {titulo}
              </h2>
              {resumo ? (
                <span className="mt-0.5 block max-w-3xl text-xs leading-5 text-graf-500">
                  {resumo}
                </span>
              ) : null}
            </span>

            <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-graf-500 transition-colors group-open:bg-graf-50 group-open:text-jb-700">
              <ChevronDown
                className="size-5 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
              <span className="sr-only">Abrir ou recolher</span>
            </span>
          </summary>

          <div className="border-t border-graf-150 py-5 lg:py-6">
            {lateral ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                <div className="min-w-0">{children}</div>
                <aside className="min-w-0">{lateral}</aside>
              </div>
            ) : (
              <div className="min-w-0">{children}</div>
            )}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-32 border-t border-graf-200 py-6 lg:py-7"
    >
      <header className="mb-4 max-w-2xl">
        <h2
          id={`${id}-titulo`}
          className="text-xl font-extrabold tracking-[-0.02em] text-graf-950 lg:text-[1.375rem]"
        >
          {titulo}
        </h2>
        {resumo ? <p className="mt-1.5 text-sm leading-6 text-graf-600">{resumo}</p> : null}
      </header>

      {lateral ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0">{lateral}</aside>
        </div>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </section>
  );
}
