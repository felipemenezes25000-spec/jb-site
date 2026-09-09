import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GitCompareArrows, Sparkles } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";
import { DestaqueOfertaHome } from "@/components/loja/home/destaque-oferta";
import { formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

const ROTULO_VARIANTE = {
  padrao: null,
  ofertas: "OPORTUNIDADE REAL",
  seminovos: "REVISADO PELA JB",
  procurados: "ALTA PROCURA",
} as const;

export function FaixaVitrine({
  sobretitulo,
  titulo,
  href,
  rotuloDoLink,
  produtos,
  parcelamento,
  colunas,
  fundo = "clara",
  className,
  variante = "padrao",
}: {
  sobretitulo: string;
  titulo: string;
  href: string;
  rotuloDoLink: string;
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
  colunas?: Parameters<typeof GradeVitrine>[0]["colunas"];
  fundo?: "clara" | "nevoa";
  className?: string;
  variante?: "padrao" | "ofertas" | "seminovos" | "procurados";
}) {
  if (produtos.length === 0) return null;

  const etiqueta = ROTULO_VARIANTE[variante];
  const mostrarDestaque = variante === "ofertas" && produtos.length >= 2;
  const produtosDaGrade = mostrarDestaque ? produtos.slice(1) : produtos;

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-y border-jb-100/80 py-14 lg:py-20",
        fundo === "nevoa" ? "bg-[#fff9f9]" : "bg-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-48 -top-48 size-[30rem] rounded-full bg-jb-50/55 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[19rem] rounded-full border border-jb-100/70"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-7 border-b border-jb-100 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-[2px] w-9 bg-jb-600" aria-hidden />
              <p className="micro text-jb-700">{sobretitulo}</p>
              {etiqueta ? (
                <span className="rounded-full bg-jb-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.15em] text-jb-700 ring-1 ring-jb-100">
                  {etiqueta}
                </span>
              ) : null}
            </div>
            <h2 className="manchete mt-4 max-w-[22ch] text-[clamp(1.9rem,1.45rem+1.9vw,3.35rem)] text-graf-950">
              {titulo}
            </h2>
          </div>

          <Link
            href={href}
            className="group foco-jb inline-flex min-h-12 w-fit items-center gap-4 rounded-full bg-[#fff9f9] py-2 pl-5 pr-2.5 text-[0.76rem] font-black uppercase tracking-[0.08em] text-graf-950 ring-1 ring-jb-100 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_-26px_rgba(126,11,18,0.65)]"
          >
            {rotuloDoLink}
            <span className="grid size-8 place-items-center rounded-full bg-jb-500 text-white transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        </div>

        <div className="relative mt-8">
          <span
            className="pointer-events-none absolute -left-2 -top-7 hidden font-display text-[6rem] font-black leading-none text-jb-500/[0.045] lg:block"
            aria-hidden
          >
            {variante === "ofertas" ? "%" : variante === "seminovos" ? "R" : variante === "procurados" ? "↑" : "JB"}
          </span>

          {mostrarDestaque ? (
            <DestaqueOfertaHome produto={produtos[0]} parcelamento={parcelamento} />
          ) : null}

          {produtosDaGrade.length > 0 ? (
            <GradeVitrine
              produtos={produtosDaGrade}
              parcelamento={parcelamento}
              colunas={colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 }}
              className="relative z-10"
            />
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-jb-100 pt-5 text-[0.69rem] font-black uppercase tracking-[0.12em] text-graf-950">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-jb-600" aria-hidden />
            Curadoria técnica JB
          </span>
          <span className="text-jb-700">Preço, condição e disponibilidade na mesma leitura</span>
        </div>
      </div>
    </section>
  );
}

export function ChamadaDestacada({
  sobretitulo,
  titulo,
  texto,
  href,
  rotulo,
  produtos = [],
}: {
  sobretitulo: string;
  titulo: string;
  texto: string;
  href: string;
  rotulo: string;
  produtos?: ProdutoCard[];
}) {
  const itens = produtos.slice(0, 3);

  return (
    <section className="relative isolate overflow-hidden border-y border-jb-100 bg-[#fffafa] py-16 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(214,24,34,0.07),transparent_25%)]"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-jb-500 text-white shadow-[0_12px_30px_-22px_rgba(139,9,17,0.8)]">
                <GitCompareArrows className="size-4" aria-hidden />
              </span>
              <p className="micro text-jb-700">{sobretitulo}</p>
            </div>

            <h2 className="manchete mt-5 max-w-[14ch] text-[clamp(2.15rem,3.8vw,4.25rem)] leading-[0.94] text-graf-950">
              {titulo}
            </h2>
            <p className="mt-6 max-w-xl text-[1rem] font-medium leading-[1.65] text-graf-950/72">
              {texto}
            </p>

            <ul className="mt-7 grid gap-3 text-[0.8rem] font-black text-graf-950 sm:grid-cols-2">
              {["Preço lado a lado", "Condição e garantia", "Especificações técnicas", "Decisão sem perder contexto"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-jb-500 text-white">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className="group foco-jb mt-8 inline-flex min-h-13 items-center gap-6 rounded-full bg-jb-500 py-2 pl-6 pr-2.5 text-[0.88rem] font-black text-white shadow-[0_18px_38px_-26px_rgba(143,8,17,0.8)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-600"
            >
              {rotulo}
              <span className="grid size-9 place-items-center rounded-full bg-white text-jb-600 transition-transform group-hover:translate-x-1">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2.2rem] bg-white/90 p-4 shadow-[0_30px_90px_-62px_rgba(117,11,17,0.55)] ring-1 ring-jb-100 sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-jb-50/80 blur-2xl" aria-hidden />
            <div className="relative mb-5 flex items-center justify-between gap-4 border-b border-jb-100 pb-4">
              <span className="text-[0.67rem] font-black uppercase tracking-[0.16em] text-graf-950">Comparação rápida</span>
              <span className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-jb-700">Até 3 equipamentos</span>
            </div>

            <div className="relative grid grid-cols-3 divide-x divide-jb-100">
              {[0, 1, 2].map((indice) => {
                const produto = itens[indice];
                return (
                  <div key={produto?.slug ?? `slot-${indice}`} className="min-w-0 px-2 sm:px-4">
                    <span className="text-[0.56rem] font-black uppercase tracking-[0.15em] text-jb-700">0{indice + 1}</span>
                    <div
                      data-palco-imagem-produto
                      className="relative mt-2 aspect-square overflow-hidden rounded-[1.25rem] bg-[#fff9f9]"
                    >
                      {produto?.imageUrl ? (
                        <Image
                          data-imagem-produto
                          src={imagemProdutoSemFundo(produto.imageUrl)}
                          alt={produto.imageAlt || produto.name}
                          fill
                          unoptimized={produto.imageUrl.startsWith("/")}
                          sizes="(max-width: 640px) 28vw, 14rem"
                          className="object-contain p-2.5 transition-transform duration-500 hover:-translate-y-1 hover:scale-[1.025]"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-[0.62rem] font-black uppercase text-graf-950/55">Adicionar</span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-9 text-xs font-black leading-tight text-graf-950 sm:text-[0.8rem]">
                      {produto?.name ?? "Escolha um equipamento"}
                    </p>
                    <p className="mt-2 text-[0.78rem] font-black text-jb-700 sm:text-[0.93rem]">
                      {produto && produto.allowDirectPurchase && produto.priceCents > 0
                        ? formatarPreco(produto.priceCents)
                        : produto
                          ? "Sob consulta"
                          : "—"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-5 rounded-[1.35rem] bg-[#fff9f9] px-3 py-1 ring-1 ring-jb-100/80">
              {["Preço", "Condição", "Garantia", "Instalação"].map((item) => (
                <div key={item} className="grid grid-cols-[1.2fr_repeat(3,1fr)] items-center border-b border-jb-100 px-1 py-3 last:border-b-0">
                  <span className="text-[0.625rem] font-black uppercase tracking-[0.12em] text-graf-950">{item}</span>
                  {[0, 1, 2].map((coluna) => (
                    <span key={coluna} className="mx-auto grid size-5 place-items-center rounded-full bg-jb-500 text-white">
                      <Check className="size-3" aria-hidden />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
