import Image from "next/image";
import Link from "next/link";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";

/* ============================================================================
   Identidade do equipamento

   Abre a página em largura inteira, antes de a tela se dividir entre galeria e
   caixa de compra. Marca, condição e nome ganham o espaço que um equipamento
   de dezenas de milhares de reais pede — em vez de ficarem espremidos numa
   coluna de anúncio.

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
  /** Só existe quando a venda é de uma unidade física identificada. */
  numeroDeSerie?: string | null;
  condicao: CondicaoProduto;
  definicaoDaCondicao: string | null;
  marca: MarcaProduto | null;
  categoria: { nome: string; slug: string } | null;
  resumo: string;
}) {
  const desenho = CONDICAO_PDP[condicao];

  const identificadores = [
    modelo ? { rotulo: "Modelo", valor: modelo, mono: false } : null,
    { rotulo: "SKU", valor: sku, mono: true },
    numeroDeSerie ? { rotulo: "Nº de série", valor: numeroDeSerie, mono: true } : null,
  ].filter((linha) => linha !== null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
            className="foco-jb inline-flex min-h-11 items-center rounded-md text-sm font-bold uppercase tracking-wide text-graf-600 transition-colors hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}

        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>

        {categoria ? (
          <Link
            href={`/categoria/${categoria.slug}`}
            className="foco-jb inline-flex min-h-11 items-center rounded-md text-sm text-graf-500 underline-offset-4 transition-colors hover:text-jb-700 hover:underline"
          >
            {categoria.nome}
          </Link>
        ) : null}
      </div>

      <h1 className="mt-2 max-w-4xl text-display texto-forte">{nome}</h1>

      <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {identificadores.map((linha) => (
          <div key={linha.rotulo} className="flex items-baseline gap-2">
            <dt className="text-graf-500">{linha.rotulo}</dt>
            <dd
              className={
                linha.mono
                  ? "label-mono text-graf-800"
                  : "font-semibold text-graf-800"
              }
            >
              {linha.valor}
            </dd>
          </div>
        ))}
      </dl>

      {resumo ? <p className="texto-guia mt-5 max-w-3xl text-graf-600">{resumo}</p> : null}

      {definicaoDaCondicao ? (
        <p className="mt-4 max-w-3xl border-l-2 border-jb-500 pl-4 text-sm leading-relaxed text-graf-600">
          {definicaoDaCondicao}
        </p>
      ) : null}
    </div>
  );
}
