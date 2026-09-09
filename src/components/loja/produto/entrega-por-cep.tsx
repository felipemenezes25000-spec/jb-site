"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MapPin, Store, Truck } from "lucide-react";

import { estimarEntrega, type EstimativaDeEntrega } from "@/app/acoes/entrega";
import { mascararCep } from "@/components/ui/campos-br";
import { formatarPreco, plural, somenteDigitos } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Entrega por CEP

   "Chega até mim, e quando?" era pergunta sem resposta antes do checkout. Quem
   compra equipamento de dezenas de milhares de reais não cria conta para
   descobrir se a JB entrega na cidade dele.

   O número vem de `estimarEntrega`, que roda o MESMO cálculo do pedido sobre
   as faixas cadastradas em /admin/frete. Quando não há faixa para aquele CEP,
   a resposta é "a JB confere e informa" — nunca um valor inventado, e nunca um
   prazo que a operação não assumiu.

   Três separações que o texto mantém, porque misturá-las é o erro comum do
   setor:

     entrega do equipamento  ≠  deslocamento do técnico  ≠  instalação

   Esta caixa fala só da primeira. Instalação é adicional de pedido e aparece
   na caixa de compra, com preço próprio; deslocamento entra em orçamento de
   assistência. Escrever "entrega e instalação em 5 dias" criaria uma obrigação
   que a JB não vendeu.

   O CEP fica no `localStorage` desta pessoa e não sai daqui: nenhuma chamada
   grava CEP no servidor, e a estimativa é uma leitura pura.
   ============================================================================ */

const CHAVE_CEP = "jb:cep";

export function EntregaPorCep({ produtoId }: { produtoId: string }) {
  const [cep, setCep] = useState("");
  const [resultado, setResultado] = useState<EstimativaDeEntrega | null>(null);
  const [calculando, startTransition] = useTransition();
  const campoRef = useRef<HTMLInputElement>(null);

  const digitos = somenteDigitos(cep);
  const completo = digitos.length === 8;

  /* O CEP da última consulta volta preenchido, mas NÃO recalcula sozinho: um
     resultado que aparece antes de a pessoa pedir parece resposta a outra
     pergunta. O botão continua sendo o gatilho. */
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE_CEP);
      if (guardado) setCep(mascararCep(guardado));
    } catch {
      /* navegação privada: segue sem memória do CEP */
    }
  }, []);

  function calcular() {
    if (!completo) {
      campoRef.current?.focus();
      return;
    }
    try {
      window.localStorage.setItem(CHAVE_CEP, digitos);
    } catch {
      /* idem */
    }
    startTransition(async () => {
      setResultado(await estimarEntrega(produtoId, digitos));
    });
  }

  return (
    <section aria-labelledby="entrega-cep" className="border-t border-graf-200 px-5 py-4">
      <h3
        id="entrega-cep"
        className="flex items-center gap-2 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500"
      >
        <Truck className="size-4 text-graf-500" aria-hidden />
        Entrega do equipamento
      </h3>

      <div className="mt-2.5 flex flex-col gap-2 min-[375px]:flex-row">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="cep-entrega" className="sr-only">
            CEP de entrega
          </label>
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graf-500"
            aria-hidden
          />
          <input
            ref={campoRef}
            id="cep-entrega"
            name="cep"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={cep}
            onChange={(evento) => {
              setCep(mascararCep(evento.target.value));
              setResultado(null);
            }}
            onKeyDown={(evento) => {
              if (evento.key !== "Enter") return;
              evento.preventDefault();
              calcular();
            }}
            className="h-10 w-full rounded-md border border-graf-450 bg-white pl-9 pr-3 text-sm tabular text-graf-900 outline-none transition-colors placeholder:text-graf-500 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/15"
          />
        </div>
        <button
          type="button"
          onClick={calcular}
          disabled={!completo || calculando}
          className={cn(
            "foco-jb flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-graf-300 px-4 text-sm font-bold transition-colors duration-150 min-[375px]:w-auto",
            completo && !calculando
              ? "text-graf-900 hover:border-graf-450 hover:bg-graf-50"
              : "cursor-not-allowed text-graf-500",
          )}
        >
          {calculando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Calcular
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {resultado?.ok ? `Entrega estimada: ${resultado.rotulo}.` : ""}
      </p>

      {resultado && !resultado.ok ? (
        <p className="mt-2.5 text-[0.8125rem] font-semibold text-jb-700">{resultado.erro}</p>
      ) : null}

      {resultado?.ok ? (
        <div className="mt-2.5 border-l-2 border-jb-500 bg-graf-50 px-3 py-2.5">
          {resultado.orcadoDepois ? (
            <>
              <p className="text-[0.9375rem] font-semibold text-graf-900">
                A JB confere o frete para este CEP.
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-600">
                Este endereço está fora das faixas com preço fechado. O valor entra na
                confirmação do pedido, antes da cobrança — nada é cobrado por estimativa.
              </p>
            </>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-[0.9375rem] font-semibold text-graf-900">
                  {resultado.rotulo}
                </span>
                <span className="tabular text-[0.9375rem] font-bold text-graf-950">
                  {resultado.valorCents > 0 ? formatarPreco(resultado.valorCents) : "Grátis"}
                </span>
              </p>
              {resultado.prazoDias !== null ? (
                <p className="mt-1 text-[0.8125rem] text-graf-600">
                  Prazo estimado de{" "}
                  <span className="font-semibold text-graf-800">
                    {plural(resultado.prazoDias, "dia útil", "dias úteis")}
                  </span>{" "}
                  após a confirmação do pagamento.
                </p>
              ) : (
                <p className="mt-1 text-[0.8125rem] text-graf-600">
                  O prazo é confirmado junto com o pedido.
                </p>
              )}
            </>
          )}

          {resultado.retirada ? (
            <p className="mt-3 flex gap-2 border-t border-graf-200 pt-3 text-[0.8125rem] leading-relaxed text-graf-600">
              <Store className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
              <span>
                <span className="font-semibold text-graf-800">Retirada na JB</span> —{" "}
                {resultado.retirada}
              </span>
            </p>
          ) : null}

          <p className="mt-3 border-t border-graf-200 pt-3 text-[0.75rem] leading-relaxed text-graf-500">
            Entrega do equipamento. Instalação, quando contratada, é serviço à parte e tem
            agendamento próprio.
          </p>
        </div>
      ) : null}
    </section>
  );
}
