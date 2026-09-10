import Link from "next/link";
import { BadgeCheck, ChevronDown, Star } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";
import { normalizar } from "@/lib/busca/intencao";
import { carregarResumoAvaliacoesProdutoPorSku } from "@/lib/marketplace/avaliacoes-produto";
import type { DestaqueProduto } from "@/lib/marketplace/resumo-produto";

type Props = {
  nome: string;
  resumo: string;
  modelo: string;
  sku: string;
  codigoDoFabricante?: string | null;
  gtin?: string | null;
  numeroDeSerie?: string | null;
  condicao: CondicaoProduto;
  definicao: string | null;
  marca: { nome: string; slug: string } | null;
  categoria: { nome: string; slug: string } | null;
  destaques: DestaqueProduto[];
};

type Identificador = {
  rotulo: string;
  valor: string;
};

export async function ResumoTecnicoProduto({
  nome,
  resumo,
  modelo,
  sku,
  codigoDoFabricante,
  gtin,
  numeroDeSerie,
  condicao,
  definicao,
  marca,
  categoria,
  destaques,
}: Props) {
  const desenho = CONDICAO_PDP[condicao];
  const modeloUtil = Boolean(
    modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? ""),
  );
  const avaliacao = await carregarResumoAvaliacoesProdutoPorSku(sku);

  const identificadores: Identificador[] = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim() } : null,
    { rotulo: "SKU", valor: sku },
    numeroDeSerie?.trim() ? { rotulo: "Nº de série", valor: numeroDeSerie.trim() } : null,
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim() }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim() } : null,
  ].filter((identificador): identificador is Identificador => identificador !== null);

  const essenciais = destaques.slice(0, 4);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>
        {marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb inline-flex min-h-9 items-center text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-graf-700 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}
        {categoria ? (
          <Link
            href={`/categoria/${categoria.slug}`}
            className="foco-jb inline-flex min-h-9 items-center text-[0.6875rem] font-semibold text-graf-500 hover:text-graf-900"
          >
            · {categoria.nome}
          </Link>
        ) : null}
      </div>

      <h1
        id="titulo-produto"
        className="manchete mt-3 text-[clamp(1.8rem,1.45rem+1.15vw,2.55rem)] leading-[1.02] tracking-[-0.04em] text-graf-950"
      >
        {nome}
      </h1>

      {avaliacao ? (
        <a
          href="#avaliacoes-verificadas"
          aria-label={`${avaliacao.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 em ${avaliacao.total} ${avaliacao.total === 1 ? "avaliação verificada" : "avaliações verificadas"}`}
          className="foco-jb mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg text-xs font-semibold text-graf-600 transition-colors hover:text-jb-700"
        >
          <span className="inline-flex items-center gap-1 font-extrabold tabular text-graf-950">
            <Star className="size-3.5 fill-current text-graf-900" aria-hidden />
            {avaliacao.media.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
          <span className="text-graf-300" aria-hidden>·</span>
          <span>{avaliacao.total} {avaliacao.total === 1 ? "avaliação" : "avaliações"}</span>
          <BadgeCheck className="size-3.5 text-ok-700" aria-hidden />
          <span className="sr-only"> verificadas</span>
        </a>
      ) : null}

      {resumo ? (
        <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-6 text-graf-600">{resumo}</p>
      ) : null}

      {essenciais.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[0.625rem] font-extrabold uppercase tracking-[0.11em] text-graf-500">
            Principais características
          </p>
          <dl aria-label="Principais características técnicas" className="grid grid-cols-2 gap-2.5">
            {essenciais.map((destaque) => (
              <div
                key={`${destaque.rotulo}-${destaque.valor}`}
                className="min-w-0 rounded-xl border border-graf-150 bg-graf-50/60 px-3.5 py-3"
              >
                <dd className="break-words text-[0.9375rem] font-extrabold leading-5 text-graf-950">
                  {destaque.valor}
                </dd>
                <dt className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.055em] text-graf-500">
                  {destaque.rotulo}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {identificadores.length > 0 ? (
        <details className="group mt-4 border-t border-graf-100 pt-2">
          <summary className="foco-jb flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 text-[0.6875rem] font-bold text-graf-500 hover:text-graf-900 [&::-webkit-details-marker]:hidden">
            Identificação do produto
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {identificadores.map((identificador) => (
              <div key={identificador.rotulo} className="min-w-0">
                <dt className="text-[0.6rem] font-bold uppercase tracking-[0.07em] text-graf-400">
                  {identificador.rotulo}
                </dt>
                <dd className="label-mono mt-0.5 break-all text-[0.7rem] text-graf-700">
                  {identificador.valor}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {definicao ? (
        <p className="mt-4 border-l-2 border-jb-500 pl-3 text-xs leading-5 text-graf-600">
          {definicao}
        </p>
      ) : null}
    </div>
  );
}
