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
  sku: string;
  condicao: CondicaoProduto;
  definicao: string | null;
  marca: { nome: string; slug: string } | null;
  categoria: { nome: string; slug: string } | null;
};

type PropsDetalhes = {
  descricaoHtml?: string;
  modelo: string;
  sku: string;
  codigoDoFabricante?: string | null;
  gtin?: string | null;
  numeroDeSerie?: string | null;
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
  sku,
  condicao,
  definicao,
  marca,
  categoria,
}: Props) {
  const desenho = CONDICAO_PDP[condicao];
  const avaliacao = await carregarResumoAvaliacoesProdutoPorSku(sku);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>
        {marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb micro inline-flex min-h-8 items-center font-extrabold text-graf-800 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}
        {categoria ? (
          <>
            <span className="text-graf-300" aria-hidden>•</span>
            <Link
              href={`/categoria/${categoria.slug}`}
              className="foco-jb texto-apoio inline-flex min-h-8 items-center font-semibold text-graf-500 hover:text-graf-900"
            >
              {categoria.nome}
            </Link>
          </>
        ) : null}
      </div>

      <h1
        id="titulo-produto"
        className="fonte-display mt-3 text-[clamp(2rem,1.55rem+1.45vw,3rem)] leading-[1.04] tracking-[-0.035em] text-graf-950"
      >
        {nome}
      </h1>

      {avaliacao ? (
        <a
          href="#avaliacoes-verificadas"
          aria-label={`${avaliacao.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 em ${avaliacao.total} ${avaliacao.total === 1 ? "avaliação verificada" : "avaliações verificadas"}`}
          className="foco-jb mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-graf-200 bg-graf-50/80 px-3 text-xs font-semibold text-graf-600 transition-all hover:border-graf-300 hover:bg-white hover:text-jb-700"
        >
          <span className="tabular inline-flex items-center gap-1 font-extrabold text-graf-950">
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
        <p className="mt-4 max-w-[50ch] text-[1.05rem] leading-7 text-graf-600">{resumo}</p>
      ) : null}

      {definicao ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-jb-100 bg-jb-50/65 px-4 py-3.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-jb-100">
            <BadgeCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="micro text-jb-700">Condição deste equipamento</p>
            <p className="mt-1 text-sm leading-5 text-graf-700">{definicao}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const LIMITE_NA_COLUNA = 8;

export function DetalhesDoProduto({
  descricaoHtml,
  modelo,
  sku,
  codigoDoFabricante,
  gtin,
  numeroDeSerie,
  categoria,
  destaques,
}: PropsDetalhes) {
  const modeloUtil = Boolean(
    modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? ""),
  );

  const identificadores: Identificador[] = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim() } : null,
    { rotulo: "SKU", valor: sku },
    numeroDeSerie?.trim() ? { rotulo: "Nº de série", valor: numeroDeSerie.trim() } : null,
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim() }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim() } : null,
  ].filter((identificador): identificador is Identificador => identificador !== null);

  const essenciais = destaques.slice(0, LIMITE_NA_COLUNA);
  const restantes = destaques.length - essenciais.length;
  const temDiferencial = Boolean(descricaoHtml?.trim());

  if (essenciais.length === 0 && identificadores.length === 0 && !temDiferencial) return null;

  return (
    <div className="min-w-0">
      {temDiferencial ? (
        <div className="border-t border-graf-200 pt-5 lg:mt-6">
          <p className="micro text-graf-500">Por que este modelo</p>
          <div
            className="prose-jb mt-2.5 text-corpo text-graf-700 [&_li]:leading-6 [&_p]:leading-6 [&>*+*]:mt-2"
            dangerouslySetInnerHTML={{ __html: descricaoHtml! }}
          />
        </div>
      ) : null}

      {essenciais.length > 0 ? (
        <div className={`border-t border-graf-200 pt-5 ${temDiferencial ? "mt-5" : "lg:mt-6"}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="micro text-graf-500">Dados que decidem a compra</p>
            <a
              href="#ficha-tecnica"
              className="foco-jb texto-apoio inline-flex min-h-8 items-center font-bold text-jb-700 hover:text-jb-800"
            >
              Ficha completa
            </a>
          </div>
          <dl className="mt-2.5 grid overflow-hidden rounded-xl border border-graf-200 bg-graf-50/45">
            {essenciais.map((destaque, indice) => (
              <div
                key={`${destaque.rotulo}-${destaque.valor}`}
                className={`flex min-w-0 items-baseline justify-between gap-5 px-3.5 py-2.5 ${indice > 0 ? "border-t border-graf-200" : ""}`}
              >
                <dt className="micro shrink-0 text-graf-500">{destaque.rotulo}</dt>
                <dd className="min-w-0 break-words text-right text-sm font-extrabold leading-5 text-graf-950">
                  {destaque.valor}
                </dd>
              </div>
            ))}
          </dl>
          {restantes > 0 ? (
            <p className="mt-2 text-xs leading-5 text-graf-500">
              + {restantes} {restantes === 1 ? "especificação" : "especificações"} na ficha completa.
            </p>
          ) : null}
        </div>
      ) : null}

      {identificadores.length > 0 ? (
        <details className="group mt-4 border-t border-hairline pt-2">
          <summary className="foco-jb texto-apoio flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 font-bold text-graf-500 hover:text-graf-900 [&::-webkit-details-marker]:hidden">
            Identificação do produto
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {identificadores.map((identificador) => (
              <div key={identificador.rotulo} className="min-w-0">
                <dt className="micro text-graf-400">{identificador.rotulo}</dt>
                <dd className="label-mono mt-0.5 break-all text-graf-700">
                  {identificador.valor}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
