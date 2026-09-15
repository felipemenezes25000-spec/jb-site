import Link from "next/link";
import { BadgeCheck, ChevronDown, Star } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { SpecHighlights } from "@/components/specs/spec-sheet";
import type { FichaDeEspecificacoes } from "@/domain/specs/schema";
import { semQuebraNaUnidade } from "@/lib/format";
import { normalizar } from "@/lib/busca/intencao";
import { carregarResumoAvaliacoesProdutoPorSku } from "@/lib/marketplace/avaliacoes-produto";

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
  ficha: FichaDeEspecificacoes;
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
        <span
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${desenho.selo}`}
        >
          <BadgeCheck className="size-3.5" aria-hidden />
          {desenho.rotulo}
        </span>
        {/* 44px de alvo, sem engordar a linha.

            O portão de acessibilidade mediu o link da marca em 24×32px a
            390px — uma marca de três letras, "ALT", vira um alvo menor que a
            ponta do dedo, e a WCAG 2.2 pede 44×44. A altura e o respiro
            lateral entram de verdade (`min-h-11 px-2`) e o negativo devolve o
            espaço ao ritmo da fileira (`-mx-2`): o desenho não muda um pixel,
            o retângulo tocável passa a existir.

            Vale para os dois links: hoje "Biossegurança" é largo o bastante e
            passa, mas uma categoria de nome curto cairia no mesmo buraco. */}
        {marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb micro -mx-2.5 inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 font-extrabold text-graf-800 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}
        {categoria ? (
          <>
            <span className="text-graf-300" aria-hidden>•</span>
            <Link
              href={`/categoria/${categoria.slug}`}
              className="foco-jb texto-apoio -mx-2.5 inline-flex min-h-11 min-w-11 items-center justify-center px-2.5 font-semibold text-graf-500 hover:text-graf-900"
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
        {/* O nome sai com espaço inquebrável entre número e unidade: sem
            isto, "Autoclave 12 L revisada" quebra como "Autoclave 12" /
            "L revisada" e o número fica órfão no fim da linha. */}
        {semQuebraNaUnidade(nome)}
      </h1>

      {avaliacao ? (
        <a
          href="#avaliacoes-verificadas"
          aria-label={`${avaliacao.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 em ${avaliacao.total} ${avaliacao.total === 1 ? "avaliação verificada" : "avaliações verificadas"}`}
          className="foco-jb mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-graf-200 bg-graf-50/80 px-3 text-xs font-semibold text-graf-600 transition-all hover:border-graf-300 hover:bg-white hover:text-jb-700"
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

export function DetalhesDoProduto({
  descricaoHtml,
  modelo,
  sku,
  codigoDoFabricante,
  gtin,
  categoria,
  ficha,
}: PropsDetalhes) {
  const modeloUtil = Boolean(
    modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? ""),
  );

  const identificadores: Identificador[] = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim() } : null,
    { rotulo: "SKU", valor: sku },
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim() }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim() } : null,
  ].filter((identificador): identificador is Identificador => identificador !== null);

  const temDiferencial = Boolean(descricaoHtml?.trim());

  if (ficha.decisivas.length === 0 && identificadores.length === 0 && !temDiferencial) {
    return null;
  }

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

      {ficha.decisivas.length > 0 ? (
        <div className={`border-t border-graf-200 pt-5 ${temDiferencial ? "mt-5" : "lg:mt-6"}`}>
          {/* Três linhas e um link honesto.

              "Ficha completa" era promessa quebrada: levava a um bloco cujo
              conteúdo principal era a mesma lista, reordenada. O link agora diz
              quantas especificações existem de verdade, e o número vem do
              objeto da ficha — não de uma constante. */}
          <SpecHighlights ficha={ficha} />
        </div>
      ) : null}

      {identificadores.length > 0 ? (
        <details className="group mt-4 border-t border-hairline pt-2">
          <summary className="foco-jb texto-apoio -mx-2 flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 px-2 font-bold text-graf-500 hover:text-graf-900 [&::-webkit-details-marker]:hidden">
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
