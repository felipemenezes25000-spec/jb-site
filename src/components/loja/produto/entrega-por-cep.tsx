"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MapPin, Store, Truck } from "lucide-react";

import { estimarEntrega, type EstimativaDeEntrega } from "@/app/acoes/entrega";
import { mascararCep } from "@/components/ui/campos-br";
import { formatarPreco, plural, somenteDigitos } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHAVE_CEP = "jb:cep";

export function EntregaPorCep({ produtoId }: { produtoId: string }) {
  const [cep, setCep] = useState("");
  const [resultado, setResultado] = useState<EstimativaDeEntrega | null>(null);
  const [calculando, startTransition] = useTransition();
  const campoRef = useRef<HTMLInputElement>(null);

  const digitos = somenteDigitos(cep);
  const completo = digitos.length === 8;

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE_CEP);
      if (guardado) setCep(mascararCep(guardado));
    } catch {
      // O cálculo continua funcionando mesmo quando o navegador bloqueia storage.
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
      // Sem persistência local, seguimos com a consulta atual.
    }

    startTransition(async () => {
      setResultado(await estimarEntrega(produtoId, digitos));
    });
  }

  return (
    <section aria-labelledby="entrega-cep" className="border-t border-graf-150 px-5 py-4 sm:px-6">
      <h3 id="entrega-cep" className="flex items-center gap-2 text-sm font-bold text-graf-800">
        <Truck className="size-4 shrink-0 text-jb-600" aria-hidden />
        Calcular frete
      </h3>

      <div className="mt-2.5 flex gap-2">
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
            className="h-11 w-full rounded-lg border border-graf-300 bg-white pl-9 pr-3 text-sm tabular text-graf-900 outline-none transition-colors placeholder:text-graf-500 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10"
          />
        </div>
        <button
          type="button"
          onClick={calcular}
          disabled={!completo || calculando}
          className={cn(
            "foco-jb flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-graf-300 px-3.5 text-sm font-bold transition-colors",
            completo && !calculando
              ? "text-graf-900 hover:border-graf-400 hover:bg-graf-50"
              : "cursor-not-allowed text-graf-400",
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
        <p className="mt-2 text-xs font-semibold text-jb-700">{resultado.erro}</p>
      ) : null}

      {resultado?.ok ? (
        <div className="mt-3 rounded-lg bg-graf-50 px-3.5 py-3">
          {resultado.orcadoDepois ? (
            <div>
              <p className="text-sm font-semibold text-graf-900">Frete sob consulta para este CEP</p>
              <p className="mt-0.5 text-xs leading-5 text-graf-600">
                A JB confirma o valor antes da cobrança.
              </p>
            </div>
          ) : (
            <div>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-graf-900">{resultado.rotulo}</span>
                <span className="tabular text-sm font-extrabold text-graf-950">
                  {resultado.valorCents > 0 ? formatarPreco(resultado.valorCents) : "Grátis"}
                </span>
              </p>
              <p className="mt-0.5 text-xs leading-5 text-graf-600">
                {resultado.prazoDias !== null
                  ? `${plural(resultado.prazoDias, "dia útil", "dias úteis")} após a confirmação do pagamento.`
                  : "Prazo confirmado junto com o pedido."}
              </p>
            </div>
          )}

          {resultado.retirada ? (
            <p className="mt-2.5 flex gap-2 border-t border-graf-200 pt-2.5 text-xs leading-5 text-graf-600">
              <Store className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
              <span>
                <span className="font-semibold text-graf-800">Retirada na JB:</span> {resultado.retirada}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
