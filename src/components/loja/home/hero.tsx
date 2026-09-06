import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import {
  CONDICAO_HOME,
  fotoDe,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

const SERVICOS = [
  { icone: ShoppingCart, titulo: "Compra" },
  { icone: PackageCheck, titulo: "Instalação" },
  { icone: Wrench, titulo: "Assistência" },
  { icone: Headphones, titulo: "Pós-venda" },
] as const;

const ATALHOS = [
  { href: "/novos", rotulo: "Equipamentos novos" },
  { href: "/seminovos", rotulo: "Seminovos revisados" },
  { href: "/assistencia-tecnica", rotulo: "Assistência técnica" },
] as const;

/**
 * Primeira dobra orientada a comércio, com a vantagem competitiva da JB
 * aparecendo como contexto — não como distração da intenção de compra.
 */
export function Hero({
  configuracoes: _s,
  produto,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
}) {
  return (
    <section className="overflow-hidden border-b border-graf-200 bg-white">
      <div
        className={cn(
          "mx-auto grid max-w-[112rem]",
          produto ? "lg:min-h-[41rem] lg:grid-cols-[0.9fr_1.1fr]" : "min-h-[35rem]",
        )}
      >
        <HeroConteudo />
        {produto ? <HeroVisual produto={produto} parcelamento={parcelamento} /> : null}
      </div>
    </section>
  );
}

function HeroConteudo() {
  return (
    <div className="relative z-10 flex items-center bg-white">
      <div className="w-full px-5 py-14 sm:px-8 sm:py-16 lg:px-12 xl:px-16 2xl:px-20">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-jb-600" aria-hidden />
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-jb-700">
            Equipamentos odontológicos + assistência técnica
          </span>
        </div>

        <h1 className="max-w-[11ch] text-[clamp(3.3rem,4.8vw,5.15rem)] font-black leading-[0.93] tracking-[-0.06em] text-graf-950">
          Equipamentos para a sua clínica.
          <span className="mt-2 block text-jb-600">Suporte para o que vem depois.</span>
        </h1>

        <p className="mt-6 max-w-[37rem] text-base leading-7 text-graf-500 sm:text-[1.06rem]">
          Compre novo ou seminovo com orientação, instalação, assistência e histórico técnico conectados à mesma jornada.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <LinkBotao
            href="/loja"
            tamanho="lg"
            className="min-w-52 rounded-2xl shadow-[0_14px_34px_rgba(220,38,38,0.18)] hover:-translate-y-0.5"
          >
            Explorar equipamentos
            <ArrowRight className="size-4" aria-hidden />
          </LinkBotao>
          <LinkBotao
            href="/assistencia-tecnica/solicitar"
            variante="perigo"
            tamanho="lg"
            className="min-w-52 rounded-2xl border-jb-200 bg-white text-jb-700 hover:-translate-y-0.5 hover:border-jb-300 hover:bg-jb-50"
          >
            <Wrench className="size-4" aria-hidden />
            Preciso de assistência
          </LinkBotao>
        </div>

        <nav aria-label="Atalhos da loja" className="mt-8 border-t border-graf-200 pt-5">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {ATALHOS.map((atalho) => (
              <li key={atalho.href}>
                <Link
                  href={atalho.href}
                  className="group inline-flex min-h-10 items-center gap-1.5 text-xs font-extrabold text-graf-600 transition-colors hover:text-jb-700"
                >
                  {atalho.rotulo}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function HeroVisual({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);

  return (
    <div className="relative hidden min-h-[41rem] overflow-hidden bg-[#f8f8f8] lg:block">
      <div className="absolute inset-y-0 right-0 w-[16%] bg-jb-600" aria-hidden />
      <div
        className="absolute inset-y-0 right-[9%] w-[52%] bg-[linear-gradient(145deg,#ef1722_0%,#c90b14_44%,#18191c_44%,#0d0e10_100%)]"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
        aria-hidden
      />
      <div className="absolute right-[11%] top-[8%] size-72 rounded-full border-[3rem] border-white/5" aria-hidden />
      <div className="absolute bottom-[8%] right-[18%] h-28 w-80 rounded-full bg-jb-500/25 blur-3xl" aria-hidden />

      <div className="absolute bottom-[10%] left-[1%] top-[5%] z-10 w-[71%]">
        <div className="absolute inset-[7%] rounded-[2.5rem] bg-white/92 shadow-[0_32px_90px_-48px_rgba(80,0,0,0.55)]" aria-hidden />
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 0px, 43vw"
            className="object-contain object-center p-[10%] drop-shadow-[0_26px_32px_rgba(96,0,0,0.16)] transition-transform duration-700 hover:scale-[1.025]"
          />
        ) : null}
      </div>

      <ProdutoFlutuante produto={produto} parcelamento={parcelamento} />

      <div className="absolute right-[1.5%] top-1/2 z-20 w-[14%] -translate-y-1/2 text-white">
        <p className="text-[0.62rem] font-black uppercase leading-[1.65] tracking-[0.18em] text-white/65">
          Um parceiro
          <br />
          para a clínica
        </p>
        <div className="mt-5 h-px w-8 bg-white/55" aria-hidden />

        <div className="mt-6 space-y-4">
          {SERVICOS.map(({ icone: Icone, titulo }) => (
            <div key={titulo} className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10">
                <Icone className="size-3.5" aria-hidden />
              </span>
              <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-white">
                {titulo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProdutoFlutuante({
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
      className="group absolute bottom-8 left-[3%] z-30 flex w-[min(32rem,68%)] items-end justify-between gap-5 rounded-[1.5rem] border border-white/80 bg-white/95 p-5 shadow-[0_28px_80px_-30px_rgba(80,0,0,0.38)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {produto.brand ? (
            <span className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-graf-400">
              {produto.brand.name}
            </span>
          ) : null}
        </div>

        <h2 className="mt-2 line-2 text-lg font-black leading-[1.08] tracking-[-0.025em] text-graf-950">
          {produto.name}
        </h2>

        {produto.allowDirectPurchase && produto.priceCents > 0 ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <p className="text-lg font-black text-jb-700">{formatarPreco(produto.priceCents)}</p>
            {parcelas ? (
              <p className="text-[0.65rem] text-graf-400">
                até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-jb-700">Sob orçamento</p>
        )}
      </div>

      <span className="mb-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-jb-100 text-jb-700 transition-colors group-hover:bg-jb-600 group-hover:text-white">
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
