import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, Wrench } from "lucide-react";

import { BuscaHero } from "@/components/loja/busca-hero";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import {
  CONDICAO_HOME,
  fotoDe,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import type { SugestaoDeTaxonomia } from "@/lib/busca/sugestoes";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/**
 * Entrada da composição. Fica em CSS puro de propósito: o hero é o LCP da home
 * e continua sendo componente de servidor — nenhum JavaScript precisa carregar
 * para o primeiro quadro aparecer.
 *
 * Duas decisões que parecem detalhe e não são:
 *
 * A animação é declarada DENTRO da media query, não fora com um `animation:
 * none` desfazendo depois. O estado escrito no elemento é o estado final —
 * visível — e a animação é o acréscimo. Do jeito anterior, `both` segurava
 * `opacity: 0` como estado de partida: qualquer coisa que impedisse a animação
 * de rodar (aba aberta em segundo plano, folha de estilo que chega atrasada,
 * mecanismo que não executa animação) deixava o hero inteiro invisível até um
 * scroll acordar a página. Agora a falha é o efeito não acontecer, não o texto
 * sumir.
 *
 * E o título não participa do fade. Ele é o maior elemento da primeira dobra,
 * logo é ele que o navegador cronometra como LCP, e elemento com `opacity: 0`
 * não conta como pintado: os 0,7s da animação entravam inteiros na métrica.
 * Ele sobe junto com o resto, só que sólido desde o primeiro quadro.
 */
const CSS_HERO = `
@keyframes jb-hero-sobe { from { opacity: 0; transform: translate3d(0,16px,0); } to { opacity: 1; transform: none; } }
@keyframes jb-hero-entra { from { opacity: 0; transform: translate3d(30px,0,0); } to { opacity: 1; transform: none; } }
@keyframes jb-hero-cresce { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes jb-hero-titulo { from { transform: translate3d(0,16px,0); } to { transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  .jb-hero-sobe { animation: jb-hero-sobe 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .jb-hero-entra { animation: jb-hero-entra 0.85s cubic-bezier(0.22,1,0.36,1) both; }
  .jb-hero-cresce { animation: jb-hero-cresce 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
  .jb-hero-titulo { animation: jb-hero-titulo 0.7s cubic-bezier(0.22,1,0.36,1) both; }
}
`;

export function Hero({
  configuracoes: _configuracoes,
  produto,
  parcelamento,
  categorias,
}: {
  configuracoes: SettingsMap;
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
  /** Categorias com mais equipamentos publicados. Vazio esconde a fileira. */
  categorias: SugestaoDeTaxonomia[];
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-graf-200 bg-[#f8f7f6]">
      <style>{CSS_HERO}</style>

      {/* Fundo: iluminação quente, arcos finos e o consultório entrando pela esquerda. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_74%_18%,rgba(215,25,32,0.07),transparent_58%),radial-gradient(60%_60%_at_8%_86%,rgba(215,25,32,0.05),transparent_60%),linear-gradient(160deg,#fdfcfc_0%,#f6f4f3_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[26rem] -top-[34rem] size-[70rem] rounded-full border border-jb-200/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[19rem] -top-[27rem] size-[55rem] rounded-full border border-jb-100"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[30rem] left-[24%] size-[52rem] rounded-full border border-jb-100/70"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[clamp(10rem,13vw,16rem)] opacity-[0.34] blur-[1.5px] min-[1280px]:block"
        style={{
          maskImage:
            "linear-gradient(to right, #000 0%, #000 42%, transparent 96%), linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(to right, #000 0%, #000 42%, transparent 96%), linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
        aria-hidden
      >
        <Image
          src="/images/hero/ambiente-clinica.webp"
          alt=""
          fill
          sizes="256px"
          className="object-cover object-left"
        />
      </div>

      {/* Marginália editorial: só entra quando CABE fora do container.

          O container do hero tem teto de 112rem (1792px). Estes dois rótulos
          ficam ancorados a 3,5rem das bordas da tela e medem ~110px — ou seja,
          precisam de 132px de margem de cada lado para não encostar no
          conteúdo. Isso só acontece a partir de ~2060px. Em 1600–2050 eles
          entravam mesmo assim: o da esquerda ficava POR BAIXO do título ("uma
          clínica que" passava por cima de "que mantém sorrisos") e o da direita
          sumia atrás do cartão do destaque. Decoração que colide com o
          conteúdo não é decoração — é defeito. */}
      <p
        className="pointer-events-none absolute left-[3.5rem] top-[9rem] hidden text-[0.63rem] font-semibold uppercase leading-[2] tracking-[0.28em] text-graf-500 min-[2100px]:block"
        aria-hidden
      >
        Tecnologia
        <br />
        que mantém
        <br />
        sorrisos
        <br />
        em movimento
        <span className="mt-4 block h-px w-7 bg-jb-500/70" />
      </p>

      <p
        className="pointer-events-none absolute right-[3.5rem] top-[11rem] hidden text-right text-[0.63rem] font-semibold uppercase leading-[2] tracking-[0.28em] text-graf-500 min-[2100px]:block"
        aria-hidden
      >
        Clínicas
        <br />
        mais fortes
        <br />
        com a JB
      </p>

      <div className="container-jb relative z-10 max-w-[112rem] py-10 min-[1024px]:py-12">
        <div className="grid items-center gap-10 min-[1024px]:grid-cols-[minmax(0,1.02fr)_minmax(0,1.08fr)] min-[1024px]:gap-x-10 min-[1360px]:grid-cols-[minmax(0,1fr)_minmax(0,1.16fr)] min-[1360px]:gap-x-14">
          <div className="flex min-w-0 flex-col">
            <div className="jb-hero-sobe flex items-center gap-3">
              <span className="h-px w-8 shrink-0 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-jb-700">
                JB Soluções Odontológicas
              </p>
            </div>

            <h1
              className="jb-hero-titulo mt-5 max-w-[15ch] text-[clamp(2.6rem,3.55vw,4.15rem)] font-black leading-[0.94] tracking-[-0.06em] text-graf-950"
              style={{ animationDelay: "0.06s" }}
            >
              Equipamentos para uma clínica que não pode parar.
            </h1>

            <p
              className="jb-hero-sobe mt-5 max-w-[16ch] text-[clamp(1.85rem,2.6vw,3rem)] font-black leading-[0.98] tracking-[-0.05em] text-jb-600"
              style={{ animationDelay: "0.12s" }}
            >
              Compra e pós-venda na mesma JB.
            </p>

            <p
              className="jb-hero-sobe mt-6 max-w-[34rem] text-base leading-[1.65] text-graf-600 min-[640px]:text-[1.05rem]"
              style={{ animationDelay: "0.18s" }}
            >
              Escolha equipamentos novos ou seminovos com orientação comercial, instalação,
              assistência técnica e histórico conectados ao mesmo relacionamento.
            </p>

            {/* A busca entra ANTES dos botões, e é essa a mudança de ordem que
                importa: quem chega sabendo o que quer não deveria ter de achar
                o catálogo para depois procurar dentro dele. Os dois caminhos
                continuam existindo logo abaixo — explorar e pedir assistência. */}
            <div
              className="jb-hero-sobe mt-7 max-w-[34rem]"
              style={{ animationDelay: "0.22s" }}
            >
              <BuscaHero rotulo="Buscar equipamento no catálogo da JB" />
            </div>

            {categorias.length > 0 ? (
              <nav
                aria-label="Categorias do catálogo"
                className="jb-hero-sobe mt-4"
                style={{ animationDelay: "0.26s" }}
              >
                <ul className="flex flex-wrap items-center gap-2">
                  {/* Linha própria no celular: junto das pastilhas, o rótulo
                      empurrava a primeira categoria para o fim da linha e a
                      fileira ficava com um degrau logo na abertura. */}
                  <li className="w-full text-[0.68rem] font-black uppercase tracking-[0.16em] text-graf-500 sm:w-auto">
                    Buscado agora
                  </li>
                  {categorias.map((categoria) => (
                    <li key={categoria.slug}>
                      <Link
                        href={`/categoria/${categoria.slug}`}
                        className="foco-jb inline-flex min-h-9 items-center gap-1.5 rounded-full border border-graf-200 bg-white/85 px-3.5 text-[0.8125rem] font-bold text-graf-700 transition-[border-color,color,background-color] hover:border-jb-200 hover:bg-white hover:text-jb-700"
                      >
                        {categoria.nome}
                        <span className="tabular text-[0.6875rem] font-semibold text-graf-500">
                          {categoria.total}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            <div
              className="jb-hero-sobe mt-7 flex flex-col gap-3 min-[640px]:flex-row min-[640px]:flex-wrap"
              style={{ animationDelay: "0.3s" }}
            >
              <LinkBotao
                href="/loja"
                tamanho="lg"
                className="group min-w-52 rounded-xl shadow-[0_18px_36px_-18px_rgba(211,17,28,0.6)] hover:-translate-y-0.5"
              >
                Explorar catálogo
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </LinkBotao>

              <LinkBotao
                href="/assistencia-tecnica/solicitar"
                variante="secundario"
                tamanho="lg"
                className="min-w-52 rounded-xl border-graf-300 bg-white hover:-translate-y-0.5 hover:border-jb-300 hover:text-jb-700"
              >
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </LinkBotao>
            </div>
          </div>

          {produto ? <VitrineHero produto={produto} parcelamento={parcelamento} /> : null}
        </div>
      </div>
    </section>
  );
}

function VitrineHero({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);

  return (
    <div className="jb-hero-entra relative min-h-[30rem] overflow-hidden rounded-[2rem] bg-[#0b0b0d] shadow-[0_40px_100px_-52px_rgba(62,0,0,0.55)] min-[640px]:min-h-[34rem] min-[1024px]:min-h-[35rem] min-[1360px]:min-h-[37.5rem]">
      {/* Profundidade: grafite à esquerda virando vermelho profundo à direita. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_46%,rgba(226,22,30,0.62),transparent_56%),radial-gradient(70%_60%_at_86%_4%,rgba(255,60,68,0.28),transparent_54%),linear-gradient(112deg,#0b0b0d_0%,#161619_42%,#3a070c_100%)]"
        aria-hidden
      />
      <div
        className="absolute -right-24 -top-28 size-[26rem] rounded-full border border-white/[0.07]"
        aria-hidden
      />
      <div
        className="absolute -right-10 top-1/2 size-[34rem] -translate-y-1/2 rounded-full border border-white/[0.06]"
        aria-hidden
      />
      <div
        className="absolute -bottom-24 left-[18%] h-52 w-96 rounded-full bg-jb-500/25 blur-3xl"
        aria-hidden
      />

      <div className="absolute left-5 top-5 z-20 min-[640px]:left-7 min-[640px]:top-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-jb-400" aria-hidden />
          Destaque do catálogo
        </span>
      </div>

      <p
        className="absolute right-6 top-7 z-20 hidden text-right text-[0.58rem] font-semibold uppercase leading-[1.9] tracking-[0.26em] text-white/45 min-[1024px]:block"
        aria-hidden
      >
        Odontologia
        <br />
        sem limites
        <span className="ml-auto mt-2.5 block h-px w-6 bg-jb-400/70" />
      </p>

      {/* Painel claro com o produto. */}
      <div className="absolute inset-x-[7%] bottom-[24%] top-[13%] z-10 overflow-hidden rounded-[1.6rem] border border-white/60 bg-white shadow-[0_30px_74px_-36px_rgba(0,0,0,0.45)] min-[640px]:inset-x-[8%] min-[640px]:bottom-[22%]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,#fff_0%,#fbfbfb_58%,#efeded_100%)]"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-1/2 size-[19rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-jb-100/80"
          aria-hidden
        />

        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 84vw, 44vw"
            className="jb-hero-cresce scale-[1.28] object-contain drop-shadow-[0_30px_30px_rgba(90,0,0,0.14)]"
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(56%_72%_at_50%_48%,transparent_58%,rgba(255,255,255,0.85)_86%,#fff_100%)]"
          aria-hidden
        />

        <p
          className="absolute left-5 top-1/2 z-10 hidden -translate-y-1/2 text-[0.55rem] font-semibold uppercase leading-[2] tracking-[0.24em] text-graf-500 min-[1280px]:block"
          aria-hidden
        >
          Alta
          <br />
          performance
          <br />
          para grandes
          <br />
          resultados
        </p>
        <p
          className="absolute right-5 top-[58%] z-10 hidden text-right text-[0.55rem] font-semibold uppercase leading-[2] tracking-[0.24em] text-graf-500 min-[1280px]:block"
          aria-hidden
        >
          Confiança
          <br />
          em cada
          <br />
          detalhe
        </p>
      </div>

      <ProdutoDestaque produto={produto} parcelamento={parcelamento} />

      <p className="absolute bottom-7 right-6 z-20 hidden items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/60 min-[640px]:flex">
        <Headphones className="size-3.5" aria-hidden />
        suporte depois da compra
      </p>
    </div>
  );
}

function ProdutoDestaque({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const condicao = CONDICAO_HOME[produto.condition];
  const parcelas = produto.allowDirectPurchase
    ? calcularParcelas(produto.priceCents, parcelamento.max, parcelamento.minimaCents)
    : null;

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="foco-jb group absolute bottom-5 left-5 right-5 z-30 grid gap-4 rounded-[1.35rem] border border-white/70 bg-white/95 p-5 shadow-[0_26px_60px_-34px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-32px_rgba(0,0,0,0.6)] min-[640px]:bottom-7 min-[640px]:left-7 min-[640px]:right-auto min-[640px]:w-[min(31rem,68%)] min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-end"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {produto.brand ? (
            <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-graf-500">
              {produto.brand.name}
            </span>
          ) : null}
        </div>

        <h2 className="line-2 mt-2 text-[1.05rem] font-black leading-[1.1] tracking-[-0.025em] text-graf-950 min-[640px]:text-lg">
          {produto.name}
        </h2>

        {produto.allowDirectPurchase && produto.priceCents > 0 ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl font-black tracking-[-0.025em] text-jb-700">
              {formatarPreco(produto.priceCents)}
            </p>
            {parcelas ? (
              <p className="text-[0.68rem] text-graf-500">
                em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm font-black text-jb-700">Sob orçamento</p>
        )}
      </div>

      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jb-600 text-white shadow-[0_14px_26px_-12px_rgba(211,17,28,0.8)] transition-transform group-hover:translate-x-1"
        aria-hidden
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
