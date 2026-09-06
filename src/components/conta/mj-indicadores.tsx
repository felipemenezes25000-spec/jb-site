import { Activity, Info } from "lucide-react";

import { Cartao } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import {
  leituraDoIndice,
  type Disponibilidade,
  type IndiceDeManutencao,
} from "@/lib/indicadores";
import { cn } from "@/lib/utils";

/* ============================================================================
   Os dois indicadores da Área da Clínica

   O desenho destes componentes é uma consequência do tipo que eles recebem:
   `Disponibilidade` e `IndiceDeManutencao` são uniões discriminadas, e o
   TypeScript obriga a tratar o caso "não dá para calcular". Não existe caminho
   em que a ausência de histórico vire um número.

   E quando o número existe, ele nunca aparece sozinho. Período, cobertura e
   fórmula ficam ao lado — porque "97,8%" sem o denominador é uma afirmação que
   ninguém consegue conferir, e o escopo exige que dê para conferir.
   ============================================================================ */

/* ------------------------------------------------------- disponibilidade */

export function DisponibilidadeDoParque({
  dados,
  className,
}: {
  dados: Disponibilidade;
  className?: string;
}) {
  if (!dados.calculavel) {
    return (
      <Cartao className={cn("p-5", className)}>
        <p className="flex items-center gap-2 text-sm font-bold text-graf-950">
          <Activity className="size-4 shrink-0 text-graf-400" aria-hidden />
          Disponibilidade do parque
        </p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">{dados.motivo}</p>
        {dados.diasObservados > 0 ? (
          <p className="mt-2 text-[0.8125rem] text-graf-500">
            Observação acumulada até agora: {dados.diasObservados} dias-equipamento.
          </p>
        ) : null}
      </Cartao>
    );
  }

  return (
    <Cartao className={cn("p-5", className)}>
      <p className="flex items-center gap-2 text-sm font-bold text-graf-950">
        <Activity className="size-4 shrink-0 text-graf-400" aria-hidden />
        Disponibilidade do parque
      </p>

      <p className="tabular mt-3 text-display leading-none text-graf-950">
        {dados.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%
      </p>

      {/* O denominador fica junto do número, não num rodapé. Um percentual sem
          a base é uma afirmação que ninguém consegue conferir. */}
      <dl className="mt-4 space-y-1.5 border-t border-graf-200 pt-4 text-[0.8125rem] text-graf-600">
        <Par
          rotulo="Período"
          valor={`${formatarData(dados.inicio)} a ${formatarData(dados.fim)}`}
        />
        <Par
          rotulo="Cobertura"
          valor={`${dados.diasObservados} dias-equipamento, em ${dados.equipamentos} ${
            dados.equipamentos === 1 ? "aparelho" : "aparelhos"
          }`}
        />
        <Par rotulo="Dias parados" valor={`${dados.diasParados}`} />
      </dl>

      <p className="mt-4 text-[0.8125rem] leading-relaxed text-graf-500">
        <strong className="font-semibold text-graf-700">Como calculamos:</strong> soma dos dias
        em que cada equipamento esteve no parque, menos os dias com parada registrada, dividida
        pelo total de dias-equipamento observados. Aparelho que entrou depois conta só a partir
        da entrada.
      </p>
    </Cartao>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-graf-500">{rotulo}</dt>
      <dd className="tabular font-semibold text-graf-800">{valor}</dd>
    </div>
  );
}

/* --------------------------------------------------- índice de manutenção */

export function IndiceDoEquipamento({
  indice,
  className,
}: {
  indice: IndiceDeManutencao;
  className?: string;
}) {
  if (!indice.calculavel) {
    return (
      <Cartao className={cn("p-5", className)}>
        <p className="text-sm font-bold text-graf-950">Índice de manutenção</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">{indice.motivo}</p>
        <ul className="mt-3 space-y-1.5">
          {indice.falta.map((item) => (
            <li key={item} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-graf-600">
              <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-graf-400" />
              <span>Falta {item}.</span>
            </li>
          ))}
        </ul>
      </Cartao>
    );
  }

  return (
    <Cartao className={cn("p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-graf-950">Índice de manutenção</p>
        <p className="tabular text-2xl font-extrabold text-graf-950">{indice.nota}</p>
      </div>

      <p className="mt-1 text-[0.9375rem] font-semibold text-graf-700">
        {leituraDoIndice(indice.nota)}
      </p>

      {/* Os fatos que produziram a nota, não só a nota. */}
      <ul className="mt-4 space-y-3 border-t border-graf-200 pt-4">
        {indice.fatores.map((fator) => (
          <li key={fator.nome}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.8125rem]">
              <span className="font-semibold text-graf-800">{fator.nome}</span>
              <span className="tabular text-graf-500">
                peso {Math.round(fator.peso * 100)}%
              </span>
            </p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-graf-600">
              {fator.observado}
            </p>
          </li>
        ))}
      </ul>

      {/*
        A ressalva não é rodapé jurídico: ela muda o que o número significa.
        O índice mede MANUTENÇÃO, não a condição do aparelho — e os pesos são
        convenção de produto, não modelo validado de risco de falha. Dizer o
        contrário transformaria um indicador de tela em laudo técnico que
        ninguém emitiu.
      */}
      <p className="mt-4 flex gap-2 border-t border-graf-200 pt-4 text-[0.8125rem] leading-relaxed text-graf-500">
        <Info className="mt-0.5 size-3.5 shrink-0 text-graf-400" aria-hidden />
        <span>
          O índice mede se a manutenção está em dia — não a condição nem a segurança do
          equipamento. Os pesos acima são critério da JB, não um modelo validado de risco de
          falha.
        </span>
      </p>
    </Cartao>
  );
}
