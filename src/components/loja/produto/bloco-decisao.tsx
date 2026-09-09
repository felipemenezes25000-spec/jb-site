import {
  ChevronDown,
  ClipboardCheck,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
};

const PERFIL_DE_CONSULTA = {
  "ficha-tecnica": {
    titulo: "Especificações e documentos",
    etiqueta: "Dados técnicos",
    topicos: ["Especificações", "Medidas", "Documentos"],
    icone: SlidersHorizontal,
  },
  preparo: {
    titulo: "Antes de comprar",
    etiqueta: "Preparação",
    topicos: ["Infraestrutura", "Conteúdo da caixa", "Instalação"],
    icone: ClipboardCheck,
  },
  "entrega-e-garantia": {
    titulo: "Entrega, garantia e suporte",
    etiqueta: "Compra e pós-venda",
    topicos: ["Entrega", "Garantia", "Suporte JB"],
    icone: Truck,
  },
} as const;

type IdConsulta = keyof typeof PERFIL_DE_CONSULTA;

function eSecaoDeConsulta(id: string): id is IdConsulta {
  return id in PERFIL_DE_CONSULTA;
}

/**
 * A PDP separa conteúdo de descoberta de conteúdo de consulta.
 *
 * As três áreas mais densas — ficha, preparo e entrega — funcionam como um
 * índice vertical compacto. Fechadas, já explicam o que existe dentro. Abertas,
 * usam toda a largura útil da página; o antigo recuo de três colunas deixava
 * cerca de 25% da área vazia e fazia a ficha parecer maior do que precisava.
 *
 * `details/summary` mantém teclado, semântica e funcionamento sem JavaScript.
 */
export function BlocoDecisao({ id, titulo, resumo, children, lateral }: Props) {
  if (id === "relacionados") return null;

  if (eSecaoDeConsulta(id)) {
    const perfil = PERFIL_DE_CONSULTA[id];
    const Icone = perfil.icone;

    return (
      <section
        id={id}
        aria-labelledby={`${id}-titulo`}
        className="scroll-mt-32 border-t border-graf-200"
      >
        <h2 id={`${id}-titulo`} className="sr-only">
          {perfil.titulo}
        </h2>

        <details className="group">
          <summary className="foco-jb -mx-2 flex min-h-[4.5rem] cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-graf-50/80 group-open:bg-graf-50/55 [&::-webkit-details-marker]:hidden sm:gap-4 sm:py-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-graf-200 bg-white text-jb-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <Icone className="size-[18px]" aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[0.625rem] font-extrabold uppercase tracking-[0.105em] text-jb-700">
                {perfil.etiqueta}
              </span>
              <span className="mt-0.5 block text-[1rem] font-extrabold tracking-[-0.015em] text-graf-950 sm:text-[1.0625rem]">
                {perfil.titulo}
              </span>
              {resumo ? (
                <span className="mt-0.5 hidden max-w-3xl text-xs leading-5 text-graf-500 md:block">
                  {resumo}
                </span>
              ) : null}
            </span>

            <span className="hidden shrink-0 items-center gap-1.5 xl:flex" aria-hidden>
              {perfil.topicos.map((topico) => (
                <span
                  key={topico}
                  className="rounded-full border border-graf-200 bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-graf-600"
                >
                  {topico}
                </span>
              ))}
            </span>

            <span className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-graf-500 transition-colors group-open:bg-white group-open:text-jb-700">
              <ChevronDown
                className="size-5 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
              <span className="sr-only">Abrir ou recolher</span>
            </span>
          </summary>

          <div className="border-t border-graf-200 bg-graf-50/35 px-0 py-4 sm:py-5 lg:py-6">
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
