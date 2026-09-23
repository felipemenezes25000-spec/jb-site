"use client";

import { useId, useState } from "react";
import { Check, MessageCircleMore } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { montarMensagem, type Equipamento } from "@/lib/diagnostico";
import { cn } from "@/lib/utils";

/* ============================================================================
   Qual é o defeito? E com quem falar

   Na abertura das páginas de equipamento, os defeitos viram marcadores: um
   toque escolhe (outro toque desfaz), e Jeferson e Jackson, logo abaixo,
   levam o defeito escrito na mensagem. Sem marcar nada, a mensagem vai só
   com o equipamento. É o diagnóstico da home reduzido a um toque, porque o
   equipamento a página já sabe, e um par de botões só, em vez de um botão de
   WhatsApp por defeito.
   ============================================================================ */

export function EscolhaDoDefeito({
  equipamento,
  contatos,
  className,
}: {
  equipamento: Equipamento;
  contatos: ContatoWhatsapp[];
  className?: string;
}) {
  const [defeito, setDefeito] = useState<string | null>(null);
  const idPergunta = useId();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-graf-200/90 bg-white/90 p-4 shadow-[0_24px_65px_-46px_rgb(17_19_21/0.55)] backdrop-blur-sm sm:p-5",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.11),transparent)]"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id={idPergunta} className="text-sm font-extrabold text-graf-950 sm:text-[0.9375rem]">
            O que está acontecendo com {equipamento.nome.toLowerCase()}?
          </p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-graf-500">
            Marcar o defeito é opcional. Se escolher, ele já entra na mensagem.
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-jb-100 bg-jb-50 px-2.5 py-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-jb-700 sm:inline-flex">
          Triagem rápida
        </span>
      </div>

      <ul
        aria-labelledby={idPergunta}
        className="relative mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      >
        {equipamento.defeitos.map((opcao) => {
          const marcado = defeito === opcao;
          return (
            <li key={opcao} className="min-w-0 sm:w-auto">
              <button
                type="button"
                aria-pressed={marcado}
                onClick={() => setDefeito((atual) => (atual === opcao ? null : opcao))}
                className={cn(
                  "foco-jb inline-flex min-h-11 w-full items-center justify-start gap-2 rounded-xl border px-3 py-2.5 text-left text-[0.8125rem] font-bold leading-tight shadow-[0_10px_25px_-24px_rgb(17_19_21/0.55)] transition-[border-color,color,background-color,transform,box-shadow] duration-200 active:scale-[0.97] sm:w-auto sm:px-4 sm:text-sm",
                  marcado
                    ? "border-jb-500 bg-jb-500 text-white shadow-[0_16px_32px_-24px_rgb(224_20_27/0.75)]"
                    : "border-graf-200 bg-white/95 text-graf-800 hover:-translate-y-0.5 hover:border-jb-300 hover:bg-jb-50 hover:text-jb-800",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    marcado ? "border-white/45 bg-white/15" : "border-graf-300 bg-graf-50",
                  )}
                >
                  {marcado ? <Check className="size-3" /> : null}
                </span>
                <span>{opcao}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-5 border-t border-graf-100 pt-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-graf-600" aria-live="polite">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
            <MessageCircleMore className="size-3.5" aria-hidden />
          </span>
          <span>
            {defeito
              ? `“${defeito}” já vai escrito para a equipe.`
              : "Pode chamar agora mesmo sem escolher um defeito."}
          </span>
        </div>

        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={montarMensagem({ equipamento: equipamento.id, defeito })}
          equipamento={equipamento.id}
          posicao="abertura"
        />
      </div>
    </div>
  );
}
