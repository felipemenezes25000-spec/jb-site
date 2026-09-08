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
import { categoriasDoMenu, condicoesDoMenu, configuracoesPublicas } from "@/lib/loja-publica";

import "./vitrine.css";

/**
 * Casca das telas de catálogo.
 *
 * É a MESMA casca da loja — mesmo cabeçalho, mesmo rodapé, mesmo comparador.
 * O grupo de rota existe pelo acabamento das listas (`vitrine.css`) e pela
 * densidade do catálogo, não para uma segunda identidade visual.
 *
 * Ele já teve cromo próprio, preto, copiado de um protótipo. Durou pouco: numa
 * tela inteira, fundo escuro com texto branco cansa e ainda briga com a foto
 * do equipamento, que é clara sobre branco. O preto voltou a ser o que o
 * design system sempre disse — bloco pontual, nunca a moldura do site.
 */
export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes] = await Promise.all([
    configuracoesPublicas(),
    categoriasDoMenu(),
    condicoesDoMenu(),
  ]);

  return (
    <ComparadorProvider>
      <div className="flex min-h-dvh flex-col [&>header_.container-jb]:max-w-[112rem]">
        <Cabecalho
          categorias={categorias}
          condicoes={condicoes}
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
