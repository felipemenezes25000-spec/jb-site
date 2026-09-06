import { ClipboardCheck } from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import { Etiqueta, type Tom } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";

/* ============================================================================
   A unidade física

   Seminovo, usado e recondicionado não são um modelo de catálogo: são AQUELE
   equipamento, com número de série, ano, horas de uso e um laudo do que a
   bancada verificou. Esta é a seção que mostra os dados daquela unidade e de
   mais nenhuma.

   É uma faixa da página, não um cartão dentro dela: título de seção de
   verdade no alto, laudo e dados em duas colunas abaixo. O único fundo
   colorido é o painel de dados da unidade, tingido pela condição.

   A faixa é montada aqui dentro, e não na página, para que a seção inteira
   desapareça junto com o conteúdo: unidade sem nenhum campo preenchido não
   deixa uma tira vazia com linha divisória no meio da tela.

   Campo em branco não vira linha. Se a unidade não tem ano cadastrado, a
   página não diz "—": a linha some e a seção fica menor.
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

/** Rótulo em caixa alta dos blocos internos da seção. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
      {children}
    </h3>
  );
}

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
    verificados > 0
      ? `${verificados} ${verificados === 1 ? "item verificado" : "itens verificados"}`
      : "",
    substituidas > 0
      ? `${substituidas} ${substituidas === 1 ? "peça substituída" : "peças substituídas"}`
      : "",
    reparados > 0
      ? `${reparados} ${reparados === 1 ? "item reparado" : "itens reparados"}`
      : "",
  ].filter(Boolean);

  const nadaAMostrar =
    dados.length === 0 && checklist.length === 0 && !notasDeEstado && !notasDeInspecao;
  if (nadaAMostrar) return null;

  const temLateral = dados.length > 0 || Boolean(notasDeEstado) || Boolean(notasDeInspecao);

  return (
    <Secao espaco="lg" separador>
      <div className="flex gap-4 sm:gap-5">
        <span
          aria-hidden
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${desenho.selo}`}
        >
          <ClipboardCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-section texto-forte">
            {vendida ? "A unidade que foi vendida" : "Esta unidade, item por item"}
          </h2>
          <p className="texto-guia mt-3 max-w-2xl text-graf-600">
            {checklist.length > 0
              ? "O laudo abaixo é da unidade que está à venda — não é a descrição do modelo."
              : "Os dados abaixo são da unidade que está à venda — não são a descrição do modelo."}
          </p>
          {resumo.length > 0 ? (
            <p className="mt-3 text-[0.9375rem] font-semibold text-graf-800">
              {resumo.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={
          checklist.length > 0 && temLateral
            ? "mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14"
            : "mt-10"
        }
      >
        {checklist.length > 0 ? (
          <div className={temLateral ? "min-w-0 lg:col-span-7" : "min-w-0 max-w-3xl"}>
            <Rotulo>Laudo de inspeção</Rotulo>
            <ul className="mt-3 divide-y divide-graf-200 border-t border-graf-200">
              {checklist.map((item) => {
                const resultado = RESULTADO[item.resultado] ?? RESULTADO.verificado;
                return (
                  <li key={item.id} className="py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <span className="text-[0.9375rem] font-semibold text-graf-900">
                        {item.rotulo}
                      </span>
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

        {temLateral ? (
          <div
            className={
              checklist.length > 0
                ? "min-w-0 space-y-8 lg:col-span-5"
                : "min-w-0 max-w-3xl space-y-8"
            }
          >
            {dados.length > 0 ? (
              <div className={`rounded-xl p-5 sm:p-6 ${desenho.faixa}`}>
                <Rotulo>Dados da unidade</Rotulo>
                <dl className="mt-3 divide-y divide-graf-200">
                  {dados.map((linha) => (
                    <div
                      key={linha.rotulo}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-sm text-graf-500">{linha.rotulo}</dt>
                      <dd
                        className={
                          linha.mono
                            ? "label-mono text-graf-900"
                            : "text-[0.9375rem] font-semibold tabular text-graf-900"
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
                <Rotulo>Estado de conservação</Rotulo>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-700">
                  {notasDeEstado}
                </p>
              </div>
            ) : null}

            {notasDeInspecao ? (
              <div>
                <Rotulo>Observações da revisão</Rotulo>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-700">
                  {notasDeInspecao}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Secao>
  );
}
