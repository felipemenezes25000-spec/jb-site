import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { lerParcelamento } from "@/components/loja/home/comum";
import { ChamadaDestacada, FaixaVitrine } from "@/components/loja/home/faixa-vitrine";
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

  return (
    <>
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      <HeroVitrine
        cidade={s.endereco_cidade}
        numeros={numeros}
        destaque={catalogo.destaque}
        parcelamento={{ max: parcelamento.max, minimoCents: parcelamento.minimaCents }}
      />

      <TickerHome />

      <Suspense fallback={<EsqueletoCategoriasHome />}>
        <SecaoCategorias />
      </Suspense>

      <FaixaVitrine
        sobretitulo="Preço abaixo do de tabela"
        titulo="Ofertas com desconto real"
        href="/loja"
        rotuloDoLink="Ver tudo"
        produtos={catalogo.ofertas.slice(0, 4)}
        parcelamento={{ max: parcelamento.max, minimoCents: parcelamento.minimaCents }}
      />

      <ChamadaDestacada
        sobretitulo="Ferramenta de comparação"
        titulo="Coloque até 3 equipamentos frente a frente"
        texto="Preço, potência, capacidade, garantia, prazo e instalação na mesma tabela — sem abrir cinco abas."
        href="/comparar"
        rotulo="Abrir comparação"
      />

      <FaixaVitrine
        sobretitulo="Revisados na bancada da JB"
        titulo="Seminovos com laudo e garantia"
        href="/seminovos"
        rotuloDoLink="Ver seminovos"
        produtos={catalogo.seminovos.slice(0, 4)}
        parcelamento={{ max: parcelamento.max, minimoCents: parcelamento.minimaCents }}
        colunas={{ base: 1, sm: 2, lg: 4 }}
        fundo="nevoa"
      />

      <FaixaVitrine
        sobretitulo="O que sai mais do estoque"
        titulo="Equipamentos que a clínica repõe sempre"
        href="/loja"
        rotuloDoLink="Catálogo completo"
        produtos={catalogo.procurados.slice(0, 8)}
        parcelamento={{ max: parcelamento.max, minimoCents: parcelamento.minimaCents }}
      />

      <VistosRecentemente
        titulo="Continue de onde parou"
        excluir={jaNaHome}
        larguraInterna="max-w-[112rem]"
      />

      <SecaoAssistencia configuracoes={s} />

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>
    </>
  );
}
