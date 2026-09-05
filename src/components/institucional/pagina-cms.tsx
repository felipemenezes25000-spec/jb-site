import "server-only";

import { cache } from "react";
import Image from "next/image";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nl2brHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

/* ============================================================================
   Conteúdo vindo do CMS (modelo Page)

   O corpo das páginas institucionais foi migrado do site anterior e continua
   editável no painel. Vale a regra combinada para todas as rotas fixas deste
   diretório: quando existe registro em `Page` com o mesmo slug, o texto dele
   manda; a rota fixa só fornece o esqueleto e o conteúdo padrão.

   `carregarPaginaCms` é embrulhado em `cache()` do React porque a mesma
   página é lida duas vezes por requisição — uma em `generateMetadata`, outra
   no componente — e não faz sentido ir ao banco duas vezes.
   ============================================================================ */

const SELECAO = {
  slug: true,
  title: true,
  eyebrow: true,
  lead: true,
  body: true,
  videoId: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
  cover: { select: { url: true, alt: true, width: true, height: true } },
  gallery: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      caption: true,
      media: { select: { url: true, alt: true, width: true, height: true } },
    },
  },
} satisfies Prisma.PageSelect;

export type PaginaCms = Prisma.PageGetPayload<{ select: typeof SELECAO }>;

export const carregarPaginaCms = cache(async (slug: string): Promise<PaginaCms | null> => {
  const limpo = slug.trim().toLowerCase();
  if (!limpo) return null;
  try {
    return await prisma.page.findUnique({ where: { slug: limpo }, select: SELECAO });
  } catch (erro) {
    // O banco fora do ar não pode derrubar uma página institucional inteira:
    // sem registro, a rota fixa cai no próprio conteúdo padrão.
    console.error("Falha ao carregar página do CMS", erro);
    return null;
  }
});

/* ---------------------------------------------------------------- limpeza */

const BLOCOS = /<(p|div|ul|ol|li|h[1-6]|table|br|section|article)\b/i;

/**
 * Defesa em profundidade sobre um texto que só a equipe consegue gravar.
 * Tira script, style, iframe, atributo de evento e `javascript:` do href —
 * o resto da marcação do editor passa intacto e é estilizado por `.prose-jb`.
 * O vídeo e o mapa têm componentes próprios; nada de iframe solto no corpo.
 */
export function limparHtml(html: string) {
  const seguro = (html ?? "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<\/?(iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');

  return removerBlocosVazios(seguro);
}

/**
 * O conteúdo migrado do site antigo vem cheio de `<div>&nbsp;</div>` e
 * `<div><strong></strong></div>`, usados lá como espaçador. Aqui o respiro
 * entre parágrafos é do CSS, então esses blocos só produzem buracos. Três
 * passadas dão conta do aninhamento que existe no conteúdo real.
 */
function removerBlocosVazios(html: string) {
  const vazio =
    /<(p|div)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>|<(?:strong|em|b|i|span)\b[^>]*>\s*<\/(?:strong|em|b|i|span)>)*<\/\1\s*>/gi;

  let atual = html;
  for (let passada = 0; passada < 3; passada++) {
    const proximo = atual.replace(vazio, "");
    if (proximo === atual) break;
    atual = proximo;
  }
  return atual;
}

/** Só considera conteúdo o que sobra depois de tirar marcação e espaço. */
export function temTexto(html: string | null | undefined) {
  return (
    (html ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0
  );
}

/* ------------------------------------------------------------- renderização */

/**
 * Imagem gravada no banco. O caminho local passa pelo otimizador do Next;
 * URL absoluta (Vercel Blob, por exemplo) sai como `img` comum, porque
 * `next.config.ts` não declara `images.remotePatterns` e o otimizador
 * recusaria o domínio.
 */
export function ImagemDoBanco({
  url,
  alt,
  largura,
  altura,
  className,
  prioridade,
}: {
  url: string;
  alt: string;
  largura: number;
  altura: number;
  className?: string;
  prioridade?: boolean;
}) {
  if (url.startsWith("/")) {
    return (
      <Image
        src={url}
        alt={alt}
        width={largura}
        height={altura}
        priority={prioridade}
        className={className}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={largura}
      height={altura}
      loading={prioridade ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

/**
 * Corpo da página. O site antigo aplicava `nl2br()` nesses textos; aqui isso
 * só acontece quando o conteúdo não tem tag de bloco — do contrário o
 * parágrafo já formatado ganharia linhas em branco a mais.
 */
export function CorpoCms({ html, className }: { html: string; className?: string }) {
  if (!temTexto(html)) return null;
  const limpo = limparHtml(html);
  const pronto = BLOCOS.test(limpo) ? limpo : nl2brHtml(limpo);

  return (
    <div
      className={cn("prose-jb max-w-none", className)}
      // conteúdo do painel da JB, higienizado logo acima em `limparHtml`
      dangerouslySetInnerHTML={{ __html: pronto }}
    />
  );
}

export function CapaCms({
  imagem,
  className,
}: {
  imagem: PaginaCms["cover"];
  className?: string;
}) {
  if (!imagem?.url) return null;
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-graf-200 bg-graf-50",
        className,
      )}
    >
      <ImagemDoBanco
        url={imagem.url}
        alt={imagem.alt}
        largura={imagem.width ?? 1200}
        altura={imagem.height ?? 675}
        prioridade
        className="h-auto w-full object-cover"
      />
    </figure>
  );
}

export function GaleriaCms({ imagens }: { imagens: PaginaCms["gallery"] }) {
  const validas = imagens.filter((item) => Boolean(item.media?.url));
  if (validas.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {validas.map((item) => (
        <li key={item.id}>
          <figure className="overflow-hidden rounded-xl border border-graf-200 bg-graf-50">
            <ImagemDoBanco
              url={item.media.url}
              alt={item.media.alt || item.caption || ""}
              largura={item.media.width ?? 800}
              altura={item.media.height ?? 600}
              className="h-52 w-full object-cover"
            />
            {item.caption ? (
              <figcaption className="border-t border-graf-200 bg-white px-4 py-3 text-sm text-graf-600">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}

/** Vídeo do YouTube gravado na página. Sem cookie até o visitante dar play. */
export function VideoCms({ videoId, titulo }: { videoId: string | null; titulo: string }) {
  const id = (videoId ?? "").trim();
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-graf-200 bg-graf-950">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={titulo}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
