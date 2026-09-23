"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";

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
    <div className={className}>
      <p id={idPergunta} className="text-sm font-extrabold text-graf-900">
        Qual é o defeito? Marque e ele já vai na mensagem:
      </p>
      <ul aria-labelledby={idPergunta} className="mt-3 flex flex-wrap gap-2">
        {equipamento.defeitos.map((opcao) => {
          const marcado = defeito === opcao;
          return (
            <li key={opcao}>
              <button
                type="button"
                aria-pressed={marcado}
                onClick={() => setDefeito((atual) => (atual === opcao ? null : opcao))}
                className={cn(
                  "foco-jb inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold shadow-xs transition-[border-color,color,background-color,transform] duration-200 active:scale-[0.97]",
                  marcado
                    ? "border-jb-500 bg-jb-50 text-jb-700"
                    : "border-graf-200 bg-white text-graf-800 hover:-translate-y-0.5 hover:border-jb-400 hover:text-jb-700",
                )}
              >
                {marcado ? <Check className="size-3.5" aria-hidden /> : null}
                {opcao}
              </button>
            </li>
          );
        })}
      </ul>

      <OpcoesWhatsapp
        contatos={contatos}
        mensagem={montarMensagem({ equipamento: equipamento.id, defeito })}
        equipamento={equipamento.id}
        posicao="abertura"
        className="mt-5"
      />
    </div>
  );
}
