"use client";

import { useEffect, useId, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { CalendarX2 } from "lucide-react";

import { medir } from "@/lib/analytics/cliente";
import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";

/* ============================================================================
   Quanto a parada custa na agenda

   Dois números que só o dentista sabe (pacientes por dia e dias sem o
   equipamento) e uma multiplicação. Nenhuma estimativa da JB, nenhum valor em
   reais inventado: o número assusta porque é da própria agenda de quem mexe.

   O número anima sem re-renderizar o React a cada quadro: um valor de
   movimento é interpolado e arredondado fora da árvore.
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
    <div>
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

export function SimuladorParada({ whatsapp }: { whatsapp: string }) {
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
    <div className="rounded-2xl border border-graf-200 bg-white p-5 shadow-raised sm:p-7">
      <div className="grid gap-6">
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

      <div className="mt-7 flex items-center gap-4 rounded-xl bg-jb-50 p-4 sm:p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-jb-600 shadow-xs">
          <CalendarX2 className="size-6" aria-hidden />
        </span>
        <p className="min-w-0 leading-tight">
          <motion.span className="tabular block font-display text-[2.75rem] font-extrabold leading-none tracking-tight text-jb-600 sm:text-6xl">
            {exibido}
          </motion.span>
          <span className="mt-1.5 block text-sm font-bold text-graf-800">
            consultas em risco de remarcar
          </span>
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {total} consultas em risco com {pacientes} pacientes por dia e {dias}{" "}
        {dias === 1 ? "dia" : "dias"} parado.
      </p>

      <BotaoWhatsapp
        numero={whatsapp}
        mensagem={MENSAGEM}
        posicao="secao"
        tamanho="lg"
        larguraTotal
        className="mt-5"
      />
    </div>
  );
}
