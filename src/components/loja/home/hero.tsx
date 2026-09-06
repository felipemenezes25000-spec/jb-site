import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldCheck, Wrench } from "lucide-react";

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

/* ============================================================================
   Hero editorial da home

   O hero não é uma ficha de produto aumentada. O equipamento participa da
   composição como imagem principal, e a informação comercial fica reduzida a
   uma legenda pequena. A primeira dobra fala da proposta da JB; o catálogo
   aparece como prova visual, não como um card branco dentro de outro card.
   ============================================================================ */

export function Hero({
  configuracoes: s,
  produto,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
}) {
  const cidade = s.endereco_cidade.trim();

  return (
    <section className="on-dark relative isolate overflow-hidden border-b border-white/10 bg-graf-950">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_77%_42%,rgba(255,255,255,0.08),transparent_33%),radial-gradient(circle_at_3%_30%,rgba(224,20,27,0.13),transparent_24%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[48%] -z-10 hidden w-px rotate-[24deg] bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block"
      />

      <div
        className={cn(
          "container-jb grid gap-10 py-12 sm:py-14 lg:min-h-[36rem] lg:items-center lg:gap-10 lg:py-12 xl:min-h-[39rem] xl:gap-14",
          produto && "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]",
        )}
      >
        <div className={cn("relative z-10", !produto && "max-w-5xl py-10")}>
          <p className="flex items-center gap-3 text-[0.72rem] font-extrabold uppercase tracking-[0.17em] text-jb-300 sm:text-xs">
            <span className="h-px w-9 bg-jb-500" aria-hidden />
            Equipamentos odontológicos + assistência técnica
          </p>

          <h1 className="mt-6 max-w-[12ch] text-[clamp(3.2rem,5.25vw,6.6rem)] font-extrabold leading-[0.94] tracking-[-0.055em] text-white">
            Equipamentos para a sua clínica.
            <span className="mt-2 block text-jb-400">Suporte para o que vem depois.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-relaxed text-graf-300 sm:text-lg xl:text-xl">
            A JB reúne compra, instalação, assistência e histórico técnico em um só
            relacionamento — para o equipamento não virar um problema depois que sai da caixa.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao
              href="/loja"
              tamanho="lg"
              className="min-w-48 shadow-[0_16px_42px_-18px_rgba(224,20,27,0.9)]"
            >
              Explorar equipamentos
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="contorno-claro"
              tamanho="lg"
              className="min-w-48"
            >
              <Wrench className="size-4" aria-hidden />
              Preciso de assistência
            </LinkBotao>
          </div>

          <div className="mt-9 grid max-w-2xl gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            <MiniProva icone={ShieldCheck} titulo="Compra acompanhada" detalhe="Antes e depois da entrega" />
            <MiniProva
              icone={Wrench}
              titulo="Assistência própria"
              detalhe={cidade ? `Equipe técnica JB em ${cidade}` : "Atendimento técnico JB"}
            />
            <MiniProva icone={ClipboardList} titulo="Histórico centralizado" detalhe="Na Área da Clínica" />
          </div>
        </div>

        {produto ? <ProdutoEditorial produto={produto} parcelamento={parcelamento} /> : null}
      </div>
    </section>
  );
}

function MiniProva({
  icone: Icone,
  titulo,
  detalhe,
}: {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-jb-300 ring-1 ring-inset ring-white/10">
        <Icone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-graf-400">{detalhe}</p>
      </div>
    </div>
  );
}

function ProdutoEditorial({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];
  const parcelas = produto.allowDirectPurchase
    ? calcularParcelas(produto.priceCents, parcelamento.max, parcelamento.minimaCents)
    : null;

  return (
    <div className="relative min-h-[25rem] sm:min-h-[30rem] lg:min-h-[32rem] xl:min-h-[35rem]">
      <span
        aria-hidden
        className="absolute inset-[7%_3%_4%_8%] rounded-[48%] bg-[radial-gradient(circle_at_52%_48%,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.91)_42%,rgba(255,255,255,0.24)_62%,transparent_73%)] blur-[1px]"
      />
      <span
        aria-hidden
        className="absolute bottom-[9%] left-[14%] right-[7%] h-16 rounded-[50%] bg-black/55 blur-3xl"
      />

      {foto ? (
        <Image
          src={foto.url}
          alt={foto.alt}
          fill
          preload
          sizes="(max-width: 1024px) 96vw, 58vw"
          className="relative z-10 object-contain p-5 drop-shadow-[0_40px_35px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025] sm:p-8 lg:p-5 xl:p-8"
        />
      ) : null}

      <div className="absolute bottom-2 left-1/2 z-20 w-[min(92%,38rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-graf-950/88 p-4 shadow-pop backdrop-blur-xl sm:bottom-4 sm:flex sm:items-end sm:justify-between sm:gap-5 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
            {produto.brand ? (
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-graf-400">
                {produto.brand.name}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-2 text-lg font-extrabold leading-snug text-white sm:text-xl">
            {produto.name}
          </p>
          {produto.allowDirectPurchase && produto.priceCents > 0 ? (
            <p className="mt-2 text-lg font-extrabold tracking-tight text-white">
              {formatarPreco(produto.priceCents)}
              {parcelas ? (
                <span className="ml-2 text-xs font-medium text-graf-400">
                  até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm font-bold text-white">Sob orçamento</p>
          )}
        </div>

        <Link
          href={`/loja/${produto.slug}`}
          className="mt-4 inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-jb-300 transition-colors hover:text-white sm:mt-0"
        >
          Ver equipamento
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
