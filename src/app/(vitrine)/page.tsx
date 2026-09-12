import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { AtalhosHome } from "@/components/loja/home/atalhos-home";
import { ProcuradosHome, SeminovosHome } from "@/components/loja/home/colecoes-home";
import { lerParcelamento } from "@/components/loja/home/comum";
import { FaixaVitrine } from "@/components/loja/home/faixa-vitrine";
import { FechamentoHome } from "@/components/loja/home/fechamento-home";
import { HeroVitrine, type NumeroDaHome } from "@/components/loja/home/hero-vitrine";
import { FaixaCorrendo, ManifestoJB } from "@/components/loja/home/manifesto-home";
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

  /* Rótulo curto de propósito: em caixa alta e espaçado, "Produtos publicados"
     quebrava em duas linhas dentro de uma coluna de um terço e empurrava o
     número para fora da primeira tela. A `<dl>` tem `aria-label="Catálogo JB"`,
     então "no catálogo" é lido em contexto. */
  const numeros: NumeroDaHome[] = [
    catalogo.totalPublicado > 0
      ? { valor: String(catalogo.totalPublicado), rotulo: "no catálogo" }
      : null,
    catalogo.totalMarcas > 0 ? { valor: String(catalogo.totalMarcas), rotulo: "marcas" } : null,
    catalogo.menorPrecoCents
      ? { valor: formatarPreco(catalogo.menorPrecoCents), rotulo: "a partir de" }
      : null,
  ].filter((numero) => numero !== null);

  /* Os três equipamentos que a abertura alterna. O destaque abre, e os dois
     seguintes vêm de tipos DIFERENTES dele — é a troca de tipo que dá sentido
     ao rodízio da manchete ("a clínica escolhe a autoclave / o compressor").
     Três do mesmo tipo girariam a mesma palavra três vezes. */
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
    <div data-jb-home="true">
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      <HeroVitrine
        cidade={s.endereco_cidade}
        desde={s.empresa_desde}
        numeros={numeros}
        vitrine={vitrine}
        parcelamento={parcelamentoHome}
      />

      {/* Faixa correndo e manifesto ficam ENTRE a abertura e o catálogo: é o
          respiro que separa a promessa da prateleira, e é onde o protótipo os
          coloca. */}
      <FaixaCorrendo />

      <ManifestoJB
        garantiaMaximaMeses={catalogo.garantiaMaximaMeses}
        temSeminovo={catalogo.seminovos.length > 0}
      />

      <AtalhosHome />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      <FaixaVitrine
        sobretitulo="Ofertas"
        titulo="Boas oportunidades do catálogo"
        href="/loja"
        rotuloDoLink="Ver catálogo"
        produtos={catalogo.ofertas.slice(0, 4)}
        parcelamento={parcelamentoHome}
      />

      <SeminovosHome produtos={catalogo.seminovos} parcelamento={parcelamentoHome} />
      <ProcuradosHome produtos={catalogo.procurados} parcelamento={parcelamentoHome} />

      <VistosRecentemente
        titulo="Continue de onde parou"
        excluir={jaNaHome}
        larguraInterna="max-w-[100rem]"
      />

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <FechamentoHome />
    </div>
  );
}
