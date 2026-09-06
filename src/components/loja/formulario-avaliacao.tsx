"use client";

import { useActionState, useState } from "react";
import { Check, Send } from "lucide-react";

import { responderAvaliacao, type EstadoDaAvaliacao } from "@/app/acoes/avaliacao";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   O formulário de avaliação

   A caixa de autorização é a peça central desta tela, e ela vem **desmarcada**.
   Marcada por padrão seria consentimento por inércia — a pessoa responde a
   pesquisa e descobre depois que virou depoimento no site.

   O nome só é pedido depois de a caixa ser marcada. Pedir antes daria a
   entender que ele será usado de qualquer jeito.
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
      <Aviso tom="sucesso" titulo="Recebido">
        {estado.ok}
        {autoriza
          ? " Antes de publicar qualquer trecho, alguém da equipe vai conferir o texto."
          : " A sua resposta fica só com a equipe."}
      </Aviso>
    );
  }

  return (
    <form action={executar} className="space-y-6">
      {estado.erro ? (
        <Aviso tom="erro" titulo="Não foi possível enviar">
          {estado.erro}
        </Aviso>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <fieldset>
        <legend className="text-base font-bold text-graf-950">
          {tipo === "compra"
            ? "Como foi a experiência de compra?"
            : "Como foi o atendimento técnico?"}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {NOTAS.map((valor) => (
            <label
              key={valor}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
                nota === valor
                  ? "border-jb-600 bg-jb-600 text-white"
                  : "border-graf-300 bg-white text-graf-800 hover:border-graf-400 hover:bg-graf-50",
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
              <span className="tabular">{valor}</span>
              <span className="font-normal">{LEGENDA[valor]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        rotulo="De 0 a 10, o quanto você indicaria a JB? (opcional)"
        name="nps"
        type="number"
        min={0}
        max={10}
        inputMode="numeric"
      />

      <Area
        rotulo="O que você quer contar?"
        name="comentario"
        rows={5}
        maxLength={2000}
        ajuda="Pode ser elogio, reclamação ou sugestão. Chega inteiro para a equipe, do jeito que você escrever."
      />

      {/* --------------------------------------------- a autorização ---

          Desmarcada. Sempre. Marcada por padrão seria consentimento por
          inércia — e depoimento publicado sem alguém ter escolhido publicar
          é exatamente o que este projeto não faz. */}
      <div className="rounded-lg border border-graf-200 bg-graf-50 p-4">
        <Marcador
          rotulo="Autorizo a JB a publicar este comentário no site"
          name="autoriza"
          value="sim"
          checked={autoriza}
          onChange={(evento) => setAutoriza(evento.target.checked)}
          ajuda="Sem marcar, a sua resposta fica só com a equipe. Marcando, alguém da JB confere o texto antes de publicar — e você pode pedir a retirada a qualquer momento."
        />

        {autoriza ? (
          <div className="mt-4">
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

      <Botao type="submit" carregando={pendente}>
        {autoriza ? <Check className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        Enviar resposta
      </Botao>
    </form>
  );
}
