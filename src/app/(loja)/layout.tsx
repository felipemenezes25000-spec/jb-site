import { Suspense } from "react";

import { Cabecalho } from "@/components/loja/cabecalho";
import {
  AcessoDaConta,
  AcessoDaContaEsqueleto,
  ContadorDoCarrinho,
  ContadorDoCarrinhoEsqueleto,
} from "@/components/loja/cabecalho-pessoal";
import { Rodape } from "@/components/loja/rodape";
import { categoriasDoMenu, configuracoesPublicas } from "@/lib/loja-publica";

/**
 * Casca da loja pública.
 *
 * A leitura foi separada em duas naturezas, e essa separação é o ponto:
 *
 *   pública        configurações e categorias — iguais para todo mundo,
 *                  cacheadas com etiqueta em `@/lib/loja-publica`;
 *   personalizada  sessão e carrinho — lidas a cada requisição, dentro de
 *                  `<Suspense>`, em `cabecalho-pessoal.tsx`.
 *
 * Antes as quatro leituras estavam no mesmo `Promise.all`. Como duas delas
 * dependem de cookie, a casca inteira era dinâmica — e nenhuma página pública
 * tinha prerender, nem a home, nem a ficha de equipamento. Agora o logo, a
 * busca, o menu e o telefone chegam com a casca; a saudação e o contador
 * transmitem em seguida.
 *
 * O que NÃO pode voltar para cá: qualquer leitura de cookie no corpo deste
 * arquivo. Ela derrubaria a casca de novo, e sem erro visível — só o prerender
 * sumindo silenciosamente.
 */
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias] = await Promise.all([configuracoesPublicas(), categoriasDoMenu()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho
        categorias={categorias}
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
      />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Rodape />
    </div>
  );
}
