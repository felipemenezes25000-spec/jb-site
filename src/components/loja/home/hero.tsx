import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

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
   Hero da home

   Direção visual: branco como base, vermelho JB como assinatura. O equipamento
   não vive dentro de um card gigante nem compete com uma parede de cor. A foto
   do catálogo entra solta na composição; o vermelho aparece em linhas, aro e
   ações. Assim a primeira dobra continua comercial sem parecer um banner de
   campanha separado do restante do site.
   ============================================================================ */

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
    <section className="relative overflow-hidden border-b border-jb-100 bg-white">
      <div
        className={cn(
          "container-jb max-w-[104rem] grid items-center gap-10 py-12 sm:py-16 lg:py-20 xl:py-24",
          produto && "lg:grid-cols-[minmax(0,0.92fr)_minmax(28rem,1.08fr)] lg:gap-16 xl:gap-20",
        )}
      >
        <div className={cn("relative z-10", !produto && "max-w-4xl")}>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-700">
            <span className="h-0.5 w-10 bg-jb-500" aria-hidden />
            JB Soluções Odontológicas
          </p>

          <h1 className="mt-5 max-w-[13ch] text-[clamp(3.1rem,4.7vw,5.8rem)] font-extrabold leading-[0.94] tracking-[-0.055em] text-graf-950">
            Equipamentos odontológicos para sua clínica.
          </h1>

          <p className="mt-4 max-w-[15ch] text-[clamp(2rem,3.2vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-jb-600">
            Venda, assistência e pós-venda no mesmo lugar.
          </p>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-graf-600 sm:text-lg">
            Da escolha do equipamento ao suporte técnico, a JB acompanha a rotina da clínica sem separar compra de assistência.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg" className="min-w-48">
              Ver equipamentos
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="perigo"
              tamanho="lg"
              className="min-w-48 border-jb-300 bg-white text-jb-700 hover:border-jb-500 hover:bg-jb-50"
            >
              <Wrench className="size-4" aria-hidden />
              Solicitar assistência
            </LinkBotao>
          </div>
        </div>

        {produto ? <ProdutoEditorial produto={produto} parcelamento={parcelamento} /> : null}
      </div>
    </section>
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
    <div className="relative mx-auto w-full max-w-[42rem] py-5 sm:py-8 lg:py-0">
      {/* Assinatura vermelha atrás da imagem. É contorno, não uma parede. */}
      <span
        aria-hidden
        className="absolute left-[7%] top-[5%] size-[76%] rounded-full border-[clamp(1.25rem,2.2vw,2.5rem)] border-jb-500"
      />
      <span
        aria-hidden
        className="absolute right-[2%] top-[18%] h-1.5 w-[34%] bg-jb-500"
      />
      <span
        aria-hidden
        className="absolute bottom-[17%] left-[2%] h-1.5 w-[22%] bg-jb-500"
      />

      <div className="relative z-10 aspect-square w-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 92vw, 46vw"
            className="object-contain p-[8%] drop-shadow-[0_24px_24px_rgba(156,0,0,0.12)] transition-transform duration-500 hover:scale-[1.02]"
          />
        ) : null}
      </div>

      <div className="relative z-20 -mt-8 ml-auto w-[min(92%,34rem)] border-l-4 border-jb-500 bg-white px-5 py-4 shadow-[0_18px_50px_-30px_rgba(130,0,0,0.38)] sm:-mt-12 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {produto.brand ? (
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-graf-500">
              {produto.brand.name}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="line-2 text-lg font-extrabold leading-snug text-graf-950 sm:text-xl">
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
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900"
          >
            Ver equipamento
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
