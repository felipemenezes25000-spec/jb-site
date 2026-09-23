"use client";

import { useId, useState } from "react";
import { Check, MessageCircleMore } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { medir } from "@/lib/analytics/cliente";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { SITUACOES, montarMensagem, type Equipamento, type IdSituacao } from "@/lib/diagnostico";
import { cn } from "@/lib/utils";

/* ============================================================================
   Qual é o defeito? E com quem falar

   Na abertura das páginas de equipamento, os defeitos viram marcadores: um
   toque escolhe (outro toque desfaz), e Jeferson e Jackson, logo abaixo,
   levam o defeito escrito na mensagem. Sem marcar nada, a mensagem vai só
   com o equipamento. É o diagnóstico da home reduzido ao que falta, porque o
   equipamento a página já sabe.

   Depois do defeito aparece a situação da clínica (parado, com falha, revisão)
   e, depois dela, a cidade — os dois opcionais, revelados só quando a pessoa
   já está montando a mensagem. A primeira dobra continua curta para quem quer
   só chamar, e quem responde tudo chega ao WhatsApp com a triagem completa,
   que a barra do celular também carrega.

   A cidade é texto livre: vai na mensagem e em nenhum outro lugar. Nenhum
   evento de medição recebe o que foi digitado.
   ============================================================================ */

export function EscolhaDoDefeito({
  equipamento,
  naFrase,
  contatos,
  className,
}: {
  equipamento: Equipamento;
  /** Como o equipamento entra no meio da frase: "a autoclave", "o compressor". */
  naFrase: string;
  contatos: ContatoWhatsapp[];
  className?: string;
}) {
  const [defeito, setDefeito] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<IdSituacao | null>(null);
  const [cidade, setCidade] = useState("");
  const idPergunta = useId();
  const idSituacao = useId();
  const idCidade = useId();

  function marcarDefeito(opcao: string) {
    const novo = defeito === opcao ? null : opcao;
    setDefeito(novo);
    if (novo) medir("assistance_step_2", { categoria: equipamento.id, etapa: "landing" });
  }

  function marcarSituacao(id: IdSituacao) {
    const nova = situacao === id ? null : id;
    setSituacao(nova);
    if (nova) medir("assistance_step_3", { categoria: equipamento.id, etapa: "landing", resultado: nova });
  }

  const mensagem = montarMensagem({ equipamento: equipamento.id, defeito, situacao, cidade });

  return (
    <div
      className={cn(
        "relative overflow-clip rounded-2xl border border-graf-200/90 bg-white p-4 shadow-[0_24px_65px_-46px_rgb(17_19_21/0.55)] sm:p-5",
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
            O que está acontecendo com {naFrase}?{" "}
            <span className="font-medium text-graf-600">(opcional)</span>
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-jb-100 bg-jb-50 px-2.5 py-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-jb-700 sm:inline-flex">
          Triagem rápida
        </span>
      </div>

      <ul aria-labelledby={idPergunta} className="relative mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {equipamento.defeitos.map((opcao) => {
          const marcado = defeito === opcao;
          return (
            <li key={opcao} className="min-w-0 sm:w-auto">
              <button
                type="button"
                aria-pressed={marcado}
                onClick={() => marcarDefeito(opcao)}
                className={cn(
                  "foco-jb inline-flex min-h-11 w-full items-center justify-start gap-2 rounded-xl border px-3 py-2.5 text-left text-[0.8125rem] font-bold leading-tight shadow-[0_10px_25px_-24px_rgb(17_19_21/0.55)] transition-[border-color,color,background-color,box-shadow] duration-200 active:scale-[0.97] sm:w-auto sm:px-4 sm:text-sm",
                  marcado
                    ? "border-jb-500 bg-jb-500 text-white shadow-[0_16px_32px_-24px_rgb(224_20_27/0.75)]"
                    : "border-graf-200 bg-white text-graf-800 hover:border-jb-300 hover:bg-jb-50 hover:text-jb-800",
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

      {defeito ? (
        <div className="jb-passo-entra relative mt-4">
          <p id={idSituacao} className="text-xs font-extrabold text-graf-800">
            Como está a clínica agora? <span className="font-medium text-graf-600">(opcional)</span>
          </p>
          <ul aria-labelledby={idSituacao} className="mt-2 grid gap-2 sm:grid-cols-3">
            {SITUACOES.map((item) => {
              const marcado = situacao === item.id;
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => marcarSituacao(item.id)}
                    className={cn(
                      "foco-jb flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-[0.8125rem] font-bold leading-tight transition-[border-color,color,background-color] duration-200 active:scale-[0.98]",
                      marcado
                        ? "border-jb-500 bg-jb-50 text-jb-800"
                        : "border-graf-200 bg-white text-graf-800 hover:border-jb-300 hover:bg-jb-50",
                    )}
                  >
                    {item.rotulo}
                  </button>
                </li>
              );
            })}
          </ul>

          {situacao ? (
            <div className="jb-passo-entra mt-3">
              <label htmlFor={idCidade} className="block text-xs font-extrabold text-graf-800">
                Cidade da clínica <span className="font-medium text-graf-600">(opcional)</span>
              </label>
              <input
                id={idCidade}
                type="text"
                inputMode="text"
                autoComplete="address-level2"
                enterKeyHint="done"
                maxLength={60}
                value={cidade}
                onChange={(evento) => setCidade(evento.target.value)}
                placeholder="Ex.: Osasco"
                className="mt-1.5 min-h-11 w-full rounded-lg border border-graf-300 bg-white px-3.5 text-base text-graf-900 placeholder:text-graf-450 focus:border-jb-500 focus:outline-2 focus:outline-offset-1 focus:outline-jb-500/30"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Os dois atendentes antes da nota: no celular, a primeira dobra termina
          nos botões, e a explicação vem logo embaixo. */}
      <div className="relative mt-4 border-t border-graf-100 pt-4">
        {/* `lado`: duas colunas iguais que encolhem com o cartão. Com a largura
            mínima de antes, em 1024px o Jackson passava da borda e era cortado. */}
        <OpcoesWhatsapp contatos={contatos} mensagem={mensagem} equipamento={equipamento.id} posicao="abertura" lado />
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-graf-600" aria-live="polite">
          <MessageCircleMore className="size-3.5 shrink-0 text-graf-500" aria-hidden />
          <span>
            {defeito
              ? `“${defeito}” já vai escrito para a equipe. Você revisa no WhatsApp antes de enviar.`
              : "Dá para chamar sem escolher nada. Você revisa a mensagem no WhatsApp antes de enviar."}
          </span>
        </p>
      </div>
    </div>
  );
}
