import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/* ============================================================================
   Seção de decisão da ficha de produto

   Um desenho só, para todas as seções — e agora em cartão com sanfona, como no
   desenho de referência: moldura arredondada, título numa barra de 56px com
   seta, e o conteúdo separado por um filete.

   **Elas nascem abertas, e isso é de propósito.**

   Este componente já foi `<details>` recolhido uma vez, e foi aberto com
   motivo: no desktop dava três gavetas fechadas de 73px empilhadas onde
   deveria estar o miolo técnico da página, e requisito de instalação — tomada,
   folga para ventilação, água destilada — é justamente o que o cliente precisa
   descobrir ANTES de comprar, não depois de um clique.

   A referência concorda: a ficha técnica dela também abre por padrão. A
   sanfona ali é moldura, não esconderijo. O que fecha lá é conteúdo de
   consulta, e é o que `aberto={false}` serve aqui.

   Nenhuma das fichas medidas como referência externa recolhe a ficha técnica
   no desktop: Tuttnauer, Mercado Livre e Magazine Luiza mostram tabela aberta,
   Dental Cremer e Newegg usam abas — e abas também não escondem, só realocam.
   O que essas páginas encurtam é a *lista longa dentro* da seção, e é lá que a
   divulgação progressiva ficou (ver `FichaTecnica`).
   ============================================================================ */

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
  /** Fecha a seção por padrão. Só para conteúdo de consulta. */
  aberto?: boolean;
};

export function BlocoDecisao({ id, titulo, resumo, children, lateral, aberto = true }: Props) {
  if (id === "relacionados") return null;

  return (
    <details
      id={id}
      open={aberto}
      className="group scroll-mt-[var(--jb-topo-secoes)] mt-3 rounded-xl border border-graf-200 bg-surface open:shadow-card"
    >
      <summary className="foco-jb flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span id={`${id}-titulo`} className="block text-bloco text-graf-950">
            {titulo}
          </span>
          {resumo ? (
            <span className="texto-apoio mt-1 block max-w-2xl text-graf-600">{resumo}</span>
          ) : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-graf-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="border-t border-graf-200 px-5 py-6">
        {lateral ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
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
