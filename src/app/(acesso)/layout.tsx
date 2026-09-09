import { Suspense } from "react";

import { Cabecalho } from "@/components/loja/cabecalho";
import {
  AcessoDaConta,
  AcessoDaContaEsqueleto,
  ContadorDoCarrinho,
  ContadorDoCarrinhoEsqueleto,
} from "@/components/loja/cabecalho-pessoal";
import {
  categoriasDoMenu,
  centralTemPublicacao,
  condicoesDoMenu,
  configuracoesPublicas,
} from "@/lib/loja-publica";
import { Rodape } from "@/components/loja/rodape";

/*
 * Migração para Cache Components, em etapas.
 *
 * `instant = false` diz ao Next para não validar que a navegação para esta
 * área produz UI instantânea — e é a saída documentada para migrar rota a
 * rota em vez de tudo de uma vez
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md).
 *
 * Esta área é autenticada e existe para operar dados que mudam a cada
 * segundo: pedido, chamado, estoque, agenda. Prerender parcial aqui não tem o
 * que economizar — a página inteira depende de quem está logado. O ganho de
 * PPR está na loja pública, e é lá que a migração foi feita de verdade.
 *
 * Registrado em docs/evolucao-jb/cobertura.md como pendência consciente, não
 * como conclusão.
 */
export const instant = false;


/**
 * Shell das telas de acesso — entrar, cadastro e recuperação de senha.
 *
 * É o mesmo cabeçalho e o mesmo rodapé da loja: quem entra ou se cadastra
 * continua dentro do site, com o carrinho e o telefone da JB à mão, nunca numa
 * tela solta de login.
 *
 * A Área da Clínica, depois do login, tem casca própria — o grupo `(conta)`.
 * A separação é só de layout: as URLs não mudam, porque grupo de rota entre
 * parênteses não entra no caminho.
 */
export default async function AcessoLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes, centralPublicada] = await Promise.all([
    configuracoesPublicas(),
    categoriasDoMenu(),
    condicoesDoMenu(),
    centralTemPublicacao(),
  ]);

  return (
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
      <main id="conteudo" className="flex-1">
        <div className="container-jb py-10 lg:py-16">{children}</div>
      </main>
      <Rodape />
    </div>
  );
}
