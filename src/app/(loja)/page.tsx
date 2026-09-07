import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
import { Hero } from "@/components/loja/home/hero";
import { ProvasObjetivas } from "@/components/loja/home/provas";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
import { SecaoMarcas } from "@/components/loja/home/marcas";
import { VistosRecentemente } from "@/components/loja/vistos-recentemente";
import {
  EsqueletoCategoriasHome,
  EsqueletoMarcasHome,
} from "@/components/loja/home/esqueletos-home";
import { atalhosDaBusca } from "@/lib/busca/sugestoes";
import { ETIQUETA_CATALOGO, ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";
import { JsonLd, localNegocioJsonLd, organizacaoJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PUBLICADO = { status: "active" } as const;

async function dadosDoTopo() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES, ETIQUETA_CATALOGO);
  cacheLife("hours");

  return Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { ...PUBLICADO, media: { some: {} } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 1,
      select: SELECAO_HOME,
    }),
    prisma.product.count({ where: PUBLICADO }),
    prisma.brand.count({ where: { published: true, products: { some: PUBLICADO } } }),
    /* As categorias com mais equipamentos publicados. Saem do catálogo, não de
       uma lista escrita à mão: quando a JB publicar uma linha nova, ela
       aparece no hero sozinha — e uma categoria que esvaziar sai. */
    atalhosDaBusca(6),
  ] as const);
}

/**
 * Home pública da JB.
 *
 * Uma jornada curta: posicionamento → prova → descoberta → decisão → marcas.
 * O restante do conteúdo vive nas páginas próprias, evitando repetição e
 * mantendo a home focada em orientar a próxima ação.
 */
export default async function HomePage() {
  const [s, vitrine, equipamentos, marcas, atalhos] = await dadosDoTopo();

  return (
    <>
      {/* A home era a única página sem dado estruturado: as internas já
          traziam trilha e FAQ, mas faltava justamente o de maior retorno para
          quem é local — endereço, telefone e horário de uma empresa de São
          Paulo, que é o que alimenta o painel do Google e o mapa.

          Os dois blocos existiam em `lib/seo` e já eram usados em /contato,
          /estrutura e /sobre; aqui é a página que representa a empresa
          inteira, então entram juntos: a organização (quem é a JB) e o local
          (onde ela atende). Os `@id` são fixos, então repetir o bloco em
          outras páginas não cria duas empresas no índice — o Google junta. */}
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      <Hero
        configuracoes={s}
        produto={vitrine[0] ?? null}
        parcelamento={lerParcelamento(s)}
        categorias={atalhos.categorias}
      />
      <ProvasObjetivas configuracoes={s} equipamentos={equipamentos} marcas={marcas} />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      {/* Continua de onde parou. Some inteiro para quem chega pela primeira
          vez — a home não abre um buraco para dizer que não sabe nada. */}
      <VistosRecentemente titulo="Continue de onde parou" larguraInterna="max-w-[112rem]" />

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>
    </>
  );
}
