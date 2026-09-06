"use client";

import { useMemo, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";
import { formatarPreco, plural } from "@/lib/format";
import {
  calcularExposicao,
  conferirPremissas,
  resumoDasPremissas,
  type PremissasParada,
} from "@/lib/parada";
import { medir } from "@/lib/analytics/cliente";
import { CHAVE_PREMISSAS_PARADA } from "@/lib/premissas-parada";
import { cn } from "@/lib/utils";

/**
 * Quanto custa o equipamento parado.
 *
 * A calculadora não sabe nada sobre a clínica de quem usa: todos os números
 * são digitados por ela. Não há média de mercado escondida nem multiplicador
 * "de referência" inventado — só a aritmética de `src/lib/parada.ts`, mostrada
 * linha a linha na tela para poder ser conferida.
 *
 * Duas decisões que mudam o que o resultado significa:
 *
 * 1. A receita informada é a **da clínica operando normalmente**, e o quanto
 *    dela para é um percentual à parte. Antes o campo pedia "quanto a cadeira
 *    fatura" e o resultado falava em "o que a clínica deixaria de faturar" —
 *    duas unidades diferentes na mesma conta, e a diferença entre elas é o
 *    número de cadeiras. O percentual é aplicado uma vez só, e aparece como um
 *    passo próprio na memória de cálculo.
 *
 * 2. O que sai chama-se **exposição**, não economia nem lucro perdido. É
 *    receita em risco somada ao custo de reparo, com as premissas de quem
 *    preencheu. Contratar preventiva não devolve esse valor; reduz a chance de
 *    ele acontecer.
 *
 * O que a pessoa digitou não vai para a URL nem para analytics: fica nesta
 * aba, em `sessionStorage`, e só chega à JB se ela levar o resumo ao
 * formulário de proposta e enviar.
 */

/** Só dígitos, dentro de um teto. Entrada vazia vira 0, não NaN. */
function inteiro(valor: string, maximo: number) {
  const numero = Number(valor.replace(/\D/g, ""));
  if (!Number.isFinite(numero)) return 0;
  return Math.min(Math.max(Math.trunc(numero), 0), maximo);
}

export function CalculadoraParada({
  /** Para onde vai "Pedir proposta". A página de planos lê o resumo guardado. */
  hrefProposta = "/planos-de-manutencao",
  className,
}: {
  hrefProposta?: string;
  className?: string;
}) {
  const [receitaHoraCents, setReceitaHoraCents] = useState(0);
  const [percentual, setPercentual] = useState("100");
  const [horasPorDia, setHorasPorDia] = useState("8");
  const [diasParados, setDiasParados] = useState("2");
  const [ocorrencias, setOcorrencias] = useState("2");
  const [reparoCents, setReparoCents] = useState(0);
  const [guardado, setGuardado] = useState(false);

  /*
   * O objeto é memoizado, e não só os campos dele na lista do `useMemo`
   * seguinte. As duas formas calculam a mesma coisa, mas listar campo a campo
   * deixa a dependência real (`premissas`) invisível para quem lê e para o
   * linter — e um campo novo no tipo entraria sem ninguém notar que falta
   * acrescentá-lo em duas listas.
   */
  const premissas: PremissasParada = useMemo(
    () => ({
      receitaHoraCents,
      percentualAfetado: inteiro(percentual, 100),
      horasPorDia: inteiro(horasPorDia, 24),
      diasPorOcorrencia: inteiro(diasParados, 365),
      ocorrenciasPorAno: inteiro(ocorrencias, 52),
      reparoCents,
    }),
    [receitaHoraCents, percentual, horasPorDia, diasParados, ocorrencias, reparoCents],
  );

  const problemas = useMemo(() => conferirPremissas(premissas), [premissas]);
  const conta = calcularExposicao(premissas);
  const completo = problemas.length === 0;

  const erroDe = (campo: keyof PremissasParada) =>
    problemas.find((p) => p.campo === campo)?.mensagem;

  /**
   * Guarda o resumo para o formulário de proposta.
   *
   * `sessionStorage` e não parâmetro de URL: faturamento de clínica em link
   * vaza para histórico, referer e qualquer analytics que registre o caminho.
   * Aqui o dado não sai desta aba até a pessoa enviar o formulário.
   */
  function levarParaProposta() {
    /*
     * `downtime_calculated` sai aqui, no momento em que a pessoa leva o
     * resultado adiante — e não a cada tecla digitada, que produziria uma
     * medição por caractere e nenhuma informação.
     *
     * O que vai junto é só a forma da simulação: quantas ocorrências, qual
     * percentual da agenda. **Nada do dinheiro da clínica** — receita por
     * hora, custo de reparo e exposição anual ficam fora, porque são dado
     * financeiro identificável de um consultório. Eles seguem para a equipe
     * pelo lead, que é CRM interno, não métrica de produto.
     */
    medir("downtime_calculated", {
      quantidade: premissas.ocorrenciasPorAno,
      resultado: `${premissas.percentualAfetado}% da agenda`,
    });

    try {
      window.sessionStorage.setItem(
        CHAVE_PREMISSAS_PARADA,
        resumoDasPremissas(premissas, formatarPreco),
      );
      setGuardado(true);
    } catch {
      /* Aba anônima ou armazenamento bloqueado. O botão continua levando à
         página de proposta; a pessoa só terá de contar os números lá. */
      setGuardado(false);
    }
  }

  return (
    <Cartao className={cn("overflow-hidden", className)}>
      <div className="grid lg:grid-cols-2">
        {/* ------------------------------------------------------ entradas */}
        <div className="p-6 sm:p-8">
          <p className="label-mono uppercase text-graf-500">Os números são seus</p>
          <h3 className="mt-2 text-title texto-forte">Preencha com a rotina da clínica</h3>
          <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-graf-600">
            Nada do que você digitar aqui chega até a JB. A conta acontece nesta tela e
            desaparece quando a aba fecha.
          </p>

          <div className="mt-7 grid gap-6">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <CampoMoeda
                rotulo="Receita por hora da clínica"
                valorCents={receitaHoraCents}
                aoMudar={setReceitaHoraCents}
                ajuda="Com a agenda cheia, somando todas as cadeiras. Digite só números: 25000 vira R$ 250,00."
                erro={erroDe("receitaHoraCents")}
              />
              <Campo
                rotulo="% que para"
                type="text"
                inputMode="numeric"
                value={percentual}
                onChange={(evento) => setPercentual(evento.target.value)}
                maxLength={3}
                ajuda="Da agenda."
                erro={erroDe("percentualAfetado")}
              />
            </div>

            {/* A frase que evita a confusão de unidade. Fica sob os dois
                campos porque é a leitura conjunta deles que importa. */}
            <p className="-mt-2 text-[0.8125rem] leading-relaxed text-graf-500">
              Se a clínica inteira para quando este equipamento falha, deixe 100%. Se só
              uma cadeira de quatro para, informe 25%.
            </p>

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo
                rotulo="Horas por dia"
                type="text"
                inputMode="numeric"
                value={horasPorDia}
                onChange={(evento) => setHorasPorDia(evento.target.value)}
                maxLength={2}
                ajuda="De atendimento."
                erro={erroDe("horasPorDia")}
              />
              <Campo
                rotulo="Dias parados"
                type="text"
                inputMode="numeric"
                value={diasParados}
                onChange={(evento) => setDiasParados(evento.target.value)}
                maxLength={3}
                ajuda="Por ocorrência."
                erro={erroDe("diasPorOcorrencia")}
              />
              <Campo
                rotulo="Vezes por ano"
                type="text"
                inputMode="numeric"
                value={ocorrencias}
                onChange={(evento) => setOcorrencias(evento.target.value)}
                maxLength={2}
                ajuda="Quantas paradas."
                erro={erroDe("ocorrenciasPorAno")}
              />
            </div>

            <CampoMoeda
              rotulo="Custo do reparo de urgência, por ocorrência"
              valorCents={reparoCents}
              aoMudar={setReparoCents}
              ajuda="Opcional. Peça mais mão de obra, quando você já tem esse histórico."
              erro={erroDe("reparoCents")}
              className="sm:max-w-xs"
            />
          </div>
        </div>

        {/* ---------------------------------------------------- resultado */}
        <div className="border-t border-graf-200 bg-graf-50 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label-mono uppercase text-graf-500">A conta, passo a passo</p>
            <Etiqueta tom="neutro">Simulação</Etiqueta>
          </div>

          {completo ? (
            <>
              <ol className="mt-6 space-y-3" aria-live="polite">
                {premissas.percentualAfetado < 100 ? (
                  <Linha
                    conta={`${formatarPreco(receitaHoraCents)}/h × ${premissas.percentualAfetado}% da agenda`}
                    resultado={`${formatarPreco(conta.receitaAfetadaHoraCents)}/h em risco`}
                  />
                ) : null}
                <Linha
                  conta={`${premissas.horasPorDia} h/dia × ${plural(premissas.diasPorOcorrencia, "dia parado", "dias parados")}`}
                  resultado={`${conta.horasPorOcorrencia} h sem atender`}
                />
                <Linha
                  conta={`${conta.horasPorOcorrencia} h × ${formatarPreco(conta.receitaAfetadaHoraCents)} por hora`}
                  resultado={`${formatarPreco(conta.receitaEmRiscoPorOcorrenciaCents)} por parada`}
                />
                <Linha
                  conta={`${formatarPreco(conta.receitaEmRiscoPorOcorrenciaCents)} × ${plural(premissas.ocorrenciasPorAno, "parada no ano", "paradas no ano")}`}
                  resultado={`${formatarPreco(conta.receitaEmRiscoAnualCents)} de receita`}
                />
                {conta.reparosAnualCents > 0 ? (
                  <Linha
                    conta={`${formatarPreco(reparoCents)} de reparo × ${premissas.ocorrenciasPorAno}`}
                    resultado={`${formatarPreco(conta.reparosAnualCents)} em consertos`}
                  />
                ) : null}
              </ol>

              <div className="mt-7 border-t border-graf-300 pt-6">
                <p className="label-mono uppercase text-graf-500">
                  Exposição anual estimada
                </p>
                <p className="tabular mt-2 text-display leading-none text-graf-950">
                  {formatarPreco(conta.exposicaoAnualCents)}
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-600">
                  É a receita que ficaria em risco
                  {conta.reparosAnualCents > 0 ? ", somada ao custo dos consertos," : ""} se
                  o equipamento parasse do jeito que você descreveu.
                </p>
              </div>

              {/* Ausência de dado não é vantagem. Sem custo de reparo
                  informado, o total é menor do que a realidade, e quem lê
                  precisa saber disso antes de comparar com um plano. */}
              {conta.reparoDesconhecido ? (
                <p className="mt-4 flex gap-2.5 text-[0.8125rem] leading-relaxed text-graf-600">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-700" aria-hidden />
                  <span>
                    O custo do reparo não foi informado, então ele não entrou na soma. O
                    valor acima cobre só a receita em risco.
                  </span>
                </p>
              ) : null}

              <p className="mt-5 text-[0.8125rem] leading-relaxed text-graf-500">
                Simulação com os dados informados. Não representa garantia de economia ou
                ausência de falhas.
              </p>

              <div className="mt-7 grid gap-3">
                <LinkBotao href="/contato" larguraTotal onClick={levarParaProposta}>
                  Receber análise da minha clínica
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
                <LinkBotao
                  href={hrefProposta}
                  variante="secundario"
                  larguraTotal
                  onClick={levarParaProposta}
                >
                  Pedir proposta
                </LinkBotao>
              </div>

              <p className="mt-4 text-[0.8125rem] leading-relaxed text-graf-500" aria-live="polite">
                {guardado
                  ? "As premissas acima vão junto para o formulário — você confere antes de enviar."
                  : "Ao seguir, as premissas acima vão junto para o formulário, e você confere antes de enviar."}
              </p>
            </>
          ) : (
            <div className="mt-6" aria-live="polite">
              <p className="max-w-prose text-[0.9375rem] leading-relaxed text-graf-600">
                Ainda falta informação para a conta fechar. A estimativa aparece aqui, com
                cada multiplicação à mostra para você conferir.
              </p>
              <ul className="mt-4 space-y-1.5">
                {problemas.map((problema) => (
                  <li
                    key={problema.campo}
                    className="flex gap-2 text-[0.8125rem] leading-relaxed text-graf-600"
                  >
                    <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-graf-400" />
                    <span>{problema.mensagem}</span>
                  </li>
                ))}
              </ul>
            </div>
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