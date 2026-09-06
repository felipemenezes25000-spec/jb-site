import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
import { Hero } from "@/components/loja/home/hero";
import { ProvasObjetivas } from "@/components/loja/home/provas";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
import { SecaoMarcas } from "@/components/loja/home/marcas";
import {
  EsqueletoCategoriasHome,
  EsqueletoMarcasHome,
} from "@/components/loja/home/esqueletos-home";
import { ETIQUETA_CATALOGO, ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";
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
  const [s, vitrine, equipamentos, marcas] = await dadosDoTopo();

  return (
    <>
      <Hero configuracoes={s} produto={vitrine[0] ?? null} parcelamento={lerParcelamento(s)} />
      <ProvasObjetivas configuracoes={s} equipamentos={equipamentos} marcas={marcas} />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>
    </>
  );
}
