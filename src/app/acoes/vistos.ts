"use server";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { paraCard, PUBLICADO, SELECAO_CARD } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { paraCentavos } from "@/lib/format";

/* ============================================================================
   Equipamentos vistos recentemente

   A lista de quem viu o quê mora no navegador (ver `vistos-recentemente.tsx`),
   e mora lá por escolha: é histórico de navegação, não é dado da clínica, e
   guardar histórico de navegação de visitante no banco é criar um registro
   pessoal que ninguém pediu para criar.

   O que NÃO pode morar no navegador é o preço. Preço guardado no `localStorage`
   envelhece: a pessoa volta uma semana depois e a tira "vistos recentemente"
   mostra o valor de antes do reajuste — e valor exibido vincula quem anuncia.
   Por isso o navegador guarda só o `slug`, e é esta ação que devolve o cartão
   com preço, estoque e condição de agora.

   Só produto publicado volta. Slug que saiu do ar simplesmente não aparece na
   resposta, e a tira encolhe.
   ========================================================================== */

const TETO = 12;

export type VistosRecentes = {
  produtos: ProdutoCard[];
  parcelamento: { max: number; minimoCents: number };
};

export async function cartoesVistos(slugs: string[]): Promise<VistosRecentes> {
  const pedidos = [...new Set(slugs.filter((slug) => typeof slug === "string"))]
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0 && slug.length <= 200)
    .slice(0, TETO);

  if (pedidos.length === 0) {
    return { produtos: [], parcelamento: { max: 1, minimoCents: 0 } };
  }

  const [linhas, s] = await Promise.all([
    prisma.product.findMany({
      where: { ...PUBLICADO, slug: { in: pedidos } },
      select: SELECAO_CARD,
    }),
    getSettings(),
  ]);

  /* A ordem que importa é a da visita, não a do banco: o último equipamento
     visto vem primeiro, porque é o que a pessoa estava avaliando. */
  const porSlug = new Map(linhas.map((linha) => [linha.slug, linha]));

  return {
    produtos: pedidos
      .map((slug) => porSlug.get(slug))
      .filter((linha): linha is (typeof linhas)[number] => linha !== undefined)
      .map(paraCard),
    parcelamento: {
      max: Math.min(12, Math.max(1, Number(s.parcelas_max) || 1)),
      minimoCents: paraCentavos(s.parcela_minima),
    },
  };
}
