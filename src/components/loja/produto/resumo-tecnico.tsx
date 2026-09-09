import Link from "next/link";

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
    modeloUtil ? { rotulo: "Modelo", valor: modelo.trim() } : null,
    { rotulo: "SKU", valor: sku },
    codigoDoFabricante?.trim()
      ? { rotulo: "Cód. fabricante", valor: codigoDoFabricante.trim() }
      : null,
    gtin?.trim() ? { rotulo: "GTIN", valor: gtin.trim() } : null,
    numeroDeSerie?.trim()
      ? { rotulo: "Nº de série", valor: numeroDeSerie.trim() }
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

      {resumo ? (
        <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-6 text-graf-600">{resumo}</p>
      ) : null}

      {destaques.length > 0 ? (
        <div className="mt-5">
          <p className="mb-3 text-[0.65rem] font-extrabold uppercase tracking-[0.11em] text-graf-500">
            O essencial deste equipamento
          </p>
          <dl
            aria-label="Principais características técnicas"
            className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-graf-200 py-4"
          >
            {destaques.map((destaque) => (
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

      {identificadores.length > 0 ? (
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-graf-100 pb-4">
          {identificadores.map((identificador) => (
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

      {definicao ? (
        <p className="mt-4 border-l-2 border-jb-500 pl-3 text-xs leading-5 text-graf-600">
          {definicao}
        </p>
      ) : null}
    </div>
  );
}
