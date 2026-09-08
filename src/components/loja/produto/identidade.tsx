import Image from "next/image";
import Link from "next/link";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";
import { normalizar } from "@/lib/busca/intencao";

/* ============================================================================
   Identidade do equipamento

   Abre a coluna de compra, acima do preço: marca, condição, nome e os
   identificadores que a clínica confere antes de decidir — modelo, SKU e,
   quando a venda é de uma peça física, o número de série.

   O título usa a escala `display` enquanto a coluna ocupa a tela inteira e cai
   para `title` a partir de `lg`, quando ela passa a ter pouco mais de 400px:
   48px ali dentro quebrariam o nome do equipamento em cinco linhas.

   Tudo aqui é campo do cadastro. Sem marca, sem modelo ou sem resumo, a linha
   correspondente simplesmente não existe: nada de travessão repetido ocupando
   lugar de informação.
   ============================================================================ */

export type MarcaProduto = {
  nome: string;
  slug: string;
  logo: { url: string; alt: string; largura: number | null; altura: number | null } | null;
};

export function IdentidadeProduto({
  nome,
  modelo,
  sku,
  codigoDoFabricante,
  gtin,
  codigoAnvisa,
  numeroDeSerie,
  condicao,
  definicaoDaCondicao,
  marca,
  categoria,
  resumo,
}: {
  nome: string;
  modelo: string;
  sku: string;
  /** MPN — o código da peça no fabricante. Nunca é o SKU interno da JB. */
  codigoDoFabricante?: string | null;
  /** EAN/GTIN, só dígitos e já conferido no cadastro. */
  gtin?: string | null;
  /** Registro na ANVISA, quando o equipamento tem e a JB cadastrou. */
  codigoAnvisa?: string | null;
  /** Só existe quando a venda é de uma unidade física identificada. */
  numeroDeSerie?: string | null;
  condicao: CondicaoProduto;
  definicaoDaCondicao: string | null;
  marca: MarcaProduto | null;
  categoria: { nome: string; slug: string } | null;
  resumo: string;
}) {
  const desenho = CONDICAO_PDP[condicao];

  /**
   * "Modelo: Profilaxia" numa página cuja categoria também é Profilaxia não
   * informa nada — é a categoria repetida no lugar do modelo comercial. Pior:
   * some com a linha que deveria dizer QUAL equipamento é este, e sem ela
   * ninguém compara preço com o mercado.
   *
   * Não dá para adivinhar o modelo certo, e inventar um está fora de questão.
   * O que dá para fazer é não afirmar o errado: quando o campo repete a
   * categoria, a linha não aparece, e a página fica honestamente sem modelo
   * até alguém cadastrar o de verdade. O aviso para quem cadastra está em
   * /admin/produtos, não aqui.
   */
  const modeloUtil = modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? "");

  const identificadores = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim(), mono: false } : null,
    { rotulo: "SKU", valor: sku, mono: true },
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim(), mono: true }
      : null,
    gtin?.trim() ? { rotulo: "EAN", valor: gtin.trim(), mono: true } : null,
    codigoAnvisa?.trim()
      ? { rotulo: "Registro ANVISA", valor: codigoAnvisa.trim(), mono: true }
      : null,
    numeroDeSerie ? { rotulo: "Nº de série", valor: numeroDeSerie, mono: true } : null,
  ].filter((linha) => linha !== null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {marca?.logo ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb inline-flex min-h-11 items-center rounded-md pr-1"
          >
            <Image
              src={marca.logo.url}
              alt={marca.logo.alt || marca.nome}
              width={marca.logo.largura ?? 200}
              height={marca.logo.altura ?? 60}
              className="h-7 w-auto max-w-32 object-contain object-left"
            />
          </Link>
        ) : marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb micro inline-flex min-h-11 items-center rounded-lg text-graf-600 transition-colors hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}

        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>
      </div>

      {/* Condensada em caixa alta, como o título da coleção: a ficha e a
          vitrine precisam soar como a mesma casa. O tamanho é fluido para o
          nome longo de equipamento caber em duas linhas sem encolher. */}
      <h1 className="manchete mt-3 text-[clamp(1.75rem,1.3rem+1.8vw,2.5rem)] text-graf-950">
        {nome}
      </h1>

      <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem]">
        {identificadores.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline gap-1.5">
            <dt className="micro text-graf-500">{linha.rotulo}</dt>
            <dd
              className={
                linha.mono ? "label-mono text-graf-800" : "font-semibold text-graf-800"
              }
            >
              {linha.valor}
            </dd>
          </div>
        ))}

        {categoria ? (
          <div className="flex items-baseline gap-1.5">
            <dt className="micro text-graf-500">Categoria</dt>
            <dd>
              <Link
                href={`/categoria/${categoria.slug}`}
                className="foco-jb rounded-sm font-semibold text-graf-800 underline-offset-4 transition-colors hover:text-jb-700 hover:underline"
              >
                {categoria.nome}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>

      {resumo ? (
        <p className="mt-5 text-base leading-relaxed text-graf-600">{resumo}</p>
      ) : null}

      {definicaoDaCondicao ? (
        <p className="mt-4 border-l-2 border-jb-500 pl-4 text-sm leading-relaxed text-graf-600">
          {definicaoDaCondicao}
        </p>
      ) : null}
    </div>
  );
}
