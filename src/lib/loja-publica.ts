import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSettings, type SettingsMap } from "@/lib/settings";
import { CONDICOES } from "@/lib/navegacao";

/* ============================================================================
   Os dados públicos da casca da loja

   O que entra aqui: informação igual para todo mundo — configurações da loja,
   categorias publicadas. O que NUNCA entra: sessão, carrinho, equipamento,
   documento, qualquer coisa que dependa de quem está do outro lado. Um cache
   compartilhado com dado de uma pessoa serve essa pessoa para a próxima.

   Por que existe: com `cacheComponents` ligado, buscar dado é dinâmico por
   padrão e o que se marca é o que pode ser guardado. Sem um lugar como este,
   cada página repetiria a mesma consulta de categorias a cada requisição.

   A regra da documentação instalada, que dita o formato deste arquivo:
   cookies e headers precisam ser lidos FORA do escopo cacheado e passados
   como argumento (`use-cache.md`). Por isso nenhuma função daqui recebe
   requisição — elas não sabem que existe alguém do outro lado, e é essa
   ignorância que as torna cacheáveis com segurança.

   Invalidação por etiqueta: quem edita configuração ou categoria no painel
   chama `revalidateTag` com a etiqueta correspondente. Sem isso, uma mudança
   de telefone no painel demoraria até a validade expirar para aparecer.
   ============================================================================ */

export const ETIQUETA_CONFIGURACOES = "configuracoes";
export const ETIQUETA_CATEGORIAS = "categorias";
/** Produto, marca e vitrine — tudo que muda quando o catálogo muda. */
export const ETIQUETA_CATALOGO = "catalogo";

export type CategoriaDoMenu = {
  slug: string;
  name: string;
  count: number;
};

/**
 * Configurações públicas da loja.
 *
 * `getSettings` já é memoizado por requisição com o `cache` do React; aqui o
 * cache atravessa requisições. Uma hora de validade é folgada de propósito:
 * telefone e horário mudam raramente, e a etiqueta derruba o cache na hora em
 * que alguém salva no painel.
 */
export async function configuracoesPublicas(): Promise<SettingsMap> {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");
  return getSettings();
}

/**
 * As categorias do menu, com quantos produtos ativos cada uma tem.
 *
 * A contagem entra no cache junto: ela muda quando um produto é publicado ou
 * arquivado, e essas duas ações invalidam a etiqueta.
 */
/**
 * As condições que têm equipamento publicado.
 *
 * O menu listava as quatro sempre, e "Usados" e "Recondicionados" levavam a
 * uma página que só sabia dizer "Nada publicado aqui ainda". Menu não é
 * declaração de intenção: cada item promete que existe algo do outro lado, e
 * quem clica e não encontra nada aprende a não clicar mais.
 *
 * Some por si só quando o estoque acaba, e volta sozinho quando entrar o
 * primeiro equipamento daquela condição — nada para lembrar de ligar depois.
 */
export type CondicaoDoMenu = {
  slug: string;
  rotulo: string;
  valor: string;
  total: number;
};

export async function condicoesDoMenu(): Promise<CondicaoDoMenu[]> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  cacheLife("hours");

  const linhas = await prisma.product.groupBy({
    by: ["condition"],
    where: { status: "active" },
    _count: { _all: true },
  });

  const comProduto = new Map(linhas.map((linha) => [linha.condition, linha._count._all]));

  return CONDICOES.flatMap((condicao) => {
    const total = comProduto.get(condicao.valor) ?? 0;
    return total > 0 ? [{ ...condicao, total }] : [];
  });
}

export async function categoriasDoMenu(): Promise<CategoriaDoMenu[]> {
  "use cache";
  cacheTag(ETIQUETA_CATEGORIAS);
  cacheLife("hours");

  /* Só categoria com equipamento publicado. "Estética" e "Outros periféricos"
     existem no cadastro sem nenhum produto, e apareciam no mega menu levando a
     uma página que só sabia dizer "Nada publicado aqui ainda" — item de menu
     promete que existe algo do outro lado. Voltam sozinhas quando entrar o
     primeiro equipamento delas. */
  const linhas = await prisma.category.findMany({
    where: {
      published: true,
      parentId: null,
      products: { some: { status: "active" } },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { status: "active" } } } },
    },
  });

  return linhas.map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }));
}
