import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
import { Hero } from "@/components/loja/home/hero";
import { ProvasObjetivas } from "@/components/loja/home/provas";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoDestaques } from "@/components/loja/home/destaques";
import { SecaoSeminovos } from "@/components/loja/home/seminovos";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
import { SecaoAreaClinica } from "@/components/loja/home/area-clinica";
import { SecaoCentralTecnica } from "@/components/loja/home/central-tecnica";
import { SecaoMarcas } from "@/components/loja/home/marcas";
import { ChamadaFinal } from "@/components/loja/home/chamada-final";
import {
  EsqueletoCategoriasHome,
  EsqueletoDestaquesHome,
  EsqueletoMarcasHome,
  EsqueletoSeminovosHome,
} from "@/components/loja/home/esqueletos-home";
import { ETIQUETA_CATALOGO, ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PUBLICADO = { status: "active" } as const;

/**
 * Home pública.
 *
 * A página agora tem uma progressão única, sem repetir três vezes os mesmos
 * caminhos: impacto -> prova -> descoberta -> produto -> seminovo -> serviço ->
 * pós-venda -> autoridade -> marcas -> ação. A Área da Clínica incorpora a
 * demonstração do prontuário, e o antigo bloco "Três caminhos" deixa de ser
 * necessário na home.
 */
async function dadosDoTopo() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES, ETIQUETA_CATALOGO);
  cacheLife("hours");

  return Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { ...PUBLICADO, media: { some: {} } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: SELECAO_HOME,
    }),
    prisma.product.count({ where: PUBLICADO }),
    prisma.brand.count({ where: { published: true, products: { some: PUBLICADO } } }),
  ] as const);
}

export default async function HomePage() {
  const [s, vitrine, equipamentos, marcas] = await dadosDoTopo();

  return (
    <div className="[&_.container-jb]:max-w-[112rem]">
      <Hero configuracoes={s} produto={vitrine[0] ?? null} parcelamento={lerParcelamento(s)} />

      <ProvasObjetivas configuracoes={s} equipamentos={equipamentos} marcas={marcas} />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      <Suspense fallback={<EsqueletoDestaquesHome />}>
        <SecaoDestaques />
      </Suspense>

      <Suspense fallback={<EsqueletoSeminovosHome />}>
        <SecaoSeminovos />
      </Suspense>

      <SecaoAssistencia configuracoes={s} />

      <SecaoAreaClinica />

      <Suspense fallback={null}>
        <SecaoCentralTecnica />
      </Suspense>

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <ChamadaFinal configuracoes={s} />
    </div>
  );
}
