"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";
import { formatarPreco, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Quanto custa o equipamento parado.
 *
 * A calculadora não sabe nada sobre a clínica de quem usa: todos os números
 * são digitados por ela. Não há média de mercado escondida, nem multiplicador
 * "de referência" inventado — só a aritmética, mostrada linha a linha na tela
 * para poder ser conferida.
 *
 * A conta começa zerada de propósito. Um valor sugerido no campo viraria, na
 * prática, um número da JB dentro de um resultado que é do cliente. Pelo mesmo
 * motivo o resultado é apresentado como estimativa, e não como previsão: o que
 * entra é uma suposição de quem preenche, e o que sai também.
 */

function inteiro(valor: string, maximo: number) {
  const numero = Number(valor.replace(/\D/g, ""));
  if (!Number.isFinite(numero)) return 0;
  return Math.min(Math.max(Math.trunc(numero), 0), maximo);
}

export function CalculadoraParada({ className }: { className?: string }) {
  const [receitaHoraCents, setReceitaHoraCents] = useState(0);
  const [horasPorDia, setHorasPorDia] = useState("8");
  const [diasParados, setDiasParados] = useState("2");
  const [ocorrencias, setOcorrencias] = useState("2");
  const [reparoCents, setReparoCents] = useState(0);

  const horas = inteiro(horasPorDia, 24);
  const dias = inteiro(diasParados, 365);
  const vezes = inteiro(ocorrencias, 52);

  const horasPorOcorrencia = horas * dias;
  const perdaPorOcorrencia = horasPorOcorrencia * receitaHoraCents;
  const perdaNoAno = perdaPorOcorrencia * vezes;
  const reparosNoAno = reparoCents * vezes;
  const totalNoAno = perdaNoAno + reparosNoAno;

  const completo = receitaHoraCents > 0 && horas > 0 && dias > 0 && vezes > 0;

  return (
    <Cartao className={cn("overflow-hidden", className)}>
      <div className="grid lg:grid-cols-2">
        {/* ------------------------------------------------------ entradas */}
        <div className="p-6 sm:p-8">
          <p className="label-mono uppercase text-graf-500">Os números são seus</p>
          <h3 className="mt-2 text-title texto-forte">Preencha com a rotina da clínica</h3>
          <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-graf-600">
            Nada do que você digitar aqui chega até a JB. A conta acontece nesta tela e
            desaparece quando a página fecha.
          </p>

          <div className="mt-7 grid gap-6">
            <CampoMoeda
              rotulo="Quanto a cadeira fatura por hora"
              valorCents={receitaHoraCents}
              aoMudar={setReceitaHoraCents}
              ajuda="Digite só os números: 25000 vira R$ 250,00."
              className="sm:max-w-xs"
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo
                rotulo="Horas por dia"
                type="text"
                inputMode="numeric"
                value={horasPorDia}
                onChange={(evento) => setHorasPorDia(evento.target.value)}
                maxLength={2}
                ajuda="De atendimento."
              />
              <Campo
                rotulo="Dias parados"
                type="text"
                inputMode="numeric"
                value={diasParados}
                onChange={(evento) => setDiasParados(evento.target.value)}
                maxLength={3}
                ajuda="Por ocorrência."
              />
              <Campo
                rotulo="Vezes por ano"
                type="text"
                inputMode="numeric"
                value={ocorrencias}
                onChange={(evento) => setOcorrencias(evento.target.value)}
                maxLength={2}
                ajuda="Quantas paradas."
              />
            </div>

            <CampoMoeda
              rotulo="Custo médio do reparo de urgência"
              valorCents={reparoCents}
              aoMudar={setReparoCents}
              ajuda="Opcional. Peça mais mão de obra, quando você já tem esse histórico."
              className="sm:max-w-xs"
            />
          </div>
        </div>

        {/* ---------------------------------------------------- resultado */}
        <div className="border-t border-graf-200 bg-graf-50 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label-mono uppercase text-graf-500">A conta, passo a passo</p>
            <Etiqueta tom="neutro">Estimativa</Etiqueta>
          </div>

          {completo ? (
            <>
              <ol className="mt-6 space-y-3" aria-live="polite">
                <Linha
                  conta={`${horas} h/dia × ${plural(dias, "dia parado", "dias parados")}`}
                  resultado={`${horasPorOcorrencia} h sem atender`}
                />
                <Linha
                  conta={`${horasPorOcorrencia} h × ${formatarPreco(receitaHoraCents)} por hora`}
                  resultado={`${formatarPreco(perdaPorOcorrencia)} por parada`}
                />
                <Linha
                  conta={`${formatarPreco(perdaPorOcorrencia)} × ${plural(vezes, "parada no ano", "paradas no ano")}`}
                  resultado={`${formatarPreco(perdaNoAno)} de faturamento`}
                />
                {reparoCents > 0 ? (
                  <Linha
                    conta={`${formatarPreco(reparoCents)} de reparo × ${vezes}`}
                    resultado={`${formatarPreco(reparosNoAno)} em consertos`}
                  />
                ) : null}
              </ol>

              <div className="mt-7 border-t border-graf-300 pt-6">
                <p className="label-mono uppercase text-graf-500">
                  Custo estimado de um ano de paradas
                </p>
                <p className="tabular mt-2 text-display leading-none text-graf-950">
                  {formatarPreco(totalNoAno)}
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-600">
                  É o que a clínica deixaria de faturar
                  {reparoCents > 0 ? ", somado ao que gastaria consertando," : ""} se o
                  equipamento parasse do jeito que você descreveu acima.
                </p>
              </div>

              <p className="mt-5 text-[0.8125rem] leading-relaxed text-graf-500">
                Estimativa montada só com os números desta tela. Não é um orçamento nem
                uma previsão da JB — mude qualquer campo e o resultado muda junto.
              </p>

              <LinkBotao href="/planos-de-manutencao" className="mt-7" larguraTotal>
                Comparar planos de manutenção
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </>
          ) : (
            <p
              className="mt-6 max-w-prose text-[0.9375rem] leading-relaxed text-graf-600"
              aria-live="polite"
            >
              Informe o faturamento por hora e quantas horas, dias e vezes por ano o
              equipamento fica fora do ar. A estimativa aparece aqui, com cada
              multiplicação à mostra para você conferir.
            </p>
          )}
        </div>
      </div>
    </Cartao>
  );
}

function Linha({ conta, resultado }: { conta: string; resultado: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-graf-300 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-graf-600">{conta}</span>
      <span className="tabular text-sm font-bold text-graf-900">{resultado}</span>
    </li>
  );
}
