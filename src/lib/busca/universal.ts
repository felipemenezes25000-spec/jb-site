import "server-only";

import { sessaoCliente } from "@/lib/auth-cliente";
import type { ProdutoMarketplaceCard } from "@/components/loja/marketplace/tipos";
import { detectarIntencao, termosDaBusca, type Intencao } from "@/lib/busca/intencao";
import {
  paraCardMarketplace,
  PUBLICADO,
  SELECAO_CARD_MARKETPLACE,
} from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Busca universal — as consultas

   Quatro grupos, quatro consultas, e uma regra de isolamento que vale para
   uma delas: **equipamento só aparece para o dono.** O `where` de
   `meusEquipamentos` filtra por `customerId` da sessão, e a função devolve
   lista vazia sem sessão — não há caminho em que o id do cliente venha do
   navegador.

   Só conteúdo publicado entra: artigo em rascunho, case sem autorização e
   produto não ativo ficam de fora, e isso não é filtro de relevância — é a
   mesma regra que impede o rascunho de aparecer no sitemap.
   ============================================================================ */

const TETO_POR_GRUPO = 6;

/**
 * O achado de produto É o cartão do catálogo.
 *
 * Antes esta busca tinha um recorte próprio — slug, nome, preço, condição e
 * uma miniatura de 64px — e desenhava uma linha estreita para cada resultado.
 * Duas telas com dois desenhos para a mesma coisa fazem o comprador achar que
 * são coisas diferentes: a foto pequena parecia item de lista, não equipamento.
 * Agora a busca devolve o mesmo `ProdutoCard` da vitrine, e a página usa a
 * mesma grade.
 */
export type AchadoDeProduto = ProdutoMarketplaceCard;

export type AchadoDeConteudo = {
  slug: string;
  titulo: string;
  chamada: string;
  tema: string;
};

export type AchadoDeServico = {
  href: string;
  titulo: string;
  descricao: string;
};

export type AchadoDeEquipamento = {
  id: string;
  nome: string;
  marca: string;
  modelo: string;
  situacao: string;
};

export type ResultadoUniversal = {
  intencao: Intencao;
  temSessao: boolean;
  produtos: AchadoDeProduto[];
  conteudo: AchadoDeConteudo[];
  servicos: AchadoDeServico[];
  meusEquipamentos: AchadoDeEquipamento[];
  total: number;
};

/** Monta o `OR` de `contains` para uma lista de termos e uma lista de campos. */
function ou(termos: string[], campos: string[]) {
  return termos.flatMap((termo) =>
    campos.map((campo) => ({ [campo]: { contains: termo, mode: "insensitive" as const } })),
  );
}

export async function buscarTudo(consulta: string): Promise<ResultadoUniversal> {
  const cliente = await sessaoCliente();
  const temSessao = Boolean(cliente);
  const intencao = detectarIntencao(consulta, temSessao);
  const termos = termosDaBusca(consulta);

  const [produtos, artigos, servicos, equipamentos] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...PUBLICADO,
        OR: ou(termos, ["name", "shortDescription", "model", "sku"]),
      },
      orderBy: { featured: "desc" },
      take: TETO_POR_GRUPO,
      select: SELECAO_CARD_MARKETPLACE,
    }),

    /* Só publicado. Rascunho da Central não existe para a busca, pelo mesmo
       motivo que não existe para o sitemap: ninguém assinou aquele texto. */
    prisma.article.findMany({
      where: {
        status: "publicado",
        OR: ou(termos, ["title", "lead"]),
      },
      orderBy: { publishedAt: "desc" },
      take: TETO_POR_GRUPO,
      select: { slug: true, title: true, lead: true, topic: true },
    }),

    prisma.service.findMany({
      where: {
        published: true,
        OR: ou(termos, ["name", "description"]),
      },
      take: TETO_POR_GRUPO,
      select: { slug: true, name: true, description: true },
    }),

    /* O isolamento por conta. Sem sessão, a consulta nem roda — e com sessão,
       o `customerId` vem do cookie assinado, nunca de parâmetro. */
    cliente
      ? prisma.equipment.findMany({
          where: {
            customerId: cliente.id,
            OR: ou(termos, ["name", "brandName", "modelName", "serialNumber"]),
          },
          take: TETO_POR_GRUPO,
          select: {
            id: true,
            name: true,
            brandName: true,
            modelName: true,
            status: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const resultado: ResultadoUniversal = {
    intencao,
    temSessao,
    produtos: produtos.map(paraCardMarketplace),
    conteudo: artigos.map((artigo) => ({
      slug: artigo.slug,
      titulo: artigo.title,
      chamada: artigo.lead,
      tema: artigo.topic,
    })),
    servicos: servicos.map((servico) => ({
      href: `/servicos/${servico.slug}`,
      titulo: servico.name,
      descricao: servico.description,
    })),
    meusEquipamentos: equipamentos.map((equipamento) => ({
      id: equipamento.id,
      nome: equipamento.name,
      marca: equipamento.brandName,
      modelo: equipamento.modelName,
      situacao: equipamento.status,
    })),
    total: 0,
  };

  resultado.total =
    resultado.produtos.length +
    resultado.conteudo.length +
    resultado.servicos.length +
    resultado.meusEquipamentos.length;

  return resultado;
}
