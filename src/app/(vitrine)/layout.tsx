import { Suspense } from "react";

import {
  AcessoDaConta,
  AcessoDaContaEsqueleto,
  ContadorDoCarrinho,
  ContadorDoCarrinhoEsqueleto,
} from "@/components/loja/cabecalho-pessoal";
import { CabecalhoVitrine, RodapeVitrine } from "@/components/loja/chrome-vitrine";
import { BarraComparar, ComparadorProvider } from "@/components/loja/comparador-cliente";
import { categoriasDoMenu, configuracoesPublicas } from "@/lib/loja-publica";

import "./vitrine.css";

/**
 * Casca da vitrine.
 *
 * É a mesma casca da loja — comparador, conta, carrinho, categorias reais do
 * banco — vestida com o cromo preto. Existe como grupo de rota próprio, e não
 * como classe CSS por cima do cabeçalho branco, porque cabeçalho é componente:
 * trocar a cor dele por sobrescrita deixaria a marcação antiga no HTML e a
 * regra nova brigando com ela em cada botão.
 *
 * Enquanto a migração acontece, só o catálogo mora aqui. As demais páginas
 * públicas seguem na casca clara, e as duas convivem sem se ver.
 */
export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias] = await Promise.all([configuracoesPublicas(), categoriasDoMenu()]);

  return (
    <ComparadorProvider>
      <div className="flex min-h-dvh flex-col bg-surface-muted">
        <CabecalhoVitrine
          categorias={categorias}
          telefone={s.telefone}
          whatsapp={s.whatsapp}
          horario={s.horario}
          acessoDaConta={
            <Suspense fallback={<AcessoDaContaEsqueleto tom="escuro" />}>
              <AcessoDaConta tom="escuro" />
            </Suspense>
          }
          contadorDoCarrinho={
            <Suspense fallback={<ContadorDoCarrinhoEsqueleto tom="escuro" />}>
              <ContadorDoCarrinho tom="escuro" />
            </Suspense>
          }
        />

        <main id="conteudo" className="flex-1">
          {children}
        </main>

        <RodapeVitrine />
        <BarraComparar />
      </div>
    </ComparadorProvider>
  );
}
