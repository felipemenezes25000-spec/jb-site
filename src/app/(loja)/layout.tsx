import { Suspense } from "react";

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

import "./catalogo-premium.css";

/**
 * Casca da loja pública.
 *
 * A leitura pública continua separada da personalizada. O seletor no elemento
 * raiz só amplia o container do header em monitores largos; não cria um novo
 * ancestral em torno do `header`, então o comportamento sticky continua
 * funcionando normalmente.
 */
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes, centralPublicada] = await Promise.all([
    configuracoesPublicas(),
    categoriasDoMenu(),
    condicoesDoMenu(),
    centralTemPublicacao(),
  ]);

  return (
    <ComparadorProvider>
      <div className="flex min-h-dvh flex-col [&>header_.container-jb]:max-w-[112rem]">
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
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Rodape />
        <BarraComparar />
      </div>
    </ComparadorProvider>
  );
}
