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
  const modeloUtil = modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? "");
  const avaliacao = await carregarResumoAvaliacoesProdutoPorSku(sku);

  const principais: (Identificador | null)[] = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim() } : null,
    { rotulo: "SKU", valor: sku },
    numeroDeSerie?.trim() ? { rotulo: "Nº de série", valor: numeroDeSerie.trim() } : null,
  ];
  const identificadoresPrincipais = principais.filter(
    (identificador): identificador is Identificador => identificador !== null,
  );

  const secundarios: (Identificador | null)[] = [
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim() }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim() } : null,
  ];
  const identificadoresSecundarios = secundarios.filter(
    (identificador): identificador is Identificador => identificador !== null,
  );

  const essenciais = destaques.slice(0, 4);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>
        {marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb text-xs font-extrabold uppercase tracking-[0.08em] text-graf-700 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}
        {categoria ? (
          <Link
            href={`/categoria/${categoria.slug}`}
            className="foco-jb text-xs font-semibold text-graf-500 hover:text-graf-900"
          >
            · {categoria.nome}
          </Link>
        ) : null}
      </div>

      <h1
        id="titulo-produto"
        className="manchete mt-3 text-[clamp(1.75rem,1.35rem+1.25vw,2.5rem)] leading-[1.03] tracking-[-0.035em] text-graf-950"
      >
        {nome}
      </h1>

      {avaliacao ? (
        <a
          href="#avaliacoes-verificadas"
          aria-label={`${avaliacao.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 em ${avaliacao.total} ${avaliacao.total === 1 ? "avaliação verificada" : "avaliações verificadas"}`}
          className="foco-jb mt-3 inline-flex min-h-8 items-center gap-2 rounded-lg text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700"
        >
          <span className="inline-flex items-center gap-1 font-extrabold tabular text-graf-950">
            <Star className="size-4 fill-current text-graf-900" aria-hidden />
            {avaliacao.media.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
          <span className="text-graf-300" aria-hidden>·</span>
          <span className="underline decoration-graf-300 underline-offset-4">
            {avaliacao.total} {avaliacao.total === 1 ? "avaliação" : "avaliações"}
          </span>
          <BadgeCheck className="size-4 text-ok-700" aria-hidden />
          <span className="sr-only"> verificadas</span>
        </a>
      ) : null}

      {resumo ? (
        <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-6 text-graf-600">{resumo}</p>
      ) : null}

      {essenciais.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.11em] text-graf-500">
              O essencial deste equipamento
            </p>
            {destaques.length > essenciais.length ? (
              <a
                href="#ficha-tecnica"
                className="foco-jb text-[0.6875rem] font-bold text-jb-700 underline decoration-jb-300 underline-offset-4 hover:text-jb-800"
              >
                Ver ficha completa
              </a>
            ) : null}
          </div>
          <dl
            aria-label="Principais características técnicas"
            className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-graf-200 py-4"
          >
            {essenciais.map((destaque) => (
              <div key={`${destaque.rotulo}-${destaque.valor}`} className="min-w-0">
                <dd className="break-words text-[0.9375rem] font-extrabold leading-5 text-graf-950">
                  {destaque.valor}
                </dd>
                <dt className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.055em] text-graf-500">
                  {destaque.rotulo}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {identificadoresPrincipais.length > 0 ? (
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {identificadoresPrincipais.map((identificador) => (
            <div key={identificador.rotulo} className="flex min-w-0 items-baseline gap-1.5">
              <dt className="text-[0.62rem] font-bold uppercase tracking-[0.07em] text-graf-400">
                {identificador.rotulo}
              </dt>
              <dd className="label-mono break-all text-[0.7rem] text-graf-700">
                {identificador.valor}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {identificadoresSecundarios.length > 0 ? (
        <details className="group mt-3 border-t border-graf-100 pt-3">
          <summary className="foco-jb flex min-h-9 w-fit cursor-pointer list-none items-center gap-1.5 text-[0.6875rem] font-bold text-graf-500 hover:text-graf-900 [&::-webkit-details-marker]:hidden">
            Identificação técnica
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {identificadoresSecundarios.map((identificador) => (
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
