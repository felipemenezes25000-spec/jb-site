import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSettings, type SettingsMap } from "@/lib/settings";
import { CONDICOES } from "@/lib/navegacao";
import { contagemDoCatalogo } from "@/domain/counts";

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
/** Publicações da Central Técnica. */
export const ETIQUETA_CENTRAL = "central-tecnica";

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
  /* A contagem vem de `contagemDoCatalogo`, a mesma que a home e as coleções
     usam. Antes esta função tinha a própria consulta, com um recorte
     ligeiramente diferente — `status: "active"` e nada mais —, e por isso a
     barra vermelha dizia "BIOSSEGURANÇA 4" enquanto a coleção logo abaixo
     dizia "Biossegurança 3": a barra contava a unidade seminova já vendida, a
     coleção não. Dois números certos sobre recortes diferentes continuam sendo
     dois números diferentes na mesma tela.

     O destino destes itens é `/categoria/[slug]`, que mostra TODAS as
     condições — então o recorte aqui é o catálogo inteiro, e o número bate com
     o que a pessoa encontra do outro lado do clique. */
  const contagem = await contagemDoCatalogo();

  return contagem.categorias.map((categoria) => ({
    slug: categoria.slug,
    name: categoria.nome,
    count: categoria.total,
  }));
}

/**
 * A Central Técnica tem texto no ar?
 *
 * O menu do cabeçalho reserva um dos cinco lugares para ela, e a auditoria de
 * 08/09/2026 encontrou a página sem nenhuma publicação: o item prometia
 * conteúdo e entregava um aviso de que ainda não há conteúdo — exatamente o
 * que `categoriasDoMenu` já evita fazer com categoria sem equipamento.
 *
 * Enquanto estiver vazia, ela sai da direção principal e continua no rodapé,
 * onde é referência e não promessa. Volta sozinha na primeira publicação.
 */
export async function centralTemPublicacao(): Promise<boolean> {
  "use cache";
  cacheTag(ETIQUETA_CENTRAL);
  cacheLife("hours");

  try {
    const publicados = await prisma.article.count({ where: { status: "publicado" } });
    return publicados > 0;
  } catch {
    /* Sem banco, o menu segue como sempre foi. Esconder um item por causa de
       uma falha de leitura seria trocar um problema de conteúdo por um de
       navegação. */
    return true;
  }
}
