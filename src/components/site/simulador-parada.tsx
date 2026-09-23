"use client";

import { useId, useState } from "react";
import { CalendarX2, SlidersHorizontal } from "lucide-react";

import { medir } from "@/lib/analytics/cliente";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";

/* ============================================================================
   Quanto a parada custa na agenda

   Dois números que só a clínica sabe (pacientes por dia e dias sem o
   equipamento) e uma multiplicação. Nenhum valor em reais e nenhuma projeção
   da JB: o impacto mostrado vem só dos próprios números de quem está usando.

   É cenário, não previsão: o texto diz "potencialmente" e lembra que nem toda
   consulta depende do mesmo equipamento. O número troca na hora em que o
   controle anda — sem contagem animada, que só atrasaria a leitura.
   ============================================================================ */

const MENSAGEM =
  "Olá, JB! Vim pelo site. Tenho um equipamento com problema e quero entender o próximo passo da assistência. Podem me ajudar?";

function Controle({
  rotulo,
  valor,
  minimo,
  maximo,
  unidade,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  minimo: number;
  maximo: number;
  unidade: string;
  aoMudar: (valor: number) => void;
}) {
  const id = useId();
  const preenchido = ((valor - minimo) / (maximo - minimo)) * 100;

  return (
    <div className="jb-simulador-controle rounded-xl border border-graf-200 bg-white/80 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-graf-800">
          {rotulo}
        </label>
        <span className="tabular text-lg font-extrabold text-graf-950">
          {valor} <span className="text-sm font-semibold text-graf-500">{unidade}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={1}
        value={valor}
        onChange={(evento) => aoMudar(Number(evento.target.value))}
        className="jb-deslizante mt-3 h-11 w-full cursor-pointer appearance-none bg-transparent"
        style={{ "--preenchido": `${preenchido}%` } as React.CSSProperties}
      />
    </div>
  );
}

export function SimuladorParada({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const [pacientes, setPacientes] = useState(12);
  const [dias, setDias] = useState(3);
  const [mexeu, setMexeu] = useState(false);

  const total = pacientes * dias;

  function mudar(setter: (valor: number) => void) {
    return (valor: number) => {
      setter(valor);
      if (!mexeu) {
        setMexeu(true);
        medir("downtime_calculated", { etapa: "simulador" });
      }
    };
  }

  return (
    <div className="jb-simulador-premium overflow-hidden rounded-[1.65rem] border border-graf-200 bg-white shadow-raised">
      <div className="flex items-start justify-between gap-4 border-b border-graf-100 px-5 py-5 sm:px-7">
        <div>
          <p className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.15em] text-jb-700">
            <SlidersHorizontal className="size-4" aria-hidden />
            Seus próprios números
          </p>
          <h3 className="mt-2 text-xl font-extrabold tracking-tight text-graf-950 sm:text-2xl">
            Quanto uma parada pode mexer na agenda?
          </h3>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-3">
          <Controle
            rotulo="Pacientes por dia"
            valor={pacientes}
            minimo={1}
            maximo={40}
            unidade="por dia"
            aoMudar={mudar(setPacientes)}
          />
          <Controle
            rotulo="Dias com o equipamento parado"
            valor={dias}
            minimo={1}
            maximo={10}
            unidade={dias === 1 ? "dia" : "dias"}
            aoMudar={mudar(setDias)}
          />
        </div>

        <div className="jb-simulador-resultado relative mt-5 overflow-hidden rounded-[1.25rem] bg-graf-950 p-5 text-white sm:p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.36),transparent)]"
          />
          <div className="relative flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/10">
              <CalendarX2 className="size-6" aria-hidden />
            </span>
            <p className="min-w-0 leading-tight">
              <span className="tabular block font-display text-[3.2rem] font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                {total.toLocaleString("pt-BR")}
              </span>
              <span className="mt-2 block text-sm font-bold text-white/80">
                consultas potencialmente afetadas
              </span>
            </p>
          </div>
          <p className="relative mt-4 text-xs font-medium leading-relaxed text-white/60">
            Cenário simples: pacientes por dia × dias de parada. Nem toda consulta depende do
            mesmo equipamento; isto não é previsão financeira nem prazo de conserto da JB.
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          Cenário de {total} consultas potencialmente afetadas com {pacientes} pacientes por dia e {dias}{" "}
          {dias === 1 ? "dia" : "dias"} de parada.
        </p>

        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={MENSAGEM}
          posicao="secao"
          tamanho="lg"
          lado
          className="mt-5"
        />
      </div>
    </div>
  );
}
