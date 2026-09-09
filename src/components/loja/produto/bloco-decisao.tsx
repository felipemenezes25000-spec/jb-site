import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
};

const SECOES_DE_CONSULTA = new Set(["ficha-tecnica", "preparo", "entrega-e-garantia"]);

/**
 * A PDP tem dois ritmos diferentes:
 *
 * - conteúdo de decisão/descoberta (sobre, dúvidas, relacionados) continua
 *   aberto no fluxo normal;
 * - conteúdo de consulta (ficha, preparo e entrega) aparece como um hub
 *   progressivo. O comprador sabe que a informação existe sem precisar
 *   atravessar todas as tabelas para chegar à próxima decisão.
 *
 * `details/summary` mantém teclado, semântica e funcionamento sem JavaScript.
 */
export function BlocoDecisao({ id, titulo, resumo, children, lateral }: Props) {
  const recolhivel = SECOES_DE_CONSULTA.has(id);

  if (recolhivel) {
    return (
      <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-32 border-t border-graf-200">
        <details className="group">
          <summary className="foco-jb flex min-h-[5.25rem] cursor-pointer list-none items-center justify-between gap-5 py-4 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <h2
                id={`${id}-titulo`}
                className="text-lg font-extrabold tracking-[-0.02em] text-graf-950 lg:text-xl"
              >
                {titulo}
              </h2>
              {resumo ? (
                <p className="mt-1 max-w-3xl text-sm leading-5 text-graf-500">{resumo}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-graf-600 transition-colors group-open:text-jb-700">
              <span className="hidden sm:inline group-open:hidden">Ver detalhes</span>
              <span className="hidden group-open:sm:inline">Recolher</span>
              <ChevronDown
                className="size-5 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </div>
          </summary>

          <div className="grid gap-6 pb-8 pt-1 lg:grid-cols-12 lg:gap-10 lg:pb-10">
            <div className="hidden lg:col-span-3 lg:block" aria-hidden />
            <div className={lateral ? "min-w-0 lg:col-span-6" : "min-w-0 lg:col-span-9"}>
              {children}
            </div>
            {lateral ? <aside className="min-w-0 lg:col-span-3">{lateral}</aside> : null}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-32 border-t border-graf-200 py-7 lg:py-8"
    >
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-10">
        <header className="lg:col-span-3">
          <h2
            id={`${id}-titulo`}
            className="text-xl font-extrabold tracking-[-0.02em] text-graf-950 lg:text-2xl"
          >
            {titulo}
          </h2>
          {resumo ? <p className="mt-2 text-sm leading-6 text-graf-600">{resumo}</p> : null}
        </header>

        <div className={lateral ? "min-w-0 lg:col-span-6" : "min-w-0 lg:col-span-9"}>
          {children}
        </div>
        {lateral ? <aside className="min-w-0 lg:col-span-3">{lateral}</aside> : null}
      </div>
    </section>
  );
}
