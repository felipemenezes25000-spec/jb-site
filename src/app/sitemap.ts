import type { MetadataRoute } from "next";

import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";
import { prisma } from "@/lib/prisma";
import { urlAbsoluta } from "@/lib/seo";

/**
 * Mapa do site.
 *
 * Desde que a JB virou só assistência técnica (22/09/2026), o site público é
 * pequeno: a home, uma página por equipamento, as páginas legais e o conteúdo
 * que a equipe publica (cases e artigos da Central Técnica). Produto, categoria
 * e marca saíram com a loja; as URLs antigas respondem 410 no `src/proxy.ts` e
 * não entram aqui.
 *
 * Rotas de código não ganham `lastModified` inventado com `new Date()`: dizer
 * ao buscador que oito páginas mudaram toda vez que o sitemap foi pedido é
 * ruído, não frescor. Datas aparecem somente quando vêm de uma publicação real
 * no banco. Cases e Central Técnica só entram quando têm conteúdo publicado.
 */

type Entrada = MetadataRoute.Sitemap[number];

/** Google recomenda no máximo 50.000 URLs por arquivo. */
const TETO_POR_TIPO = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mapa = new Map<string, Entrada>();

  const registrar = (caminho: string, entrada: Omit<Entrada, "url">) => {
    mapa.set(caminho, { url: urlAbsoluta(caminho), ...entrada });
  };

  registrar("/", { changeFrequency: "weekly", priority: 1 });

  /* Uma página por equipamento: é por elas que chega quem busca "conserto de
     autoclave" ou "compressor odontológico". */
  for (const pagina of PAGINAS_DE_EQUIPAMENTO) {
    registrar(`/${pagina.slug}`, { changeFrequency: "monthly", priority: 0.9 });
  }

  registrar("/privacidade", { changeFrequency: "yearly", priority: 0.2 });
  registrar("/termos", { changeFrequency: "yearly", priority: 0.2 });

  try {
    const [cases, artigos] = await Promise.all([
      prisma.techCase.findMany({
        where: { status: "publicado" },
        orderBy: { publishedAt: "desc" },
        take: TETO_POR_TIPO,
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
      prisma.article.findMany({
        where: { status: "publicado" },
        orderBy: { publishedAt: "desc" },
        take: TETO_POR_TIPO,
        select: {
          slug: true,
          updatedAt: true,
          reviewedAt: true,
          publishedAt: true,
          cover: { select: { url: true } },
        },
      }),
    ]);

    if (cases.length > 0) {
      registrar("/cases", {
        lastModified: cases[0].publishedAt ?? cases[0].updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
      for (const caso of cases) {
        registrar(`/cases/${caso.slug}`, {
          lastModified: caso.publishedAt ?? caso.updatedAt,
          changeFrequency: "yearly",
          priority: 0.5,
        });
      }
    }

    if (artigos.length > 0) {
      registrar("/central-tecnica", {
        lastModified: artigos[0].publishedAt ?? artigos[0].updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const artigo of artigos) {
      /* `lastModified` sai da data editorial real, não de `updatedAt`: uma
         correção de vírgula no painel não é revisão técnica. */
      registrar(`/central-tecnica/${artigo.slug}`, {
        lastModified: artigo.reviewedAt ?? artigo.publishedAt ?? artigo.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
        images: artigo.cover ? [urlAbsoluta(artigo.cover.url)] : undefined,
      });
    }
  } catch (erro) {
    // Banco fora do ar não pode devolver 500 no sitemap: as rotas fixas bastam.
    console.error("Falha ao montar o sitemap a partir do banco", erro);
  }

  return [...mapa.values()];
}
