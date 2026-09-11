import type { Metadata } from "next";
import { ChartColumn, Info, TriangleAlert } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { Cartao } from "@/components/ui/data";
import { DEFINICOES, FUSO, type ValorDoIndicador } from "@/lib/insights";
import {
  chamadosPorModelo,
  idadeDoParque,
  intervaloEntreIntervencoes,
  pecasSubstituidas,
  preventivasVencidas,
  reincidencia,
  tempoAteDecisao,
} from "@/lib/insights-consultas";
import { exigirArea } from "@/lib/permissoes";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = { title: "JB Insights" };

/* ============================================================================
   JB Insights

   Cada indicador aparece com a definição ao lado, não abaixo de um "saiba
   mais". O escopo pede janela, população, denominador, exclusões, fuso, volume
   mínimo e efeito de dado faltante — e a razão de tudo isso ficar visível é
   que este painel produz frases que saem daqui e viram argumento de venda.

   "Marca X tem mais chamados" é a frase mais perigosa que este projeto pode
   gerar. Sem base de equipamentos instalados, ela mede quantos aparelhos
   daquela marca a JB atende, e não a qualidade deles. A ressalva não é rodapé:
   ela é o que impede o número de ser lido ao contrário.
   ============================================================================ */

function Indicador({
  chave,
  valor,
}: {
  chave: string;
  valor: ValorDoIndicador;
}) {
  const definicao = DEFINICOES.find((item) => item.chave === chave);
  if (!definicao) return null;

  return (
    <Cartao className="p-5">
      <h2 className="text-base font-bold text-graf-950">{definicao.titulo}</h2>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-graf-600">{definicao.oQueMede}</p>

      {valor.suficiente ? (
        <ul className="mt-4 space-y-2">
          {valor.linhas.map((linha) => (
            <li
              key={linha.rotulo}
              className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-graf-100 pb-2 last:border-0"
            >
              <span className="text-[0.875rem] text-graf-700">{linha.rotulo}</span>
              <span className="tabular font-bold text-graf-950">
                {linha.valor.toLocaleString("pt-BR")}{" "}
                <span className="text-[0.75rem] font-normal text-graf-500">{linha.unidade}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        /* "Ainda não há dados suficientes" é uma resposta, e o escopo permite
           explicitamente. O que ele proíbe é semear métrica ilustrativa para a
           tela parecer pronta — e não há nenhuma aqui. */
        <p className="mt-4 rounded-lg border border-dashed border-graf-300 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600">
          {valor.motivo}
        </p>
      )}

      <dl className="mt-4 space-y-2 border-t border-graf-200 pt-4 text-apoio">
        <Linha rotulo="Janela" valor={definicao.janela} />
        <Linha rotulo="População" valor={definicao.populacao} />
        {definicao.denominador ? (
          <Linha rotulo="Denominador" valor={definicao.denominador} />
        ) : (
          <Linha rotulo="Denominador" valor="Não há — é contagem absoluta." />
        )}
        <Linha rotulo="Volume mínimo" valor={`${definicao.volumeMinimo} observações`} />
        <div>
          <dt className="text-graf-500">Fica de fora</dt>
          <dd>
            <ul className="mt-1 space-y-1">
              {definicao.exclusoes.map((exclusao) => (
                <li key={exclusao} className="flex gap-2 leading-relaxed text-graf-700">
                  <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-graf-400" />
                  <span>{exclusao}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {/* A ressalva. Ela muda o que o número significa, e por isso tem
          destaque próprio em vez de virar mais uma linha da lista. */}
      <p className="mt-4 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-apoio leading-relaxed text-amber-900">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
        <span>{definicao.naoConclui}</span>
      </p>
    </Cartao>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-3">
      <dt className="shrink-0 text-graf-500">{rotulo}</dt>
      <dd className="min-w-0 flex-1 text-graf-700">{valor}</dd>
    </div>
  );
}

export default async function PaginaInsights() {
  await exigirArea("insights");

  const [chamados, pecas, intervalo, idade, preventivas, reincidiu, decisao] = await Promise.all([
    chamadosPorModelo(),
    pecasSubstituidas(),
    intervaloEntreIntervencoes(),
    idadeDoParque(),
    preventivasVencidas(),
    reincidencia(),
    tempoAteDecisao(),
  ]);

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Sistema" }, { rotulo: "JB Insights" }]}
        titulo="JB Insights"
        descricao={`Indicadores do parque atendido pela JB. Todas as datas no fuso ${FUSO}.`}
      />

      <Aviso tom="info" titulo="Como ler estes números">
        Cada indicador vem com a definição do que foi medido e com o que ele{" "}
        <strong>não</strong> permite concluir. Abaixo do volume mínimo, o número não aparece —
        e nenhum dado ilustrativo foi semeado para a tela parecer pronta.
        <br />
        <br />
        Nada aqui é público. Publicar agregado exige clínicas suficientes e nenhuma delas
        dominando o conjunto, e a regra está em <span className="label-mono">
          podePublicarAgregado
        </span>
        . Não há ranking público de clientes nem de marcas.
      </Aviso>

      <div className="grid gap-4 xl:grid-cols-2">
        <Indicador chave="chamados_por_modelo" valor={chamados} />
        <Indicador chave="pecas_substituidas" valor={pecas} />
        <Indicador chave="intervalo_entre_intervencoes" valor={intervalo} />
        <Indicador chave="idade_do_parque" valor={idade} />
        <Indicador chave="preventivas_vencidas" valor={preventivas} />
        <Indicador chave="reincidencia" valor={reincidiu} />
        <Indicador chave="tempo_ate_decisao" valor={decisao} />
      </div>

      <Cartao className="p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
          <ChartColumn className="size-4 text-graf-500" aria-hidden />
          O que estes indicadores não são
        </h2>
        <ul className="mt-3 space-y-2.5 text-[0.875rem] leading-relaxed text-graf-700">
          <li className="flex gap-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
            <span>
              <strong>Não são um ranking de qualidade de marca.</strong> Contagem de chamados
              mede quantos equipamentos daquela marca a JB atende. Sem a base instalada e sem
              exposição comparável, a comparação entre marcas não se sustenta.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
            <span>
              <strong>Não são MTBF nem vida útil.</strong> O intervalo entre intervenções mede
              dias entre duas OS concluídas — com preventiva programada no meio, chamado por
              sintoma e equipamento que passou tempo parado.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
            <span>
              <strong>Não são a visão do cliente.</strong> A clínica vê os próprios
              equipamentos na Área da Clínica, com isolamento por conta. Este painel cruza
              dados de todas, e por isso é de gestão.
            </span>
          </li>
        </ul>
      </Cartao>
    </div>
  );
}
