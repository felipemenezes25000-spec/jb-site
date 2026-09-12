import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/* ============================================================================
   Seção de decisão da ficha de produto

   Cartão com sanfona: moldura arredondada, barra de título e o conteúdo
   separado por um filete.

   **Nascem fechadas, com convite explícito para abrir.**

   Só a seta não basta: ela é pequena, cinza e fica no canto oposto ao título —
   num toque de dedo, ninguém garante que a pessoa entenda que o cartão inteiro
   abre. Por isso a barra carrega a palavra: "Ver detalhes" quando fechado,
   "Fechar" quando aberto, ao lado da seta. O alvo é a barra inteira, não o
   ícone.

   A troca do rótulo é feita por CSS (`group-open`), não por estado de React:
   `<details>` já guarda o aberto/fechado sozinho, e um `useState` aqui
   transformaria quatro seções de conteúdo em componente de cliente para
   trocar uma palavra.

   O respiro é generoso de propósito. Antes eram `px-5` com `py-6`, e o
   conteúdo — tabela de especificação, requisitos de instalação, lista de
   itens da caixa — encostava na moldura.
   ============================================================================ */

type Props = {
  id: string;
  titulo: string;
  resumo?: string;
  children: ReactNode;
  lateral?: ReactNode;
  /** Abre a seção por padrão. */
  aberto?: boolean;
  /** Quanto há aqui dentro — "12 especificações", "5 perguntas".

      Fechado, um cartão de sanfona diz o que tem lá dentro mas não QUANTO, e
      quatro deles enfileirados viram quatro gavetas iguais. O número é a
      única coisa que diferencia uma da outra antes de abrir. */
  contador?: string;
};

export function BlocoDecisao({ id, titulo, resumo, children, lateral, aberto = false, contador }: Props) {
  if (id === "relacionados") return null;

  return (
    <details
      id={id}
      open={aberto}
      className="group scroll-mt-[var(--jb-topo-secoes)] mt-4 rounded-2xl border border-graf-200 bg-surface transition-shadow open:shadow-card hover:border-graf-300"
    >
      <summary className="foco-jb flex cursor-pointer list-none items-center justify-between gap-6 rounded-2xl px-6 py-5 marker:hidden sm:px-8 sm:py-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          {/* `h2` de verdade, dentro do `summary`.

              Quando as seções viraram sanfona o título passou a ser um
              `<span>`, e a ficha de produto perdeu os cinco cabeçalhos do seu
              esqueleto de uma vez: quem navega por títulos deixou de
              encontrar "Especificações técnicas" ou "Antes de comprar", e a
              barra "Seções deste equipamento" apontava para âncoras sem
              cabeçalho nenhum. `h2` dentro de `summary` é marcação válida. */}
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 id={`${id}-titulo`} className="text-bloco text-graf-950">
              {titulo}
            </h2>
            {contador ? (
              <span className="micro rounded-full bg-surface-sunken px-2.5 py-1 text-graf-700">
                {contador}
              </span>
            ) : null}
          </span>
          {resumo ? (
            <span className="texto-apoio mt-1.5 block max-w-2xl text-graf-600">{resumo}</span>
          ) : null}
        </span>

        {/* O convite. 44px de alvo, e a palavra ao lado da seta — quem toca
            precisa saber que há mais coisa aí dentro. */}
        <span className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-graf-200 px-4 text-apoio font-bold text-graf-800 transition-colors group-hover:border-jb-500 group-hover:text-jb-700 group-open:border-graf-200">
          <span className="hidden sm:inline group-open:sm:hidden">Ver detalhes</span>
          <span className="hidden group-open:sm:inline">Fechar</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <div className="border-t border-graf-200 px-6 py-8 sm:px-8 sm:py-10">
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
