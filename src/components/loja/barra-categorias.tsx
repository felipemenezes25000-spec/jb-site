import Link from "next/link";

import type { CategoriaDoMenu } from "@/lib/loja-publica";

/* ============================================================================
   Barra vermelha de categorias

   A faixa que fica logo abaixo do cabeçalho e leva direto para cada tipo de
   equipamento. É o elemento de identidade mais visível do desenho: a única
   área grande de vermelho da loja, e por isso a única que pode ser grande —
   ela é navegação, não preenchimento.

   Três decisões que valem registro:

   · **Só a partir de 1280px.** O protótipo mostra a faixa a partir de 1024,
     e medido aqui ela vazava: com "Todo o catálogo", cinco categorias e
     "Seminovos revisados", a linha pedia 1191px numa janela de 1024 e punha
     rolagem lateral em toda rota da loja. A 1280 ela termina em 1240.
     Abaixo disso os mesmos destinos estão no menu do cabeçalho.
   · **Sem seta de menu.** O protótipo desenha uma seta ao lado de cada
     categoria porque abre um mega menu ali. Aqui o mega menu já existe no
     cabeçalho, um nível acima: repetir seria duas portas para a mesma sala.
     No lugar da seta vai a contagem, que é informação de verdade.
   · **`jb-500` com texto branco dá 4,91:1**, e `jb-600` do hover dá 6,14:1 —
     os dois cumprem AA para texto normal.
   ============================================================================ */

/**
 * Quantas categorias a faixa carrega.
 *
 * A faixa é uma linha só, sem quebra e sem rolagem — as duas saídas para
 * "não coube" estragam o desenho de formas diferentes. Então o limite tem de
 * ser de conteúdo. Com as sete do catálogo a faixa vazava até em 1440px e
 * cortava "Seminovos revisados"; com cinco cabe a partir de 1280.
 *
 * O corte respeita a ordem cadastrada no painel — quem decide quais cinco
 * aparecem é a equipe, mexendo em `order`. As demais continuam no mega menu do
 * cabeçalho e em "Todo o catálogo", que abre a lista inteira.
 */
const CABEM_NA_FAIXA = 5;

export function BarraDeCategorias({ categorias }: { categorias: CategoriaDoMenu[] }) {
  if (categorias.length === 0) return null;
  const naFaixa = categorias.slice(0, CABEM_NA_FAIXA);

  return (
    /* "Catálogo", não "Categorias": a casca de coleção já tem uma navegação
       chamada "Categorias" — a de filtro, dentro da página. Dois landmarks com
       o mesmo nome deixam quem navega por marco sem saber qual é qual, e
       derrubaram um teste que clicava no primeiro link do nome errado. */
    <nav aria-label="Catálogo" className="hidden bg-jb-500 xl:block">
      <div className="container-jb flex items-stretch">
        <Link
          href="/loja"
          className="foco-jb inline-flex min-h-11 items-center px-4 text-[0.75rem] font-black tracking-wider whitespace-nowrap text-white uppercase transition-colors hover:bg-jb-600"
        >
          Todo o catálogo
        </Link>

        {naFaixa.map((categoria) => (
          <Link
            key={categoria.slug}
            href={`/categoria/${categoria.slug}`}
            className="foco-jb inline-flex min-h-11 items-center gap-1.5 px-4 text-[0.75rem] font-bold tracking-wider whitespace-nowrap text-white uppercase transition-colors hover:bg-jb-600"
          >
            {categoria.name}
            {categoria.count > 0 ? (
              <span className="tabular font-normal text-white/70">{categoria.count}</span>
            ) : null}
          </Link>
        ))}

        <Link
          href="/seminovos"
          className="foco-jb ml-auto inline-flex min-h-11 items-center px-4 text-[0.75rem] font-black tracking-wider whitespace-nowrap text-white uppercase transition-colors hover:bg-jb-600"
        >
          Seminovos revisados
        </Link>
      </div>
    </nav>
  );
}
