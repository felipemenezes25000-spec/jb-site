import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { dadosDaColecao } from "@/lib/catalogo";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/loja";
const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Loja" }];

/* ============================================================================
   /loja é o catálogo inteiro — e antes não era

   Esta rota mostrava `condicao: "novo"`, travada, com a condição removida dos
   parâmetros. Ou seja: era `/novos` com outro endereço. As duas páginas
   consultavam a mesma coisa, ordenavam igual e devolviam a mesma lista.

   O problema não era a duplicação, era o que a navegação prometia em cima
   dela. O mesmo destino tinha três nomes, e nenhum deles dizia "novos":

     · o menu do cabeçalho chamava de **"Loja"**, com a descrição "Produtos por
       categoria e condição" — condição no plural;
     · o rodapé chamava de **"Todos os produtos"**;
     · a trilha de TODA coleção — inclusive /seminovos, /usados,
       /recondicionados — tem "Loja" como o nível acima dela, o que só faz
       sentido se "Loja" contiver as quatro.

   Três promessas de escopo total levando a um recorte de uma condição. Quem
   clicava em "Todos os produtos" e contava 10 itens num catálogo de 12 não
   tinha como saber que faltavam os seminovos — eles não apareciam nem como
   filtro, porque a página travava a condição e apagava o parâmetro.

   Agora /loja é o que esses três rótulos dizem: tudo, com a condição
   disponível como filtro igual aos outros. `/novos` continua existindo e
   continua sendo o recorte de novos — ele é uma coleção por condição, como
   /seminovos, e a fileira de atalhos daqui leva a cada uma.

   Sai junto a pastilha "Seminovos revisados 2" que ficava no meio das
   categorias: ela era link para outra coleção com o número de OUTRA lista,
   desenhada igual às pastilhas de categoria desta. Os seminovos continuam a um
   clique, pela fileira de condições, onde o número é o da lista que abre.
   ============================================================================ */

export const metadata: Metadata = metadataDePagina({
  titulo: "Catálogo de equipamentos odontológicos",
  descricao:
    "Todo o catálogo da JB — novos, seminovos, recondicionados e usados — com informações técnicas organizadas, condições de pagamento e suporte antes e depois da compra.",
  caminho: CAMINHO,
});

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, colecao] = await Promise.all([
    searchParams,
    dadosDaColecao("todas"),
  ]);

  const total = colecao.categorias.reduce(
    (soma, categoria) => soma + categoria.quantidade,
    0,
  );

  const atalhos = [
    ...colecao.categorias.map((categoria) => ({
      rotulo: categoria.nome,
      href: categoria.href,
      quantidade: categoria.quantidade,
    })),
    { rotulo: "Todas as marcas", href: "/marcas" },
  ];

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Loja JB"
        titulo="Todos os produtos"
        descricao={`${
          total === 1 ? "1 produto publicado" : `${total} produtos publicados`
        } — novos, seminovos, recondicionados e usados — com informações técnicas, condições de pagamento e suporte da JB.`}
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        atalhos={atalhos}
        /* Não pode conter "Catálogo": a faixa vermelha do topo já é um
           landmark com esse nome, e dois marcos cujo nome casa deixam quem
           navega por landmark sem saber qual é qual — foi o que derrubou um
           teste que clicava no primeiro link do nome errado. O arquivo
           `barra-categorias.tsx` registra a mesma lição. */
        rotuloAtalhos="Categorias desta coleção"
      />
    </>
  );
}
