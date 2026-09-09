import Link from "next/link";
import { BadgeCheck, Barcode, Boxes, Hash } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta } from "@/components/ui/data";
import { normalizar } from "@/lib/busca/intencao";
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
  icone: React.ComponentType<{ className?: string }>;
};

export function ResumoTecnicoProduto({
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
  const candidatos: (Identificador | null)[] = [
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim(), icone: Boxes } : null,
    { rotulo: "SKU", valor: sku, icone: Hash },
    codigoDoFabricante?.trim()
      ? { rotulo: "Fabricante", valor: codigoDoFabricante.trim(), icone: Boxes }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim(), icone: Barcode } : null,
    numeroDeSerie?.trim()
      ? { rotulo: "Nº de série", valor: numeroDeSerie.trim(), icone: BadgeCheck }
      : null,
  ];
  const identificadores = candidatos.filter(
    (identificador): identificador is Identificador => identificador !== null,
  );

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

      {resumo ? <p className="mt-3 text-sm leading-6 text-graf-600">{resumo}</p> : null}

      {destaques.length > 0 ? (
        <dl aria-label="Destaques técnicos" className="mt-5 divide-y divide-graf-200 border-y border-graf-200">
          {destaques.map((destaque) => (
            <div key={`${destaque.rotulo}-${destaque.valor}`} className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-xs font-semibold text-graf-500">{destaque.rotulo}</dt>
              <dd className="text-right text-sm font-extrabold text-graf-900">{destaque.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {identificadores.length > 0 ? (
        <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {identificadores.map((identificador) => {
            const Icone = identificador.icone;
            return (
              <div key={identificador.rotulo} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-graf-500">
                  <Icone className="size-3" aria-hidden />
                  {identificador.rotulo}
                </dt>
                <dd className="label-mono mt-1 break-words text-xs text-graf-800">
                  {identificador.valor}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {definicao ? (
        <p className="mt-4 border-l-2 border-jb-500 pl-3 text-xs leading-5 text-graf-600">
          {definicao}
        </p>
      ) : null}
    </div>
  );
}

