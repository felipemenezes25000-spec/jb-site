import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { fotoDe, lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
import { Hero } from "@/components/loja/home/hero";
import { ProvasObjetivas } from "@/components/loja/home/provas";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoDestaques } from "@/components/loja/home/destaques";
import { SecaoSeminovos } from "@/components/loja/home/seminovos";
import { SecaoAreaClinica } from "@/components/loja/home/area-clinica";
import { DemonstracaoDoProntuario } from "@/components/loja/home/demonstracao-prontuario";
import { TresCaminhos } from "@/components/loja/home/caminhos";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
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
 * Página principal.
 *
 * A primeira metade agora é deliberadamente comercial: promessa forte, prova,
 * categorias e equipamentos. O visitante que chegou para comprar não precisa
 * atravessar a explicação do prontuário antes de ver o catálogo. A Área da
 * Clínica e o pós-venda continuam centrais, mas entram depois da vitrine — onde
 * passam a funcionar como diferenciação em vez de barreira para a descoberta.
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
  const fotoDaFaixa = vitrine[3] ? fotoDe(vitrine[3]) : (vitrine[0] ? fotoDe(vitrine[0]) : null);

  return (
    <>
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

      <SecaoAreaClinica />

      <DemonstracaoDoProntuario />

      <TresCaminhos foto={fotoDaFaixa} />

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <ChamadaFinal configuracoes={s} />
    </>
  );
}
