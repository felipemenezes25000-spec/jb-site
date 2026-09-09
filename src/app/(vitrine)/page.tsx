import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { AtalhosHome } from "@/components/loja/home/atalhos-home";
import { ProcuradosHome, SeminovosHome } from "@/components/loja/home/colecoes-home";
import { lerParcelamento } from "@/components/loja/home/comum";
import { ChamadaDestacada, FaixaVitrine } from "@/components/loja/home/faixa-vitrine";
import { FechamentoHome } from "@/components/loja/home/fechamento-home";
import { HeroVitrine, type NumeroDaHome } from "@/components/loja/home/hero-vitrine";
import { TickerHome } from "@/components/loja/home/ticker-home";
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

import styles from "./home-experience.module.css";
import headerFillStyles from "./home-header-fill.module.css";
import mobileStyles from "./home-mobile-polish.module.css";

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
      ? { valor: String(catalogo.totalPublicado), rotulo: "Equipamentos em linha" }
      : null,
    catalogo.totalMarcas > 0
      ? { valor: String(catalogo.totalMarcas), rotulo: "Marcas no catálogo" }
      : null,
    catalogo.menorPrecoCents
      ? { valor: formatarPreco(catalogo.menorPrecoCents), rotulo: "Menor preço do catálogo" }
      : null,
  ].filter((numero) => numero !== null);

  const jaNaHome = [
    catalogo.destaque?.slug,
    ...catalogo.ofertas.map((produto) => produto.slug),
    ...catalogo.seminovos.map((produto) => produto.slug),
    ...catalogo.procurados.map((produto) => produto.slug),
  ].filter((slug): slug is string => Boolean(slug));

  const paraComparar = [
    ...catalogo.ofertas,
    ...catalogo.seminovos,
    ...catalogo.procurados,
  ].slice(0, 3);

  return (
    <div
      className={`${styles.home} ${headerFillStyles.headerFill} ${mobileStyles.mobilePolish}`}
      data-jb-home="true"
    >
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      <HeroVitrine
        cidade={s.endereco_cidade}
        numeros={numeros}
        destaque={catalogo.destaque}
        parcelamento={parcelamentoHome}
      />

      <TickerHome />
      <AtalhosHome />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      <FaixaVitrine
        sobretitulo="Preço abaixo do de tabela"
        titulo="Ofertas com desconto real"
        href="/loja"
        rotuloDoLink="Ver tudo"
        produtos={catalogo.ofertas.slice(0, 4)}
        parcelamento={parcelamentoHome}
        variante="ofertas"
      />

      <ChamadaDestacada
        sobretitulo="Compare antes de decidir"
        titulo="Três equipamentos. Uma decisão muito mais clara."
        texto="Preço, potência, capacidade, garantia, prazo e instalação na mesma leitura — sem abrir cinco abas nem perder o contexto da compra."
        href="/comparar"
        rotulo="Abrir comparador"
        produtos={paraComparar}
      />

      <SeminovosHome produtos={catalogo.seminovos} parcelamento={parcelamentoHome} />

      <ProcuradosHome produtos={catalogo.procurados} parcelamento={parcelamentoHome} />

      <VistosRecentemente
        titulo="Continue de onde parou"
        excluir={jaNaHome}
        larguraInterna="max-w-[112rem]"
      />

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <FechamentoHome />
    </div>
  );
}
