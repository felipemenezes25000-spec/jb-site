import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Barcode, Boxes, Cpu, FileBadge2, Hash } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";
import { normalizar } from "@/lib/busca/intencao";

/* ============================================================================
   Identidade do equipamento

   A identidade precisa responder muito rápido a quatro perguntas: o que é,
   de quem é, qual é a condição e qual é a referência exata do equipamento.
   O desenho abaixo mantém o nome como protagonista e transforma os códigos
   técnicos em uma faixa de dados escaneável, em vez de uma sequência de texto
   miúdo solto.
   ============================================================================ */

export type MarcaProduto = {
  nome: string;
  slug: string;
  logo: { url: string; alt: string; largura: number | null; altura: number | null } | null;
};

type Identificador = {
  rotulo: string;
  valor: string;
  mono: boolean;
  icone: React.ComponentType<{ className?: string }>;
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
  codigoDoFabricante?: string | null;
  gtin?: string | null;
  codigoAnvisa?: string | null;
  numeroDeSerie?: string | null;
  condicao: CondicaoProduto;
  definicaoDaCondicao: string | null;
  marca: MarcaProduto | null;
  categoria: { nome: string; slug: string } | null;
  resumo: string;
}) {
  const desenho = CONDICAO_PDP[condicao];
  const modeloUtil = modelo.trim() && normalizar(modelo) !== normalizar(categoria?.nome ?? "");

  /* A lista crua e a lista filtrada em duas constantes.

     Escrita numa só, a anotação de tipo caía sobre o RESULTADO do `.filter`,
     não sobre o literal — então o literal continuava inferido com `null`
     dentro e o `tsc` reprovava o arquivo, levando junto o `next build`, que
     roda a checagem de tipos. Com a lista crua declarada como
     `(Identificador | null)[]`, o filtro estreita o que precisa estreitar. */
  const linhas: (Identificador | null)[] = [
    modeloUtil
      ? { rotulo: "Modelo", valor: modelo.trim(), mono: false, icone: Cpu }
      : null,
    { rotulo: "SKU", valor: sku, mono: true, icone: Hash },
    codigoDoFabricante?.trim()
      ? {
          rotulo: "Cód. fabricante",
          valor: codigoDoFabricante.trim(),
          mono: true,
          icone: Boxes,
        }
      : null,
    gtin?.trim()
      ? { rotulo: "EAN / GTIN", valor: gtin.trim(), mono: true, icone: Barcode }
      : null,
    codigoAnvisa?.trim()
      ? {
          rotulo: "Registro ANVISA",
          valor: codigoAnvisa.trim(),
          mono: true,
          icone: FileBadge2,
        }
      : null,
    numeroDeSerie
      ? { rotulo: "Nº de série", valor: numeroDeSerie, mono: true, icone: BadgeCheck }
      : null,
  ];

  const identificadores = linhas.filter((linha): linha is Identificador => linha !== null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {marca?.logo ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb inline-flex min-h-11 items-center rounded-xl border border-graf-200 bg-white px-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-graf-300"
          >
            <Image
              src={marca.logo.url}
              alt={marca.logo.alt || marca.nome}
              width={marca.logo.largura ?? 200}
              height={marca.logo.altura ?? 60}
              className="h-6 w-auto max-w-28 object-contain object-left"
            />
          </Link>
        ) : marca ? (
          <Link
            href={`/marcas/${marca.slug}`}
            className="foco-jb inline-flex min-h-11 items-center rounded-xl border border-graf-200 bg-white px-3.5 text-sm font-bold text-graf-700 transition-colors hover:border-graf-300 hover:text-jb-700"
          >
            {marca.nome}
          </Link>
        ) : null}

        <Etiqueta tom={desenho.tom}>{desenho.rotulo}</Etiqueta>

        {categoria ? (
          <Link
            href={`/categoria/${categoria.slug}`}
            className="foco-jb inline-flex min-h-9 items-center rounded-full bg-graf-100 px-3 text-[0.75rem] font-bold text-graf-600 transition-colors hover:bg-graf-200 hover:text-graf-950"
          >
            {categoria.nome}
          </Link>
        ) : null}
      </div>

      <h1 className="manchete mt-4 max-w-[18ch] text-[clamp(2rem,1.45rem+2vw,2.75rem)] leading-[1.02] tracking-[-0.035em] text-graf-950">
        {nome}
      </h1>

      {resumo ? (
        <p className="mt-4 max-w-[58ch] text-[1rem] leading-7 text-graf-600 sm:text-[1.0625rem]">
          {resumo}
        </p>
      ) : null}

      {identificadores.length > 0 ? (
        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {identificadores.map((linha, indice) => {
            const Icone = linha.icone;
            return (
              <div
                key={linha.rotulo}
                className={`min-w-0 border-graf-200 px-4 py-3.5 ${
                  indice >= 2 ? "border-t" : ""
                } ${indice % 2 === 1 ? "border-l" : ""}`}
              >
                <dt className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.075em] text-graf-500">
                  <Icone className="size-3.5 shrink-0" aria-hidden />
                  {linha.rotulo}
                </dt>
                <dd
                  className={
                    linha.mono
                      ? "label-mono mt-1.5 break-words text-[0.8125rem] text-graf-900"
                      : "mt-1.5 break-words text-[0.875rem] font-bold text-graf-900"
                  }
                >
                  {linha.valor}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {definicaoDaCondicao ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-jb-100 bg-jb-50/55 px-4 py-3.5">
          <BadgeCheck className="mt-0.5 size-[18px] shrink-0 text-jb-700" aria-hidden />
          <p className="text-sm leading-6 text-graf-700">{definicaoDaCondicao}</p>
        </div>
      ) : null}
    </div>
  );
}
