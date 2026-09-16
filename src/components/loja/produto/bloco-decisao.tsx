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
  /* Todas nascem abertas.

     Com duas abertas e duas fechadas, a barra de âncoras levava a pessoa para
     dentro de um cartão vazio: "Entrega e garantia" e "Dúvidas" rolavam até o
     título e exigiam um segundo clique para mostrar o conteúdo que o link
     acabara de prometer. A auditoria registrou os dois. Continuar podendo
     fechar é divulgação progressiva; abrir por padrão é honrar o link. */
  aberto = true,
  contador,
}: Props) {
  if (id === "relacionados") return null;

  return (
    <details
      id={id}
      open={aberto}
      className="group scroll-mt-[var(--jb-topo-secoes)] mt-5 border-t border-graf-200 bg-white"
    >
      <summary className="foco-jb relative flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 marker:hidden sm:py-6 [&::-webkit-details-marker]:hidden">

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2
              id={`${id}-titulo`}
              className="fonte-display text-bloco text-graf-950"
            >
              {titulo}
            </h2>
            {contador ? (
              <span className="text-apoio text-graf-700">
                {contador}
              </span>
            ) : null}
          </span>
          {resumo ? (
            <span className="mt-2 block max-w-3xl text-sm leading-6 text-graf-600">{resumo}</span>
          ) : null}
        </span>

        <span className="flex size-11 shrink-0 items-center justify-center text-graf-800 group-hover:text-jb-700">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <div className="pb-8 pt-2 sm:pb-10">
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
