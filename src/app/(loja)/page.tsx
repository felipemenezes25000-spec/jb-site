import type { Metadata } from "next";
import { Suspense } from "react";

import { lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
import { Hero } from "@/components/loja/home/hero";
import { ProvasObjetivas } from "@/components/loja/home/provas";
import { TresCaminhos } from "@/components/loja/home/caminhos";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoDestaques } from "@/components/loja/home/destaques";
import { SecaoSeminovos } from "@/components/loja/home/seminovos";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
import { SecaoAreaClinica } from "@/components/loja/home/area-clinica";
import { SecaoMarcas } from "@/components/loja/home/marcas";
import { ChamadaFinal } from "@/components/loja/home/chamada-final";
import {
  EsqueletoCategoriasHome,
  EsqueletoDestaquesHome,
  EsqueletoMarcasHome,
  EsqueletoSeminovosHome,
} from "@/components/loja/home/esqueletos-home";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PUBLICADO = { status: "active" } as const;

/**
 * Página principal.
 *
 * A narrativa é uma só e vai do primeiro contato ao pós-venda: quem é a JB,
 * por onde começar, o que ela vende, o que ela revisa, como ela conserta e o
 * que acontece depois que o equipamento chega na clínica.
 *
 * Custo de banco: o que o hero e a faixa de provas precisam sai em uma única
 * ida, em paralelo. As faixas de baixo — categorias, destaques, seminovos e
 * marcas — carregam por conta própria dentro de um Suspense, com esqueleto no
 * formato exato da faixa. Assim o topo da página não espera pelo rodapé dela.
 */
export default async function HomePage() {
  const [s, vitrine, equipamentos, marcas] = await Promise.all([
    getSettings(),
    // só entra no hero o que tem foto: hero de equipamento sem imagem não é hero
    prisma.product.findMany({
      where: { ...PUBLICADO, media: { some: {} } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: SELECAO_HOME,
    }),
    prisma.product.count({ where: PUBLICADO }),
    prisma.brand.count({ where: { published: true, products: { some: PUBLICADO } } }),
  ]);

  return (
    <>
      <Hero configuracoes={s} produtos={vitrine} parcelamento={lerParcelamento(s)} />

      <ProvasObjetivas configuracoes={s} equipamentos={equipamentos} marcas={marcas} />

      <TresCaminhos />

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

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <ChamadaFinal configuracoes={s} />
    </>
  );
}
