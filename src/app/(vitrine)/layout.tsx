import { Suspense } from "react";

import { CabecalhoVitrine } from "@/components/loja/cabecalho-vitrine";
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

import "./vitrine.css";

/**
 * Casca das telas de catálogo.
 *
 * A home recebe um cabeçalho estrutural próprio, selecionado no cliente pela
 * rota atual. As demais páginas continuam usando o cabeçalho compartilhado da
 * loja, sem herdar a direção flagship da página inicial.
 */
export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes, centralPublicada] = await Promise.all([
    configuracoesPublicas(),
    categoriasDoMenu(),
    condicoesDoMenu(),
    centralTemPublicacao(),
  ]);

  return (
    <ComparadorProvider>
      <div className="flex min-h-dvh flex-col [&>header_.container-jb]:max-w-[112rem]">
        <CabecalhoVitrine
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

        <main id="conteudo" className="flex-1">
          {children}
        </main>

        <Rodape />
        <BarraComparar />
      </div>
    </ComparadorProvider>
  );
}
