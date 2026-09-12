import { Suspense } from "react";

import { BarraDeCategorias } from "@/components/loja/barra-categorias";
import { Cabecalho } from "@/components/loja/cabecalho";
import {
  AcessoDaConta,
  AcessoDaContaEsqueleto,
  ContadorDoCarrinho,
  ContadorDoCarrinhoEsqueleto,
} from "@/components/loja/cabecalho-pessoal";
import { BarraComparar, ComparadorProvider } from "@/components/loja/comparador-cliente";
import { Rodape } from "@/components/loja/rodape";
import {
  categoriasDoMenu,
  centralTemPublicacao,
  condicoesDoMenu,
  configuracoesPublicas,
} from "@/lib/loja-publica";

/* ============================================================================
   Casca da loja pública

   Cabeçalho, barra de departamentos, conteúdo, rodapé e a barra do comparador.

   Ela existia duas vezes. `(loja)/layout.tsx` e `(vitrine)/layout.tsx` eram o
   MESMO arquivo — idênticos byte a byte, salvo o nome da função e um
   comentário. Os dois grupos de rota existiam para carregar folhas de estilo
   diferentes (`catalogo-premium.css` e `vitrine.css`); as duas folhas foram
   removidas por não casarem com nenhum elemento da marcação atual, e o que
   sobrou foram duas cópias da mesma casca, cada uma podendo ser corrigida sem
   a outra.

   Os dois grupos de rota continuam existindo — mover 40 diretórios de página
   é risco sem ganho —, mas agora os dois renderizam esta peça.
   ============================================================================ */

export async function CascaPublica({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes, centralPublicada] = await Promise.all([
    configuracoesPublicas(),
    categoriasDoMenu(),
    condicoesDoMenu(),
    centralTemPublicacao(),
  ]);

  return (
    <ComparadorProvider>
      <div data-jb-publico="true" className="flex min-h-dvh flex-col">
        <Cabecalho
          categorias={categorias}
          condicoes={condicoes}
          centralPublicada={centralPublicada}
          acessoDaConta={
            <Suspense fallback={<AcessoDaContaEsqueleto />}>
              <AcessoDaConta />
            </Suspense>
          }
          contadorDoCarrinho={
            <Suspense fallback={<ContadorDoCarrinhoEsqueleto />}>
              <ContadorDoCarrinho />
            </Suspense>
          }
          telefone={s.telefone}
          whatsapp={s.whatsapp}
          horario={s.horario}
          desde={s.empresa_desde}
          cidade={s.endereco_cidade}
        />

        <BarraDeCategorias categorias={categorias} />

        <main id="conteudo" className="flex-1">
          {children}
        </main>

        <Rodape />
        <BarraComparar />
      </div>
    </ComparadorProvider>
  );
}
