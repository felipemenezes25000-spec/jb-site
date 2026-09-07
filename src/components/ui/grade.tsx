import { cn } from "@/lib/utils";

/* ============================================================================
   Grade responsiva

   Colunas por ponto de quebra sem cada tela reescrever a mesma lista de
   classes — e sem classe montada em tempo de execução, que o Tailwind não
   enxergaria ao gerar o CSS.

       <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="md">

   O padrão é uma coluna no celular. Vitrine de produto costuma ser
   { base: 1, sm: 2, lg: 3, xl: 4 }; cartão de serviço, { base: 1, md: 3 }.
   ============================================================================ */

export type Colunas = 1 | 2 | 3 | 4 | 5 | 6;

export type ColunasPorTela = {
  base?: Colunas;
  sm?: Colunas;
  md?: Colunas;
  lg?: Colunas;
  xl?: Colunas;
  /** `2xl` (1536px). Existe para o catálogo respirar em monitor largo sem
      esticar o cartão até a foto do equipamento virar cartaz. */
  xxl?: Colunas;
};

/**
 * Teto de colunas ajustado à quantidade de itens.
 *
 * Um grid de quatro colunas com um item só não é um grid: é um cartão órfão
 * com três buracos ao lado. Acontece sempre que a quantidade vem do banco —
 * relacionados de um produto, serviços publicados, cases — e o layout foi
 * escrito para o caso cheio.
 *
 * Limitar as colunas ao número de itens fecha a fileira. Quem chama continua
 * declarando o teto que quer no caso cheio; aqui só se corta o excesso.
 */
export function colunasAte(itens: number, teto: ColunasPorTela): ColunasPorTela {
  const cabem = Math.max(1, itens) as Colunas;
  const limitar = (valor?: Colunas) =>
    valor === undefined ? undefined : (Math.min(valor, cabem) as Colunas);

  return {
    base: limitar(teto.base),
    sm: limitar(teto.sm),
    md: limitar(teto.md),
    lg: limitar(teto.lg),
    xl: limitar(teto.xl),
    xxl: limitar(teto.xxl),
  };
}

const BASE: Record<Colunas, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const SM: Record<Colunas, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

const MD: Record<Colunas, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const LG: Record<Colunas, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const XL: Record<Colunas, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

const XXL: Record<Colunas, string> = {
  1: "2xl:grid-cols-1",
  2: "2xl:grid-cols-2",
  3: "2xl:grid-cols-3",
  4: "2xl:grid-cols-4",
  5: "2xl:grid-cols-5",
  6: "2xl:grid-cols-6",
};

export type EspacoGrade = "sm" | "md" | "lg";

const ESPACOS: Record<EspacoGrade, string> = {
  sm: "gap-3 sm:gap-4",
  md: "gap-4 sm:gap-5 lg:gap-6",
  lg: "gap-6 sm:gap-8 lg:gap-10",
};

/**
 * Colunas que fecham a última linha.
 *
 * Uma faixa de vitrine com quatro cartões numa grade de três deixa um cartão
 * sozinho e meia tela vazia ao lado — o defeito mais comum quando o catálogo
 * ainda é pequeno. Aqui a contagem escolhe a grade: quatro itens viram 2×2 até
 * `lg` e uma linha de quatro no `xl`; três ou seis seguem em três colunas.
 *
 * Serve para faixa de destaque e de categoria, onde o número de itens vem do
 * banco e muda sozinho conforme a JB publica.
 */
export function colunasParaTotal(total: number): ColunasPorTela {
  if (total <= 1) return { base: 1 };
  if (total === 2) return { base: 1, sm: 2 };
  if (total === 4 || total === 8) return { base: 1, sm: 2, xl: 4 };
  return { base: 1, sm: 2, lg: 3 };
}

export function Grade({
  colunas,
  espaco = "md",
  como = "div",
  className,
  children,
}: {
  colunas?: ColunasPorTela;
  espaco?: EspacoGrade;
  /** `ul` quando o conteúdo é mesmo uma lista — os filhos viram `li`. */
  como?: "div" | "ul" | "ol";
  className?: string;
  children: React.ReactNode;
}) {
  const Elemento = como;
  const { base = 1, sm, md, lg, xl, xxl } = colunas ?? {};

  return (
    <Elemento
      className={cn(
        "grid",
        BASE[base],
        sm && SM[sm],
        md && MD[md],
        lg && LG[lg],
        xl && XL[xl],
        xxl && XXL[xxl],
        ESPACOS[espaco],
        como !== "div" && "list-none p-0",
        className,
      )}
    >
      {children}
    </Elemento>
  );
}

/**
 * Duas colunas assimétricas — conteúdo e coluna de apoio.
 *
 * Empilha no celular e, no desktop, dá 2/3 para o conteúdo. É o desenho de
 * página de produto, de detalhe de pedido e de ordem de serviço: o miolo à
 * esquerda, o resumo grudado à direita.
 */
export function GradeConteudoApoio({
  conteudo,
  apoio,
  apoioGrudado = true,
  className,
}: {
  conteudo: React.ReactNode;
  apoio: React.ReactNode;
  /** Mantém a coluna de apoio visível ao rolar no desktop. */
  apoioGrudado?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-3 lg:gap-10", className)}>
      <div className="min-w-0 lg:col-span-2">{conteudo}</div>
      <div className="min-w-0">
        <div className={cn(apoioGrudado && "lg:sticky lg:top-24")}>{apoio}</div>
      </div>
    </div>
  );
}

/* ============================================================================
   Trilho no celular, grade no resto

   Uma faixa de vitrine na home tem quatro cartões. Em coluna única de 390px
   isso vira quase 2.800px de rolagem só para dar uma amostra do catálogo — e
   quem chega pelo celular desiste antes de ver a assistência, que é o
   argumento comercial da JB.

   Espremer os cartões em duas colunas de 167px resolveria a altura e mataria
   a fotografia, que é justamente o que faz o equipamento parecer equipamento.
   Então abaixo de `sm` a faixa vira um trilho horizontal com encaixe: o cartão
   continua largo, a foto continua grande, e o pedaço do próximo cartão
   aparecendo na borda é o convite para arrastar.

   É rolagem nativa — sem biblioteca, sem botão, sem estado. O foco do teclado
   leva o trilho junto, e `prefers-reduced-motion` não tem nada a desligar.

   A margem negativa sangra o trilho até a borda da tela e o recuo interno
   devolve o alinhamento do primeiro cartão à coluna do texto. Os dois valores
   acompanham o `container-jb`: 1rem até 400px, 1.25rem daí em diante — que é
   toda a faixa em que o trilho existe.
   ============================================================================ */

export function TrilhoOuGrade({
  colunas,
  espaco = "md",
  como = "ul",
  className,
  children,
}: {
  colunas?: ColunasPorTela;
  espaco?: EspacoGrade;
  como?: "div" | "ul" | "ol";
  className?: string;
  children: React.ReactNode;
}) {
  const Elemento = como;
  const { base = 1, sm, md, lg, xl, xxl } = colunas ?? {};

  return (
    <Elemento
      className={cn(
        // trilho — só abaixo de sm
        "-mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-1",
        "min-[25rem]:-mx-5 min-[25rem]:scroll-px-5 min-[25rem]:px-5",
        "scrollbar-none",
        // cada peça ocupa quase a tela, deixando ver que há mais ao lado
        "[&>*]:w-[78vw] [&>*]:max-w-[19rem] [&>*]:shrink-0 [&>*]:snap-start",
        // grade — de sm para cima, exatamente como <Grade>
        "sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0",
        "sm:[&>*]:w-auto sm:[&>*]:max-w-none sm:[&>*]:shrink",
        BASE[base],
        sm && SM[sm],
        md && MD[md],
        lg && LG[lg],
        xl && XL[xl],
        xxl && XXL[xxl],
        ESPACOS[espaco],
        como !== "div" && "list-none p-0",
        className,
      )}
    >
      {children}
    </Elemento>
  );
}
