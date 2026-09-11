import Link from "next/link";
import { BadgeCheck, ChevronDown, Star } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";
import { normalizar } from "@/lib/busca/intencao";
import { carregarResumoAvaliacoesProdutoPorSku } from "@/lib/marketplace/avaliacoes-produto";
import type { DestaqueProduto } from "@/lib/marketplace/resumo-produto";

/* ============================================================================
   Coluna de contexto da ficha de produto

   Duas correções de fundo em relação à versão anterior:

   1. O `h1` usava `clamp(1.8rem, …, 2.55rem)` — 40px numa coluna de 376px, três
      linhas de altura, e maior que qualquer ficha de produto usada como
      referência cujo título seja uma *descrição* e não um nome de marca
      (Mercado Livre 22px, Amazon e Dental Cremer 24px, Newegg 20px). Agora usa
      `text-title`, que é o degrau do design system para exatamente isto.

   2. As "Principais características" eram quatro cartões com borda e fundo
      próprios, dentro da coluna de resumo, ao lado da caixa de compra, dentro
      da seção — caixa dentro de caixa dentro de caixa. Agora são filetes: a
      mesma informação, sem a moldura.

   Os tamanhos avulsos (`text-[0.6rem]`, `text-[0.625rem]`, `text-[0.6875rem]`,
   `text-corpo`) saíram em favor de `micro`, `texto-apoio` e da escala
   nativa — todos já documentados em `globals.css`.
   ============================================================================ */

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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>
        {marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb micro inline-flex min-h-9 items-center text-graf-700 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}
        {categoria ? (
          <Link
            href={`/categoria/${categoria.slug}`}
            className="foco-jb texto-apoio inline-flex min-h-9 items-center font-semibold text-graf-500 hover:text-graf-900"
          >
            · {categoria.nome}
          </Link>
        ) : null}
      </div>

      <h1 id="titulo-produto" className="text-title mt-2 text-graf-950">
        {nome}
      </h1>

      {avaliacao ? (
        <a
          href="#avaliacoes-verificadas"
          aria-label={`${avaliacao.media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5 em ${avaliacao.total} ${avaliacao.total === 1 ? "avaliação verificada" : "avaliações verificadas"}`}
          className="foco-jb texto-apoio mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg font-semibold text-graf-600 transition-colors hover:text-jb-700"
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
        <p className="mt-3 max-w-[52ch] text-base leading-6 text-graf-600">{resumo}</p>
      ) : null}

      {definicao ? (
        <p className="texto-apoio mt-4 border-l-2 border-jb-500 pl-3 text-graf-600">
          {definicao}
        </p>
      ) : null}
    </div>
  );
}

/* ============================================================================
   Detalhes técnicos da coluna de contexto

   Bloco separado da identidade por causa do celular. Empilhado, o topo saía
   como marca → `h1` → resumo → quatro linhas de características → gaveta de
   identificação → **só então a foto** → e a caixa de compra depois dela: a
   390px, 700px de rolagem até ver o equipamento e ~1.100px até o preço.
   Nenhuma ficha medida como referência coloca tabela antes da foto.

   Como slot próprio do grid, isto desce para depois da compra no celular e
   volta para baixo do resumo, na mesma coluna, a partir de 768px.
   ============================================================================ */

/**
 * Quantas especificações a coluna do meio carrega antes de mandar para a ficha.
 *
 * Eram 4, cortadas de uma lista que todo produto do catálogo tem com 5 ou 6 —
 * ou seja, a ficha escondia uma ou duas linhas na dobra e repetia as outras
 * quatro 1.100px abaixo, dentro de "Especificações técnicas". A coluna do meio
 * ficava com 410px de conteúdo ao lado de uma caixa de compra de 773px.
 *
 * O teto continua existindo porque o catálogo pode receber equipamento com
 * quarenta atributos, e a dobra não é lugar de tabela longa. Oito é o que cabe
 * sem empurrar a gaveta de identificação para fora da primeira tela.
 */
export const LIMITE_NA_COLUNA = 8;
export function DetalhesDoProduto({
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

  if (essenciais.length === 0 && identificadores.length === 0) return null;

  return (
    <div className="min-w-0">
      {essenciais.length > 0 ? (
        <div className="border-t border-graf-200 pt-4 lg:mt-6">
          <p className="micro text-graf-500">Especificações</p>
          {/* Filetes, não cartões: as linhas dividem uma régua e não carregam
              moldura própria. O mesmo desenho de `GradeDados`, na ficha.

              Uma por linha, rótulo à esquerda e valor à direita. Eram duas
              colunas, e a coluna do meio tem ~430px a 1440: cada célula ficava
              com ~200px para caber "Secagem / A vácuo, 20 min", e o valor
              quebrava em duas linhas. Numa faixa só, o valor cabe inteiro e a
              lista lê como tabela de ficha — que é o que ela é. */}
          <dl className="mt-1 grid border-graf-150 [&>*:nth-child(n+2)]:border-t">
            {essenciais.map((destaque) => (
              <div
                key={`${destaque.rotulo}-${destaque.valor}`}
                className="flex min-w-0 items-baseline justify-between gap-5 border-graf-150 py-2.5"
              >
                <dt className="micro shrink-0 text-graf-500">{destaque.rotulo}</dt>
                <dd className="min-w-0 break-words text-right text-base font-extrabold leading-5 text-graf-950">
                  {destaque.valor}
                </dd>
              </div>
            ))}
          </dl>
          {restantes > 0 ? (
            <a
              href="#ficha-tecnica"
              className="foco-jb texto-apoio mt-2 inline-flex min-h-10 items-center font-bold text-jb-700 hover:text-jb-800"
            >
              Ver mais {restantes} {restantes === 1 ? "especificação" : "especificações"}
            </a>
          ) : null}
        </div>
      ) : null}

      {identificadores.length > 0 ? (
        <details className="group mt-4 border-t border-graf-150 pt-2">
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
