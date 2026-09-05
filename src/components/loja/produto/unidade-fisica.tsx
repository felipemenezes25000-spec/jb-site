import { ClipboardCheck } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta, type Tom } from "@/components/ui/data";

/* ============================================================================
   A unidade física

   Seminovo, usado e recondicionado não são um modelo de catálogo: são AQUELE
   equipamento, com número de série, ano, horas de uso e um laudo do que a
   bancada verificou. Este bloco mostra os dados daquela unidade e de mais
   nenhuma.

   Campo em branco não vira linha. Se a unidade não tem ano cadastrado, a
   página não diz "—": a linha some e o bloco fica menor.
   ============================================================================ */

export type ItemDeChecklist = {
  id: string;
  rotulo: string;
  resultado: string;
  nota: string;
};

const RESULTADO: Record<string, { rotulo: string; tom: Tom }> = {
  verificado: { rotulo: "Verificado", tom: "ok" },
  substituido: { rotulo: "Peça substituída", tom: "andamento" },
  reparado: { rotulo: "Reparado", tom: "andamento" },
  nao_aplicavel: { rotulo: "Não se aplica", tom: "neutro" },
};

export function UnidadeFisica({
  condicao,
  numeroDeSerie,
  anoDeFabricacao,
  horasDeUso,
  ciclos,
  garantiaMeses,
  notasDeEstado,
  notasDeInspecao,
  checklist,
  vendida,
}: {
  condicao: CondicaoProduto;
  numeroDeSerie: string | null;
  anoDeFabricacao: number | null;
  horasDeUso: number | null;
  ciclos: number | null;
  garantiaMeses: number | null;
  notasDeEstado: string;
  notasDeInspecao: string;
  checklist: ItemDeChecklist[];
  /** A unidade já saiu — a página segue de pé, mas o texto muda de tempo. */
  vendida?: boolean;
}) {
  const desenho = CONDICAO_PDP[condicao];

  const dados = [
    numeroDeSerie ? { rotulo: "Número de série", valor: numeroDeSerie, mono: true } : null,
    anoDeFabricacao
      ? { rotulo: "Ano de fabricação", valor: String(anoDeFabricacao), mono: false }
      : null,
    ciclos
      ? { rotulo: "Ciclos registrados", valor: ciclos.toLocaleString("pt-BR"), mono: false }
      : null,
    horasDeUso
      ? {
          rotulo: "Horas de uso",
          valor: `${horasDeUso.toLocaleString("pt-BR")} h`,
          mono: false,
        }
      : null,
    garantiaMeses
      ? {
          rotulo: "Garantia desta unidade",
          valor: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"}`,
          mono: false,
        }
      : null,
  ].filter((linha) => linha !== null);

  const substituidas = checklist.filter((item) => item.resultado === "substituido").length;
  const reparados = checklist.filter((item) => item.resultado === "reparado").length;
  const verificados = checklist.filter((item) => item.resultado === "verificado").length;

  const resumo = [
    verificados > 0 ? `${verificados} ${verificados === 1 ? "item verificado" : "itens verificados"}` : "",
    substituidas > 0 ? `${substituidas} ${substituidas === 1 ? "peça substituída" : "peças substituídas"}` : "",
    reparados > 0 ? `${reparados} ${reparados === 1 ? "item reparado" : "itens reparados"}` : "",
  ].filter(Boolean);

  const nadaAMostrar =
    dados.length === 0 && checklist.length === 0 && !notasDeEstado && !notasDeInspecao;
  if (nadaAMostrar) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card">
      <div className={`border-b border-graf-200 px-5 py-5 sm:px-6 ${desenho.faixa}`}>
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${desenho.selo}`}
          >
            <ClipboardCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-title texto-forte">
              {vendida ? "A unidade que foi vendida" : "Esta unidade, item por item"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-graf-600">
              {checklist.length > 0
                ? "O laudo abaixo é da unidade que está à venda — não é a descrição do modelo."
                : "Os dados abaixo são da unidade que está à venda — não são a descrição do modelo."}
            </p>
            {resumo.length > 0 ? (
              <p className="mt-2.5 text-sm font-semibold text-graf-800">
                {resumo.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
        {checklist.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-graf-500">
              Laudo de inspeção
            </h3>
            <ul className="mt-3 divide-y divide-graf-100">
              {checklist.map((item) => {
                const resultado = RESULTADO[item.resultado] ?? RESULTADO.verificado;
                return (
                  <li key={item.id} className="py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <span className="text-sm font-medium text-graf-800">{item.rotulo}</span>
                      <Etiqueta tom={resultado.tom}>{resultado.rotulo}</Etiqueta>
                    </div>
                    {item.nota ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-graf-500">
                        {item.nota}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="space-y-6">
          {dados.length > 0 ? (
            <div className="rounded-lg bg-graf-50 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-graf-500">
                Dados da unidade
              </h3>
              <dl className="mt-3 space-y-3">
                {dados.map((linha) => (
                  <div
                    key={linha.rotulo}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5"
                  >
                    <dt className="text-sm text-graf-500">{linha.rotulo}</dt>
                    <dd
                      className={
                        linha.mono
                          ? "label-mono text-graf-900"
                          : "text-sm font-semibold tabular text-graf-900"
                      }
                    >
                      {linha.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {notasDeEstado ? (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-graf-500">
                Estado de conservação
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-graf-700">{notasDeEstado}</p>
            </div>
          ) : null}

          {notasDeInspecao ? (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-graf-500">
                Observações da revisão
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-graf-700">{notasDeInspecao}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
