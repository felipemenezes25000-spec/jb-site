"use client";

import { useEffect, useId, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { CalendarX2, SlidersHorizontal } from "lucide-react";

import { medir } from "@/lib/analytics/cliente";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";

/* ============================================================================
   Quanto a parada custa na agenda

   Dois números que só a clínica sabe (pacientes por dia e dias sem o
   equipamento) e uma multiplicação. Nenhum valor em reais e nenhuma projeção
   da JB: o impacto mostrado vem só dos próprios números de quem está usando.
   ============================================================================ */

const MENSAGEM =
  "Olá, JB! Vim pelo site. Tenho um equipamento com problema e não quero parar a agenda. Podem me ajudar?";

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
  const reduzir = useReducedMotion();
  const [pacientes, setPacientes] = useState(12);
  const [dias, setDias] = useState(3);
  const [mexeu, setMexeu] = useState(false);

  const total = pacientes * dias;
  const animado = useMotionValue(total);
  const exibido = useTransform(animado, (atual) => Math.round(atual).toLocaleString("pt-BR"));

  useEffect(() => {
    if (reduzir) {
      animado.set(total);
      return;
    }
    const controle = animate(animado, total, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => controle.stop();
  }, [total, reduzir, animado]);

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
            Quanto uma parada mexe na agenda?
          </h3>
        </div>
        <span className="hidden rounded-full border border-graf-200 bg-graf-50 px-3 py-1 text-xs font-bold text-graf-600 sm:inline-flex">
          sem estimativa em R$
        </span>
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
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/10 backdrop-blur">
              <CalendarX2 className="size-6" aria-hidden />
            </span>
            <p className="min-w-0 leading-tight">
              <motion.span className="tabular block font-display text-[3.2rem] font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                {exibido}
              </motion.span>
              <span className="mt-2 block text-sm font-bold text-white/80">
                consultas em risco de remarcar
              </span>
            </p>
          </div>
          <p className="relative mt-4 text-xs font-medium leading-relaxed text-white/55">
            Cálculo simples: pacientes por dia × dias de parada. Não é previsão financeira da JB.
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {total} consultas em risco com {pacientes} pacientes por dia e {dias}{" "}
          {dias === 1 ? "dia" : "dias"} parado.
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
