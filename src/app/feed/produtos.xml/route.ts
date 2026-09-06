import { cacheLife, cacheTag } from "next/cache";

import {
  feedXml,
  motivoDeExclusao,
  type CondicaoDoCatalogo,
  type ItemDoFeed,
} from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { SITE_URL, textoLimpo, urlAbsoluta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/* ============================================================================
   /feed/produtos.xml — o feed do Merchant Center

   Route Handler comum, servindo XML. O que ele tem de particular é o cache:
   preço e estoque mudam no painel, e um feed servido de cache velho anuncia
   um preço que a página não pratica — que é exatamente a divergência que
   suspende a conta.

   Por isso o escopo cacheado carrega a mesma etiqueta que a vitrine
   (`catalogo`), e `revalidarCatalogo` no painel já a derruba. Publicar,
   despublicar ou mudar preço reflete aqui na mesma ação que reflete no site.

   Consultado node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:
   com Cache Components, GET segue o mesmo modelo das rotas de UI — roda no
   pedido por padrão, e `use cache` é o que o torna prerenderizável.
   ============================================================================ */

/** Uma hora é o intervalo do resto da loja pública. A etiqueta é quem manda. */
async function xmlDoFeed() {
  "use cache";
  cacheTag("catalogo", "configuracoes");
  cacheLife("hours");

  const [s, produtos] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { updatedAt: "desc" },
      select: {
        sku: true,
        slug: true,
        name: true,
        shortDescription: true,
        description: true,
        priceCents: true,
        condition: true,
        allowDirectPurchase: true,
        trackInventory: true,
        stock: true,
        gtin: true,
        mpn: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        media: {
          orderBy: { order: "asc" },
          take: 11,
          select: { media: { select: { url: true } } },
        },
        /* O selo é do programa Seminovo JB Certificado e só existe em unidade
           publicada. Certificação em preparação ou revogada não vira rótulo
           de campanha: seria anunciar uma inspeção que ninguém liberou. */
        units: {
          where: { certification: { status: "publicada" } },
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);

  const itens: ItemDoFeed[] = [];

  for (const produto of produtos) {
    const fotos = produto.media
      .map((linha) => linha.media.url)
      .filter((url) => Boolean(url?.trim()))
      .map((url) => urlAbsoluta(url));

    const excluido = motivoDeExclusao({
      publicado: true,
      precoCents: produto.priceCents,
      compraDireta: produto.allowDirectPurchase,
      temImagem: fotos.length > 0,
    });
    if (excluido) continue;

    const [principal, ...extras] = fotos;

    itens.push({
      /* O SKU, não o id do banco: o identificador do feed precisa sobreviver
         a uma reimportação de catálogo. Trocar o id faz o destino tratar o
         produto como novo e perder o histórico do anúncio. */
      id: produto.sku,
      titulo: produto.name,
      descricao: textoLimpo(produto.shortDescription || produto.description, 5000),
      link: urlAbsoluta(`/loja/${produto.slug}`),
      imagem: principal,
      imagensExtras: extras,
      precoCents: produto.priceCents,
      disponivel: !produto.trackInventory || produto.stock > 0,
      condicao: produto.condition as CondicaoDoCatalogo,
      marca: produto.brand?.name,
      gtin: produto.gtin,
      mpn: produto.mpn,
      categoria: produto.category?.name,
      selo: produto.units.length > 0,
    });
  }

  return feedXml(
    { nome: s.empresa_nome, link: SITE_URL, descricao: s.seo_descricao },
    itens,
  );
}

export async function GET() {
  return new Response(await xmlDoFeed(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      /* O destino busca o arquivo periodicamente; deixar o CDN guardá-lo por
         uma hora poupa o banco sem atrasar correção de preço além do que a
         própria etiqueta já controla. */
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
