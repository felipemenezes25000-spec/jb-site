import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  PackageCheck,
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

const ATALHOS = [
  { href: "/novos", rotulo: "Novos", icone: ShoppingCart },
  { href: "/seminovos", rotulo: "Seminovos", icone: PackageCheck },
  { href: "/assistencia-tecnica", rotulo: "Assistência", icone: Wrench },
] as const;

export function Hero({
  configuracoes: _configuracoes,
  produto,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
}) {
  return (
    <section className="relative overflow-hidden border-b border-graf-200 bg-[#f7f7f5]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-jb-300 to-transparent" aria-hidden />

      <div
        className={cn(
          "container-jb max-w-[112rem] py-8 sm:py-10 lg:py-12",
          produto && "lg:grid lg:grid-cols-[minmax(0,0.88fr)_minmax(36rem,1.12fr)] lg:items-stretch lg:gap-8 xl:gap-12",
        )}
      >
        <div className="flex min-w-0 flex-col justify-center py-8 sm:py-10 lg:py-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-jb-600" aria-hidden />
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-jb-700">
              JB Soluções Odontológicas
            </p>
          </div>

          <h1 className="mt-5 max-w-[10.5ch] text-[clamp(3.2rem,5vw,5.7rem)] font-black leading-[0.9] tracking-[-0.065em] text-graf-950">
            Equipamentos para uma clínica que não pode parar.
          </h1>

          <p className="mt-5 max-w-[11ch] text-[clamp(2rem,3.3vw,3.6rem)] font-black leading-[0.95] tracking-[-0.055em] text-jb-600">
            Compra e pós-venda na mesma JB.
          </p>

          <p className="mt-6 max-w-[38rem] text-base leading-7 text-graf-600 sm:text-[1.05rem]">
            Escolha equipamentos novos ou seminovos com orientação comercial, instalação, assistência técnica e histórico conectados ao mesmo relacionamento.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao
              href="/loja"
              tamanho="lg"
              className="min-w-52 rounded-xl shadow-[0_16px_34px_-18px_rgba(211,17,28,0.55)] hover:-translate-y-0.5"
            >
              Explorar catálogo
              <ArrowRight className="size-4" aria-hidden />
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

          <nav aria-label="Acessos rápidos" className="mt-8 border-t border-graf-200 pt-5">
            <ul className="flex flex-wrap gap-2">
              {ATALHOS.map(({ href, rotulo, icone: Icone }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-graf-200 bg-white px-4 text-xs font-extrabold text-graf-700 transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-jb-200 hover:text-jb-700"
                  >
                    <Icone className="size-3.5 text-jb-600" aria-hidden />
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {produto ? <VitrineHero produto={produto} parcelamento={parcelamento} /> : null}
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
    <div className="relative min-h-[31rem] overflow-hidden rounded-[2rem] bg-[#111214] shadow-[0_34px_90px_-48px_rgba(62,0,0,0.48)] sm:min-h-[36rem] lg:min-h-[42rem]">
      <div className="absolute inset-y-0 right-0 w-[33%] bg-jb-600" aria-hidden />
      <div
        className="absolute inset-y-0 right-[18%] w-[35%] bg-jb-500/30"
        style={{ clipPath: "polygon(50% 0,100% 0,50% 100%,0 100%)" }}
        aria-hidden
      />
      <div className="absolute -right-20 -top-24 size-[24rem] rounded-full border-[4rem] border-white/[0.055]" aria-hidden />
      <div className="absolute bottom-[-5rem] left-[24%] h-40 w-80 rounded-full bg-jb-500/30 blur-3xl" aria-hidden />

      <div className="absolute left-5 top-5 z-20 sm:left-7 sm:top-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3.5 py-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-jb-400" aria-hidden />
          Destaque do catálogo
        </span>
      </div>

      <div className="absolute inset-x-[7%] bottom-[23%] top-[10%] z-10 overflow-hidden rounded-[1.8rem] border border-white/60 bg-white shadow-[0_26px_70px_-34px_rgba(0,0,0,0.42)] sm:inset-x-[10%] sm:bottom-[21%]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#ffffff_0%,#fbfbfb_62%,#f0f0f0_100%)]" aria-hidden />
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 88vw, 48vw"
            className="object-contain p-[9%] drop-shadow-[0_28px_28px_rgba(90,0,0,0.13)] transition-transform duration-700 hover:scale-[1.035]"
          />
        ) : null}
      </div>

      <ProdutoDestaque produto={produto} parcelamento={parcelamento} />

      <div className="absolute bottom-6 right-6 z-20 hidden items-center gap-2 text-[0.63rem] font-bold uppercase tracking-[0.12em] text-white/65 sm:flex">
        <Headphones className="size-3.5" aria-hidden />
        suporte depois da compra
      </div>
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
      className="group absolute bottom-5 left-5 right-5 z-30 grid gap-4 rounded-[1.35rem] border border-white/70 bg-white/95 p-5 shadow-[0_26px_60px_-34px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 sm:bottom-7 sm:left-7 sm:right-auto sm:w-[min(34rem,72%)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {produto.brand ? (
            <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-graf-400">
              {produto.brand.name}
            </span>
          ) : null}
        </div>

        <h2 className="mt-2 line-2 text-[1.05rem] font-black leading-[1.1] tracking-[-0.025em] text-graf-950 sm:text-lg">
          {produto.name}
        </h2>

        {produto.allowDirectPurchase && produto.priceCents > 0 ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl font-black tracking-[-0.025em] text-jb-700">{formatarPreco(produto.priceCents)}</p>
            {parcelas ? (
              <p className="text-[0.65rem] text-graf-500">
                até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm font-black text-jb-700">Sob orçamento</p>
        )}
      </div>

      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jb-600 text-white transition-transform group-hover:translate-x-1" aria-hidden>
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
