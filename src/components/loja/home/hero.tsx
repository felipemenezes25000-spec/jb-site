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
    <section className="relative isolate overflow-hidden border-b border-jb-100 bg-white">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-20 hidden w-[43%] bg-jb-500 lg:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-36 top-[-12rem] -z-10 hidden size-[34rem] rounded-full border-[7rem] border-white/10 lg:block"
      />

      <div
        className={cn(
          "container-jb max-w-[112rem] grid gap-10 py-12 sm:py-14 lg:min-h-[36rem] lg:items-center lg:gap-12 lg:py-14 xl:min-h-[40rem]",
          produto && "lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]",
        )}
      >
        <div className={cn("relative z-10", !produto && "max-w-5xl py-10")}>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-700">
            <span className="h-px w-9 bg-jb-500" aria-hidden />
            Equipamentos odontológicos + assistência técnica
          </p>

          <h1 className="mt-6 max-w-[12ch] text-[clamp(3.35rem,5.45vw,6.9rem)] font-extrabold leading-[0.93] tracking-[-0.06em] text-graf-950">
            Equipamentos para a sua clínica.
            <span className="mt-2 block text-jb-600">Suporte para o que vem depois.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-relaxed text-graf-600 sm:text-lg xl:text-xl">
            Compra, instalação, assistência e histórico técnico em um só relacionamento — sem separar venda de pós-venda.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg" className="min-w-48">
              Explorar equipamentos
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="perigo"
              tamanho="lg"
              className="min-w-48"
            >
              <Wrench className="size-4" aria-hidden />
              Preciso de assistência
            </LinkBotao>
          </div>

          <div className="mt-9 grid max-w-2xl gap-4 border-t border-jb-100 pt-6 sm:grid-cols-3">
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
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-jb-100 bg-white text-jb-600">
        <Icone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-graf-950">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-graf-500">{detalhe}</p>
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
    <div className="relative min-h-[27rem] sm:min-h-[31rem] lg:min-h-[34rem] xl:min-h-[37rem]">
      <span
        aria-hidden
        className="absolute inset-[7%_5%_8%_7%] rounded-[46%] bg-white shadow-[0_34px_90px_-34px_rgba(113,0,0,0.35)]"
      />

      {foto ? (
        <Image
          src={foto.url}
          alt={foto.alt}
          fill
          preload
          sizes="(max-width: 1024px) 96vw, 58vw"
          className="relative z-10 object-contain p-5 drop-shadow-[0_30px_28px_rgba(100,0,0,0.16)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025] sm:p-8 lg:p-5 xl:p-8"
        />
      ) : null}

      <div className="absolute bottom-3 left-1/2 z-20 w-[min(92%,39rem)] -translate-x-1/2 rounded-2xl border border-jb-100 bg-white p-4 shadow-[0_24px_55px_-28px_rgba(112,0,0,0.32)] sm:flex sm:items-end sm:justify-between sm:gap-5 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
            {produto.brand ? (
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-graf-500">
                {produto.brand.name}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-2 text-lg font-extrabold leading-snug text-graf-950 sm:text-xl">
            {produto.name}
          </p>
          {produto.allowDirectPurchase && produto.priceCents > 0 ? (
            <p className="mt-2 text-lg font-extrabold tracking-tight text-jb-700">
              {formatarPreco(produto.priceCents)}
              {parcelas ? (
                <span className="ml-2 text-xs font-medium text-graf-500">
                  até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm font-bold text-jb-700">Sob orçamento</p>
          )}
        </div>

        <Link
          href={`/loja/${produto.slug}`}
          className="mt-4 inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 sm:mt-0"
        >
          Ver equipamento
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
