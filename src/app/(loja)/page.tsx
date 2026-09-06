import type { Metadata } from "next";
import { Suspense } from "react";

import { fotoDe, lerParcelamento, SELECAO_HOME } from "@/components/loja/home/comum";
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
import { cacheLife, cacheTag } from "next/cache";

import {
  ETIQUETA_CATALOGO,
  ETIQUETA_CONFIGURACOES,
} from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PUBLICADO = { status: "active" } as const;

/**
 * Página principal.
 *
 * A narrativa é uma só, e a ordem das faixas é o argumento:
 *
 *   promessa            Hero — "Comprar é só o começo", com equipamento real
 *   evidência           provas objetivas, só o que é verificável
 *   prontuário          o registro que continua depois da venda
 *   caminhos            comprar, consertar ou acompanhar
 *   curadoria           categorias, destaques e seminovos
 *   confiança           como a assistência funciona e quais marcas atende
 *   ação                a última decisão da página
 *
 * A demonstração do prontuário vem antes dos caminhos de propósito: é ela que
 * explica por que "comprar é só o começo" não é slogan. Quem chega decidido a
 * comprar já tem o botão no hero.
 *
 * Custo de banco: o que o hero e a faixa de provas precisam sai em uma única
 * ida, em paralelo. As faixas de baixo — categorias, destaques, seminovos e
 * marcas — carregam por conta própria dentro de um Suspense, com esqueleto no
 * formato exato da faixa. Assim o topo da página não espera pelo rodapé dela.
 */
/**
 * Os dados do topo da home.
 *
 * Cacheados como um conjunto só, com etiqueta: são o hero, a faixa de provas e
 * a foto dos três caminhos — tudo público, igual para todo mundo, e tudo lido
 * do mesmo banco. Publicar ou arquivar um produto derruba esta etiqueta pelo
 * painel, então a vitrine não fica velha.
 *
 * A home é a única página da loja migrada de verdade para Cache Components
 * nesta fase; as demais estão com `instant = false` e a lista está em
 * docs/evolucao-jb/cobertura.md.
 */
async function dadosDoTopo() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES, ETIQUETA_CATALOGO);
  cacheLife("hours");

  return Promise.all([
    getSettings(),
    // só entra no hero o que tem foto: hero de equipamento sem imagem não é
    // hero. O primeiro é a placa do topo; o quarto ilustra a faixa dos três
    // caminhos — repetir ali a foto que acabou de aparecer no topo faria a
    // página parecer curta.
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

  // a quarta foto, quando existe; senão a primeira volta a servir
  const fotoDaFaixa = vitrine[3] ? fotoDe(vitrine[3]) : (vitrine[0] ? fotoDe(vitrine[0]) : null);

  return (
    <>
      <Hero configuracoes={s} produto={vitrine[0] ?? null} parcelamento={lerParcelamento(s)} />

      <ProvasObjetivas configuracoes={s} equipamentos={equipamentos} marcas={marcas} />

      <SecaoAreaClinica />

      <TresCaminhos foto={fotoDaFaixa} />

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

      <Suspense fallback={<EsqueletoMarcasHome />}>
        <SecaoMarcas />
      </Suspense>

      <ChamadaFinal configuracoes={s} />
    </>
  );
}
