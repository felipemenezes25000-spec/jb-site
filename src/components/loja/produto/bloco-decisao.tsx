import type { ReactNode } from "react";

/* ============================================================================
   Seção de decisão da ficha de produto

   Um desenho só, para todas as seções.

   Antes existiam dois: três seções (`ficha-tecnica`, `preparo` e
   `entrega-e-garantia`) vinham como `<details>` recolhido e as outras como
   seção aberta — o que produzia dois tamanhos de `h2`, duas alturas de
   cabeçalho e, no desktop, três gavetas fechadas de 73px empilhadas onde
   deveria estar o miolo técnico da página. Requisito de instalação é
   justamente o que o cliente precisa descobrir antes de comprar, e ele estava
   atrás de um clique.

   Nenhuma das fichas de produto usadas como referência recolhe a ficha técnica
   no desktop: Tuttnauer, Mercado Livre e Magazine Luiza mostram tabela aberta,
   Dental Cremer e Newegg usam abas — e abas também não escondem, só realocam.
   O que essas páginas realmente encurtam é a *lista longa dentro* da seção, e
   é lá que a divulgação progressiva ficou (ver `FichaTecnica`).
   ============================================================================ */

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
};

export function BlocoDecisao({ id, titulo, resumo, children, lateral }: Props) {
  if (id === "relacionados") return null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-8 lg:py-10"
    >
      <header className="mb-5 max-w-2xl lg:mb-6">
        <h2 id={`${id}-titulo`} className="text-bloco text-graf-950">
          {titulo}
        </h2>
        {resumo ? (
          <p className="texto-apoio mt-1.5 text-graf-600">{resumo}</p>
        ) : null}
      </header>

      {lateral ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0">{lateral}</aside>
        </div>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </section>
  );
}
