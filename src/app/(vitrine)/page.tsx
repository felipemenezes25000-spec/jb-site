import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { lerParcelamento } from "@/components/loja/home/comum";
import { ChamadaDestacada, FaixaVitrine } from "@/components/loja/home/faixa-vitrine";
import { HeroVitrine, type NumeroDaHome } from "@/components/loja/home/hero-vitrine";
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

/**
 * Home pública da JB.
 *
 * A jornada é a de uma vitrine, não a de uma landing page: abertura curta com
 * um equipamento real na primeira tela, três listas do catálogo publicado —
 * oferta, seminovo revisado e o que sai mais —, e só depois o que a JB
 * afirma sobre si (categorias, assistência, marcas).
 *
 * O que ela deliberadamente NÃO faz é abrir com três telas de posicionamento
 * antes do primeiro preço. Quem chega aqui está comprando equipamento.
 */
export default async function HomePage() {
  const [s, catalogo] = await dadosDoTopo();
  const parcelamento = lerParcelamento(s);

  /* Só entra número que o catálogo sustenta: sem equipamento publicado não há
     "12 equipamentos em linha", e sem preço não há "menor preço". */
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

  return (
    <>
      {/* A home era a única página sem dado estruturado: as internas já
          traziam trilha e FAQ, mas faltava justamente o de maior retorno para
          quem é local — endereço, telefone e horário de uma empresa de São
          Paulo, que é o que alimenta o painel do Google e o mapa.

          Os `@id` são fixos, então repetir o bloco em outras páginas não cria
          duas empresas no índice — o Google junta. */}
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      <HeroVitrine
        cidade={s.endereco_cidade}
        numeros={numeros}
        destaque={catalogo.destaque}
        parcelamento={{ max: parcelamento.max, minimoCents: parcelamento.minimaCents }}
      />

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
