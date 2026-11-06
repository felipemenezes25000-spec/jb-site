import { Fragment } from "react";

import { PORTFOLIO_DE_ASSISTENCIA } from "@/lib/portfolio-assistencia";

/* ============================================================================
   Os equipamentos atravessando a tela

   Duas fileiras de nomes enormes, uma para cada lado, que andam com a
   rolagem — e só com ela. Parou de rolar, parou de andar: não é marquise nem
   laço, é a página respondendo à mão (`animation-timeline: view()`, em
   `site.css`). Sem suporte ou com movimento reduzido, fica parada.

   É moldura, não conteúdo: os mesmos equipamentos estão na grade logo abaixo,
   com nome e foto. Por isso `aria-hidden` e nenhum link aqui dentro.
   ============================================================================ */

const NOMES = PORTFOLIO_DE_ASSISTENCIA.map((item) => item.nome.replace(/ odontológic[oa]$/, ""));
const METADE = Math.ceil(NOMES.length / 2);
const FILEIRAS = [NOMES.slice(0, METADE), [...NOMES.slice(METADE), "Todas as marcas"]] as const;

function Fileira({ nomes, sentido }: { nomes: readonly string[]; sentido: "ida" | "volta" }) {
  /* Repetida para sobrar texto dos dois lados durante todo o percurso. */
  const repetidos = [...nomes, ...nomes];
  return (
    <span className="jb-rolagem-fileira" data-sentido={sentido}>
      {repetidos.map((nome, indice) => (
        <Fragment key={`${nome}-${indice}`}>
          <span className="jb-rolagem-nome" data-cheio={indice % 3 === 1 || undefined}>
            {nome}
          </span>
          <span className="jb-rolagem-marca" />
        </Fragment>
      ))}
    </span>
  );
}

export function FaixaDeRolagem() {
  return (
    <div aria-hidden className="jb-rolagem">
      <Fileira nomes={FILEIRAS[0]} sentido="ida" />
      <Fileira nomes={FILEIRAS[1]} sentido="volta" />
    </div>
  );
}
