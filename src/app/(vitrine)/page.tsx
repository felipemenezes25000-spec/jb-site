import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { AtalhosHome } from "@/components/loja/home/atalhos-home";
import { ProcuradosHome, SeminovosHome } from "@/components/loja/home/colecoes-home";
import { lerParcelamento } from "@/components/loja/home/comum";
import { FaixaVitrine } from "@/components/loja/home/faixa-vitrine";
import { FechamentoHome } from "@/components/loja/home/fechamento-home";
import { HeroVitrine, type NumeroDaHome } from "@/components/loja/home/hero-vitrine";
import { BancadaJB, ChamadaComparador } from "@/components/loja/home/bancada-home";
import { FaixaCorrendo } from "@/components/loja/home/manifesto-home";
import { SecaoAssistencia } from "@/components/loja/home/assistencia";
import { SecaoCategorias } from "@/components/loja/home/categorias";
import { SecaoMarcas } from "@/components/loja/home/marcas";
import {
  EsqueletoCategoriasHome,
  EsqueletoMarcasHome,
} from "@/components/loja/home/esqueletos-home";
import { VistosRecentemente } from "@/components/loja/vistos-recentemente";
import { dadosDaHome } from "@/lib/catalogo";
import { formatarPreco } from "@/lib/format";
import { ETIQUETA_CATALOGO, ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { JsonLd, localNegocioJsonLd, organizacaoJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

async function dadosDoTopo() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES, ETIQUETA_CATALOGO);
  cacheLife("hours");

  return Promise.all([getSettings(), dadosDaHome()] as const);
}

export default async function HomePage() {
  const [s, catalogo] = await dadosDoTopo();
  const parcelamento = lerParcelamento(s);
  const parcelamentoHome = { max: parcelamento.max, minimoCents: parcelamento.minimaCents };

  const numeros: NumeroDaHome[] = [
    catalogo.totalPublicado > 0
      ? { valor: String(catalogo.totalPublicado), rotulo: "no catálogo" }
      : null,
    catalogo.totalMarcas > 0 ? { valor: String(catalogo.totalMarcas), rotulo: "marcas" } : null,
    catalogo.menorPrecoCents
      ? { valor: formatarPreco(catalogo.menorPrecoCents), rotulo: "a partir de" }
      : null,
  ].filter((numero) => numero !== null);

  const tipoDe = (nome: string) => nome.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const vitrine: typeof catalogo.procurados = [];
  const tiposUsados = new Set<string>();
  for (const produto of [
    catalogo.destaque,
    ...catalogo.procurados,
    ...catalogo.ofertas,
    ...catalogo.seminovos,
  ]) {
    if (!produto || vitrine.length === 3) continue;
    if (vitrine.some((escolhido) => escolhido.slug === produto.slug)) continue;
    const tipo = tipoDe(produto.name);
    if (tiposUsados.has(tipo)) continue;
    tiposUsados.add(tipo);
    vitrine.push(produto);
  }

  const jaNaHome = [
    catalogo.destaque?.slug,
    ...catalogo.ofertas.map((produto) => produto.slug),
    ...catalogo.seminovos.map((produto) => produto.slug),
    ...catalogo.procurados.map((produto) => produto.slug),
  ].filter((slug): slug is string => Boolean(slug));

  return (
    <div data-jb-home="true" data-motion-scene="home" className="relative">
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />
      <div className="jb-home-stage" aria-hidden="true">
        <span className="jb-home-orbit jb-home-orbit-a" />
        <span className="jb-home-orbit jb-home-orbit-b" />
        <span className="jb-home-orbit jb-home-orbit-c" />
      </div>

      <div data-motion-chapter="hero">
        <HeroVitrine
          cidade={s.endereco_cidade}
          desde={s.empresa_desde}
          numeros={numeros}
          vitrine={vitrine}
          parcelamento={parcelamentoHome}
        />
      </div>

      <div data-motion-chapter="atalhos"><AtalhosHome /></div>
      <div data-motion-chapter="categorias"><Suspense fallback={<EsqueletoCategoriasHome />}><SecaoCategorias /></Suspense></div>
      <div data-motion-chapter="ofertas">
        <FaixaVitrine
          sobretitulo="Ofertas"
          titulo="Boas oportunidades do catálogo"
          href="/loja"
          rotuloDoLink="Ver catálogo"
          produtos={catalogo.ofertas.slice(0, 4)}
          parcelamento={parcelamentoHome}
        />
      </div>
      <div data-motion-chapter="manifesto"><FaixaCorrendo /></div>
      <div data-motion-chapter="bancada"><BancadaJB /></div>
      <div data-motion-chapter="seminovos"><SeminovosHome produtos={catalogo.seminovos} parcelamento={parcelamentoHome} /></div>
      <div data-motion-chapter="procurados"><ProcuradosHome produtos={catalogo.procurados} parcelamento={parcelamentoHome} /></div>
      <div data-motion-chapter="comparador"><ChamadaComparador /></div>
      <div data-motion-chapter="recentes"><VistosRecentemente titulo="Continue de onde parou" excluir={jaNaHome} largura="loja" /></div>
      <div data-motion-chapter="assistencia"><SecaoAssistencia configuracoes={s} /></div>
      <div data-motion-chapter="marcas"><Suspense fallback={<EsqueletoMarcasHome />}><SecaoMarcas /></Suspense></div>
      <div data-motion-chapter="fechamento"><FechamentoHome /></div>
    </div>
  );
}
