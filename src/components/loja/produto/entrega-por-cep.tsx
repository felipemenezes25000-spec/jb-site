"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Loader2, MapPin, Store, Truck } from "lucide-react";

import { estimarEntrega, type EstimativaDeEntrega } from "@/app/acoes/entrega";
import { mascararCep } from "@/components/ui/campos-br";
import { formatarPreco, plural, somenteDigitos } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHAVE_CEP = "jb:cep";

export function EntregaPorCep({ produtoId }: { produtoId: string }) {
  const [cep, setCep] = useState("");
  const [lembrado, setLembrado] = useState(false);
  const [resultado, setResultado] = useState<EstimativaDeEntrega | null>(null);
  const [calculando, startTransition] = useTransition();
  const campoRef = useRef<HTMLInputElement>(null);

  const digitos = somenteDigitos(cep);
  const completo = digitos.length === 8;

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CHAVE_CEP);
      if (guardado) {
        setCep(mascararCep(guardado));
        /* O campo passa de vazio a preenchido depois de hidratar, e quem viu
           os dois estados na auditoria leu o CEP restaurado como se fosse um
           placeholder — "01319-040" parecia exemplo, não escolha dela. A linha
           abaixo do campo diz de onde veio o número. */
        setLembrado(true);
      }
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
    <section
      aria-labelledby="entrega-cep"
      className="border-t border-hairline bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,1))] px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700 ring-1 ring-jb-100">
          <Truck className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 id="entrega-cep" className="text-sm font-extrabold text-graf-950">
            Entrega para sua clínica
          </h3>
          <p className="mt-0.5 text-xs leading-4 text-graf-500">
            Consulte valor e prazo antes de fechar a compra.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
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
            placeholder="Digite seu CEP"
            maxLength={9}
            value={cep}
            onChange={(evento) => {
              setCep(mascararCep(evento.target.value));
              setResultado(null);
              setLembrado(false);
            }}
            onKeyDown={(evento) => {
              if (evento.key !== "Enter") return;
              evento.preventDefault();
              calcular();
            }}
            className="h-11 w-full rounded-xl border border-graf-300 bg-white pl-9 pr-3 text-sm tabular text-graf-900 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.5)] outline-none transition-all placeholder:text-graf-500 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10"
          />
        </div>
        <button
          type="button"
          onClick={calcular}
          disabled={!completo || calculando}
          className={cn(
            "foco-jb flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-sm font-extrabold transition-all",
            completo && !calculando
              ? "border-graf-900 bg-graf-950 text-white shadow-sm hover:-translate-y-0.5 hover:bg-graf-800"
              /* graf-400 sobre graf-100 dá 2,4:1 — o botão desabilitado ficava
                 ilegível. graf-500 mantém o "não dá para clicar" visível. */
              : "cursor-not-allowed border-graf-200 bg-graf-100 text-graf-500",
          )}
        >
          {calculando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="size-4" aria-hidden />
          )}
          Calcular
        </button>
      </div>

      {lembrado && !resultado ? (
        <p className="mt-1.5 text-xs leading-4 text-graf-500">
          Usamos o CEP que você consultou antes neste navegador. Troque se quiser outro
          endereço.
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {resultado?.ok ? `Entrega estimada: ${resultado.rotulo}.` : ""}
      </p>

      {resultado && !resultado.ok ? (
        <p className="mt-2 text-xs font-semibold text-jb-700">{resultado.erro}</p>
      ) : null}

      {resultado?.ok ? (
        <div className="mt-3 rounded-2xl border border-graf-200 bg-white px-4 py-3.5 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.45)]">
          {resultado.orcadoDepois ? (
            <div>
              <p className="text-sm font-extrabold text-graf-950">
                {resultado.motivo === "perfil_orcado"
                  ? "Frete deste equipamento é orçado à parte"
                  : "Ainda não temos tabela para este CEP"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-graf-600">
                {resultado.motivo === "perfil_orcado"
                  ? "Pelo porte, o transporte é contratado caso a caso. A JB confirma o valor antes da cobrança."
                  : "A compra segue normalmente: a equipe cota com a transportadora e confirma o valor antes de despachar."}
              </p>
            </div>
          ) : (
            <div>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-bold text-graf-900">{resultado.rotulo}</span>
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
