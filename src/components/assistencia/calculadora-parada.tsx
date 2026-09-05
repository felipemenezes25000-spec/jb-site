"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";
import { formatarPreco, plural } from "@/lib/format";

/**
 * Quanto custa o equipamento parado.
 *
 * A calculadora não sabe nada sobre a clínica de quem usa: todos os números
 * são digitados por ela. Não há média de mercado escondida, nem multiplicador
 * "de referência" inventado — só a aritmética, mostrada linha a linha na tela
 * para poder ser conferida.
 *
 * A conta começa zerada de propósito. Um valor sugerido no campo viraria, na
 * prática, um número da JB dentro de um resultado que é do cliente.
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
    <Cartao className={className}>
      <div className="grid gap-8 p-6 lg:grid-cols-2 lg:p-8">
        {/* ------------------------------------------------------ entradas */}
        <div>
          <h3 className="text-lg font-bold text-graf-950">Os números são seus</h3>
          <p className="mt-1 text-sm leading-relaxed text-graf-600">
            Preencha com a realidade da sua clínica. Nada aqui é enviado para a JB — a
            conta acontece no seu navegador.
          </p>

          <div className="mt-6 grid gap-5">
            <CampoMoeda
              rotulo="Quanto a cadeira fatura por hora"
              valorCents={receitaHoraCents}
              aoMudar={setReceitaHoraCents}
              ajuda="Digite só os números: 25000 vira R$ 250,00."
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo
                rotulo="Horas por dia"
                type="text"
                inputMode="numeric"
                value={horasPorDia}
                onChange={(evento) => setHorasPorDia(evento.target.value)}
                maxLength={2}
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
              />
            </div>

            <CampoMoeda
              rotulo="Custo médio do reparo de urgência"
              valorCents={reparoCents}
              aoMudar={setReparoCents}
              ajuda="Opcional. Peça mais mão de obra, quando você já tem esse histórico."
            />
          </div>
        </div>

        {/* ---------------------------------------------------- resultado */}
        <div className="rounded-xl bg-graf-50 p-6 ring-1 ring-inset ring-graf-200">
          <h3 className="text-lg font-bold text-graf-950">A conta, passo a passo</h3>

          {completo ? (
            <>
              <ol className="mt-5 space-y-3" aria-live="polite">
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

              <div className="mt-6 border-t border-graf-300 pt-5">
                <p className="label-mono uppercase text-graf-500">Custo da parada no ano</p>
                <p className="tabular mt-1 text-display font-bold leading-none text-jb-600">
                  {formatarPreco(totalNoAno)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-graf-600">
                  É o que a clínica deixa de faturar
                  {reparoCents > 0 ? " somado ao que gasta consertando" : ""} quando o
                  equipamento para nas condições que você informou.
                </p>
              </div>

              <LinkBotao href="/planos-de-manutencao" className="mt-6" larguraTotal>
                Comparar planos de manutenção
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-graf-600" aria-live="polite">
              Informe o faturamento por hora e quantas horas, dias e vezes por ano o
              equipamento fica fora do ar. O resultado aparece aqui, com cada multiplicação
              à mostra.
            </p>
          )}
        </div>
      </div>
    </Cartao>
  );
}

function Linha({ conta, resultado }: { conta: string; resultado: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-dashed border-graf-300 pb-3 last:border-0">
      <span className="text-sm text-graf-600">{conta}</span>
      <span className="tabular text-sm font-bold text-graf-900">{resultado}</span>
    </li>
  );
}
