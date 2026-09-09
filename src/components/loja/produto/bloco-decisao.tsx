import type { ReactNode } from "react";

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
};

export function BlocoDecisao({ id, titulo, resumo, children, lateral }: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-32 border-t border-graf-200 py-8 lg:py-10"
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
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

