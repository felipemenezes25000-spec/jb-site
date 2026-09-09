import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GitCompareArrows, Sparkles } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";
import { formatarPreco } from "@/lib/format";
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

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-y border-graf-950/10 py-14 lg:py-20",
        fundo === "nevoa" ? "bg-[#fff9f9]" : "bg-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-48 -top-48 size-[30rem] rounded-full border border-jb-100"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 size-[22rem] rounded-full border-[2.2rem] border-jb-50"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-7 border-b border-graf-950 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-[2px] w-9 bg-jb-600" aria-hidden />
              <p className="micro text-jb-700">{sobretitulo}</p>
              {etiqueta ? (
                <span className="rounded-full border border-jb-500 bg-white px-2.5 py-1 text-[0.62rem] font-black tracking-[0.15em] text-jb-700">
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
            className="group foco-jb inline-flex min-h-12 w-fit items-center gap-5 rounded-lg border border-graf-950 bg-white py-2 pl-5 pr-2.5 text-[0.8rem] font-black uppercase tracking-[0.08em] text-graf-950 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised"
          >
            {rotuloDoLink}
            <span className="grid size-8 place-items-center rounded-full bg-jb-500 text-white transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </Link>
        </div>

        <div className="relative mt-8">
          <span className="pointer-events-none absolute -left-2 -top-7 hidden font-display text-[6rem] font-black leading-none text-jb-500/[0.055] lg:block" aria-hidden>
            {variante === "ofertas" ? "%" : variante === "seminovos" ? "R" : variante === "procurados" ? "↑" : "JB"}
          </span>
          <GradeVitrine
            produtos={produtos}
            parcelamento={parcelamento}
            colunas={colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 }}
            className="relative z-10"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-jb-100 pt-5 text-[0.72rem] font-black uppercase tracking-[0.12em] text-graf-950">
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
    <section className="relative isolate overflow-hidden border-y border-jb-200 bg-[#fffafa] py-16 lg:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_8%,rgba(214,24,34,0.07),transparent_25%)]"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-jb-500 text-white">
                <GitCompareArrows className="size-4" aria-hidden />
              </span>
              <p className="micro text-jb-700">{sobretitulo}</p>
            </div>

            <h2 className="manchete mt-5 max-w-[14ch] text-[clamp(2.15rem,3.8vw,4.25rem)] leading-[0.94] text-graf-950">
              {titulo}
            </h2>
            <p className="mt-6 max-w-xl text-[1rem] font-medium leading-[1.65] text-graf-950">
              {texto}
            </p>

            <ul className="mt-7 grid gap-3 text-[0.82rem] font-black text-graf-950 sm:grid-cols-2">
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
              className="group foco-jb mt-8 inline-flex min-h-13 items-center gap-6 rounded-lg bg-jb-500 py-2 pl-6 pr-2.5 text-[0.9rem] font-black text-white transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-600"
            >
              {rotulo}
              <span className="grid size-9 place-items-center rounded-full bg-white text-jb-600 transition-transform group-hover:translate-x-1">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </div>

          <div className="relative rounded-2xl border border-graf-950 bg-white p-3 shadow-raised sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-graf-950 pb-4">
              <span className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-graf-950">Comparação rápida</span>
              <span className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-jb-700">Até 3 equipamentos</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((indice) => {
                const produto = itens[indice];
                return (
                  <div key={produto?.slug ?? `slot-${indice}`} className="min-w-0 rounded-xl border border-jb-100 bg-white p-2.5 sm:p-3.5">
                    <span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-jb-700">0{indice + 1}</span>
                    <div className="relative mt-2 aspect-square overflow-hidden rounded-lg border border-jb-100 bg-white">
                      {produto?.imageUrl ? (
                        <Image
                          src={produto.imageUrl}
                          alt={produto.imageAlt || produto.name}
                          fill
                          unoptimized={produto.imageUrl.startsWith("/")}
                          sizes="(max-width: 640px) 28vw, 14rem"
                          className="object-contain p-2"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-[0.65rem] font-black uppercase text-graf-950">Adicionar</span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-9 text-[0.72rem] font-black leading-tight text-graf-950 sm:text-[0.82rem]">
                      {produto?.name ?? "Escolha um equipamento"}
                    </p>
                    <p className="mt-2 text-[0.8rem] font-black text-jb-700 sm:text-[0.95rem]">
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

            <div className="mt-3 overflow-hidden rounded-lg border border-jb-100">
              {["Preço", "Condição", "Garantia", "Instalação"].map((item, linha) => (
                <div key={item} className="grid grid-cols-[1.2fr_repeat(3,1fr)] items-center border-b border-jb-100 bg-white px-3 py-3 last:border-b-0">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-graf-950">{item}</span>
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
