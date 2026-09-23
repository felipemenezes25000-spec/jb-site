"use client";

import { useActionState, useState } from "react";
import { Check, Send } from "lucide-react";

import { responderAvaliacao, type EstadoDaAvaliacao } from "@/app/acoes/avaliacao";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Formulário de avaliação

   A autorização para publicar continua desmarcada por padrão. O acabamento
   visual ganha mais clareza e conforto de toque, mas a regra de consentimento
   permanece exatamente a mesma.
   ============================================================================ */

const VAZIO: EstadoDaAvaliacao = {};
const NOTAS = [1, 2, 3, 4, 5];

const LEGENDA: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Boa",
  5: "Muito boa",
};

export function FormularioAvaliacao({
  token,
  tipo,
}: {
  token: string;
  tipo: "compra" | "servico";
}) {
  const [estado, executar, pendente] = useActionState(responderAvaliacao, VAZIO);
  const [nota, setNota] = useState<number | null>(null);
  const [autoriza, setAutoriza] = useState(false);

  if (estado.ok) {
    return (
      <div className="jb-avaliacao-sucesso">
        <Aviso tom="sucesso" titulo="Recebido">
          {estado.ok}
          {autoriza
            ? " Antes de publicar qualquer trecho, alguém da equipe vai conferir o texto."
            : " A sua resposta fica só com a equipe."}
        </Aviso>
      </div>
    );
  }

  return (
    <form action={executar} className="jb-avaliacao-form space-y-6">
      {estado.erro ? (
        <Aviso tom="erro" titulo="Não foi possível enviar">
          {estado.erro}
        </Aviso>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <fieldset className="jb-avaliacao-nota rounded-2xl border border-graf-200 bg-white p-4 sm:p-5">
        <legend className="px-1 text-base font-extrabold text-graf-950">
          {tipo === "compra"
            ? "Como foi a experiência de compra?"
            : "Como foi o atendimento técnico?"}
        </legend>
        <p className="mt-1 text-sm leading-relaxed text-graf-500">Escolha a opção que mais combina com a experiência.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {NOTAS.map((valor) => (
            <label
              key={valor}
              className={cn(
                "jb-avaliacao-opcao flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-[border-color,background-color,color,transform,box-shadow] active:scale-[0.98] sm:px-4",
                nota === valor
                  ? "border-jb-600 bg-jb-600 text-white shadow-[0_16px_32px_-24px_rgb(224_20_27/0.7)]"
                  : "border-graf-300 bg-white text-graf-800 hover:border-jb-300 hover:bg-jb-50",
              )}
            >
              <input
                type="radio"
                name="score"
                value={valor}
                checked={nota === valor}
                onChange={() => setNota(valor)}
                className="sr-only"
                required
              />
              <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-lg bg-current/10 font-extrabold">
                {valor}
              </span>
              <span className="font-semibold">{LEGENDA[valor]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="jb-avaliacao-campo rounded-2xl border border-graf-200 bg-white p-4 sm:p-5">
        <Campo
          rotulo="De 0 a 10, o quanto você indicaria a JB? (opcional)"
          name="nps"
          type="number"
          min={0}
          max={10}
          inputMode="numeric"
        />
      </div>

      <div className="jb-avaliacao-campo rounded-2xl border border-graf-200 bg-white p-4 sm:p-5">
        <Area
          rotulo="O que você quer contar?"
          name="comentario"
          rows={5}
          maxLength={2000}
          ajuda="Pode ser elogio, reclamação ou sugestão. Chega inteiro para a equipe, do jeito que você escrever."
        />
      </div>

      <div className="jb-avaliacao-consentimento rounded-2xl border border-graf-200 bg-graf-50 p-4 sm:p-5">
        <Marcador
          rotulo="Autorizo a JB a publicar este comentário no site"
          name="autoriza"
          value="sim"
          checked={autoriza}
          onChange={(evento) => setAutoriza(evento.target.checked)}
          ajuda="Sem marcar, a sua resposta fica só com a equipe. Marcando, alguém da JB confere o texto antes de publicar — e você pode pedir a retirada a qualquer momento."
        />

        {autoriza ? (
          <div className="mt-4 border-t border-graf-200 pt-4">
            <Campo
              rotulo="Como quer ser identificado"
              name="nome"
              maxLength={80}
              placeholder="Ex.: Clínica no Butantã, ou o seu nome"
              ajuda="Em branco, o depoimento aparece sem identificação."
            />
          </div>
        ) : null}
      </div>

      <Botao type="submit" carregando={pendente} tamanho="lg" className="w-full sm:w-auto">
        {autoriza ? <Check className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        Enviar resposta
      </Botao>
    </form>
  );
}
