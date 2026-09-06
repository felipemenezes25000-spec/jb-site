import type { MetadataRoute } from "next";

import {
  RODAPE_ASSISTENCIA,
  RODAPE_INSTITUCIONAL,
  RODAPE_LOJA,
  RODAPE_POLITICAS,
} from "@/lib/navegacao";
import { prisma } from "@/lib/prisma";
import { urlAbsoluta } from "@/lib/seo";

/**
 * Mapa do site.
 *
 * As rotas fixas saem da própria navegação (`@/lib/navegacao`), para o mapa não
 * envelhecer sozinho quando o rodapé muda. O resto vem do banco: só produto
 * ativo, só categoria e marca publicadas, e as páginas do CMS.
 *
 * Nada de área logada aqui — /minha-jb, /checkout e /admin ficam de fora, como
 * no robots.txt.
 */

export const revalidate = 3600;

type Entrada = MetadataRoute.Sitemap[number];

/** Google recomenda no máximo 50.000 URLs por arquivo. */
const TETO_POR_TIPO = 5000;

const PRIVADAS = ["/admin", "/minha-jb", "/checkout", "/carrinho", "/entrar", "/api"];

/**
 * Endereços que existem em `Page` mas não devem ser indexados.
 *
 * `/empresa` é redirecionado para `/sobre` em `next.config.ts` — anunciar no
 * sitemap uma URL que responde 308 gasta orçamento de rastreamento e sinaliza
 * conteúdo duplicado. O registro continua no banco; só não é anunciado.
 *
 * Esta lista precisa andar junto com `redirects()` do `next.config.ts`.
 */
const REDIRECIONADAS = new Set(["/empresa"]);

function ehPublica(href: string) {
  if (!href.startsWith("/")) return false;
  if (href.includes("#") || href.includes("?")) return false;
  if (REDIRECIONADAS.has(href)) return false;
  return !PRIVADAS.some((rota) => href === rota || href.startsWith(`${rota}/`));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();
  const mapa = new Map<string, Entrada>();

  const registrar = (caminho: string, entrada: Omit<Entrada, "url">) => {
    mapa.set(caminho, { url: urlAbsoluta(caminho), ...entrada });
  };

  registrar("/", { lastModified: agora, changeFrequency: "daily", priority: 1 });

  const fixas = [
    ...RODAPE_LOJA,
    ...RODAPE_ASSISTENCIA,
    ...RODAPE_INSTITUCIONAL,
    ...RODAPE_POLITICAS,
  ];

  for (const item of fixas) {
    if (!ehPublica(item.href) || mapa.has(item.href)) continue;
    registrar(item.href, {
      lastModified: agora,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  try {
    const [produtos, categorias, marcas, paginas] = await Promise.all([
      prisma.product.findMany({
        where: { status: "active" },
        orderBy: { updatedAt: "desc" },
        take: TETO_POR_TIPO,
        select: {
          slug: true,
          updatedAt: true,
          media: {
            orderBy: { order: "asc" },
            take: 1,
            select: { media: { select: { url: true } } },
          },
        },
      }),
      prisma.category.findMany({
        where: { published: true },
        orderBy: { order: "asc" },
        take: TETO_POR_TIPO,
        select: { slug: true, updatedAt: true },
      }),
      prisma.brand.findMany({
        where: { published: true },
        orderBy: { order: "asc" },
        take: TETO_POR_TIPO,
        select: { slug: true, updatedAt: true },
      }),
      /* Page não tem coluna de publicação: toda página cadastrada está no ar.
         O corpo entra no `select` para o mapa não anunciar página em branco —
         `/solucoes` existe no banco desde a migração do PHP com corpo vazio, e
         uma URL que renderiza estado vazio não é conteúdo indexável. */
      prisma.page.findMany({
        take: TETO_POR_TIPO,
        select: { slug: true, updatedAt: true, body: true },
      }),
    ]);

    for (const produto of produtos) {
      const capa = produto.media[0]?.media.url;
      registrar(`/loja/${produto.slug}`, {
        lastModified: produto.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        images: capa ? [urlAbsoluta(capa)] : undefined,
      });
    }

    for (const categoria of categorias) {
      registrar(`/categoria/${categoria.slug}`, {
        lastModified: categoria.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const marca of marcas) {
      registrar(`/marcas/${marca.slug}`, {
        lastModified: marca.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // páginas do CMS moram na raiz (/sobre, /privacidade…) e sobrescrevem a
    // entrada fixa correspondente, porque trazem a data real de atualização
    for (const pagina of paginas) {
      const caminho = `/${pagina.slug}`;
      if (!ehPublica(caminho)) continue;
      if (pagina.body.trim().length === 0) continue;
      registrar(caminho, {
        lastModified: pagina.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (erro) {
    // banco fora do ar não pode devolver 500 no sitemap: as rotas fixas bastam
    console.error("Falha ao montar o sitemap a partir do banco", erro);
  }

  return [...mapa.values()];
}
