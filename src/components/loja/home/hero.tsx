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

const SERVICOS = [
  { icone: ShoppingCart, titulo: "Venda" },
  { icone: PackageCheck, titulo: "Instalação" },
  { icone: Wrench, titulo: "Manutenção" },
  { icone: Headphones, titulo: "Suporte" },
] as const;

/**
 * Primeira dobra editorial.
 *
 * Branco é o plano dominante. O vermelho fica contido na coluna visual, como
 * assinatura da marca, e nunca mais vira uma parede ocupando metade da tela.
 * A fotografia continua vindo do catálogo real; preço, condição e marca
 * também são os dados do produto publicado.
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
          "mx-auto grid max-w-[100rem]",
          produto ? "lg:min-h-[38rem] lg:grid-cols-[0.92fr_1.08fr]" : "min-h-[34rem]",
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

        <h1 className="max-w-[10.5ch] text-[clamp(3.25rem,4.7vw,4.8rem)] font-black leading-[0.95] tracking-[-0.055em] text-graf-950">
          Equipamentos para a sua clínica.
          <span className="mt-2 block text-jb-600">Suporte para o que vem depois.</span>
        </h1>

        <p className="mt-6 max-w-[36rem] text-base leading-7 text-graf-500 sm:text-[1.05rem]">
          Compra, instalação, assistência e histórico técnico em um só relacionamento. Mais tempo para sua clínica funcionar bem.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <LinkBotao
            href="/loja"
            tamanho="lg"
            className="min-w-52 rounded-2xl shadow-[0_14px_34px_rgba(220,38,38,0.16)] hover:-translate-y-0.5"
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

        <div className="mt-9 grid max-w-[42rem] gap-5 border-t border-graf-200 pt-6 sm:grid-cols-3">
          <MiniBeneficio icone={ShoppingCart} titulo="Compra acompanhada" texto="Antes e depois da entrega" />
          <MiniBeneficio icone={Wrench} titulo="Assistência própria" texto="Equipe técnica da JB" />
          <MiniBeneficio icone={PackageCheck} titulo="Histórico centralizado" texto="Na Área da Clínica" />
        </div>
      </div>
    </div>
  );
}

function MiniBeneficio({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-jb-200 text-jb-600">
        <Icone className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-extrabold text-graf-950">{titulo}</p>
        <p className="mt-1 text-[0.68rem] leading-4 text-graf-400">{texto}</p>
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
    <div className="relative hidden min-h-[38rem] overflow-hidden bg-white lg:block">
      {/* O vermelho fica restrito ao trilho lateral. */}
      <div className="absolute inset-y-0 right-0 w-[26%] bg-jb-600" aria-hidden />
      <div
        className="absolute inset-y-0 right-[18%] w-[24%] bg-jb-50"
        style={{ clipPath: "polygon(48% 0, 100% 0, 56% 100%, 0 100%)" }}
        aria-hidden
      />
      <div
        className="absolute inset-y-0 right-[24%] w-[10%] bg-jb-600/10"
        style={{ clipPath: "polygon(70% 0, 100% 0, 30% 100%, 0 100%)" }}
        aria-hidden
      />

      <div className="absolute bottom-[5%] left-[0%] top-[4%] z-10 w-[72%]">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 0px, 42vw"
            className="object-contain object-center p-[4%] drop-shadow-[0_28px_34px_rgba(155,0,0,0.14)] transition-transform duration-700 hover:scale-[1.025]"
          />
        ) : null}
      </div>

      <ProdutoFlutuante produto={produto} parcelamento={parcelamento} />

      <div className="absolute right-[2.7%] top-1/2 z-20 w-[20%] -translate-y-1/2 text-white">
        <p className="text-[0.67rem] font-black uppercase leading-[1.65] tracking-[0.2em] text-white/70">
          Do equipamento
          <br />
          ao pós-venda
        </p>
        <div className="mt-5 h-px w-10 bg-white/60" aria-hidden />

        <div className="mt-7 space-y-4">
          {SERVICOS.map(({ icone: Icone, titulo }) => (
            <div key={titulo} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10">
                <Icone className="size-4" aria-hidden />
              </span>
              <span className="text-[0.69rem] font-extrabold uppercase tracking-[0.08em] text-white">
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
      className="group absolute bottom-9 left-[3%] z-30 flex w-[min(31rem,66%)] items-end justify-between gap-5 rounded-[1.4rem] border border-jb-100 bg-white/97 p-5 shadow-[0_26px_70px_-32px_rgba(118,0,0,0.34)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1"
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
