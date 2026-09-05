"use client";

import { useActionState } from "react";
import { Tag, X } from "lucide-react";

import { aplicarCupom } from "@/app/acoes/carrinho";
import { Botao } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Campo de cupom do carrinho.
 *
 * Enviar o campo vazio remove o cupom, que é o mesmo contrato da ação — por
 * isso a versão "aplicado" é um formulário com o código em branco, e não um
 * botão que chama outra coisa.
 */
export function CampoCupom({ aplicado }: { aplicado: string }) {
  const [estado, acao, enviando] = useActionState(aplicarCupom, {});

  if (aplicado) {
    return (
      <form action={acao} className="mt-5 border-t border-graf-200 pt-5">
        <input type="hidden" name="codigo" value="" />
        <p className="text-sm font-semibold text-graf-800">Cupom aplicado</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-ok-50 px-3.5 py-2.5 ring-1 ring-inset ring-ok-500/20">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ok-700">
            <Tag className="size-4 shrink-0" aria-hidden />
            <span className="label-mono truncate font-semibold">{aplicado}</span>
          </span>
          <button
            type="submit"
            disabled={enviando}
            className={cn(
              "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ok-700",
              "transition-colors hover:bg-ok-100 disabled:opacity-50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              // alvo de toque de 44px sem engordar a linha
              "after:absolute after:-inset-1.5 after:content-['']",
            )}
            aria-label={`Remover o cupom ${aplicado}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={acao} className="mt-5 border-t border-graf-200 pt-5">
      <label htmlFor="codigo-cupom" className="block text-sm font-semibold text-graf-800">
        Tem um cupom?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="codigo-cupom"
          name="codigo"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Digite o código"
          maxLength={40}
          aria-invalid={estado.erro ? true : undefined}
          aria-describedby={estado.erro || estado.ok ? "retorno-cupom" : undefined}
          className={cn(
            // 16px no celular: abaixo disso o iOS dá zoom ao focar
            "h-11 min-w-0 flex-1 rounded-lg border bg-white px-3.5 text-base uppercase text-graf-900 sm:text-[0.9375rem]",
            "shadow-xs transition-[border-color,box-shadow] duration-150",
            "placeholder:normal-case placeholder:text-graf-500",
            "focus:outline-none focus:ring-4",
            estado.erro
              ? "border-jb-500 focus:border-jb-600 focus:ring-jb-500/25"
              : "border-graf-450 hover:border-graf-500 focus:border-jb-500 focus:ring-jb-500/20",
          )}
        />
        <Botao type="submit" variante="secundario" carregando={enviando}>
          Aplicar
        </Botao>
      </div>

      {/* o retorno é anunciado por leitor de tela, não só mostrado */}
      <p
        id="retorno-cupom"
        role="status"
        aria-live="polite"
        className={cn(
          "text-xs leading-relaxed",
          estado.erro || estado.ok ? "mt-2" : "",
          estado.erro ? "text-jb-700" : "text-ok-700",
        )}
      >
        {estado.erro ?? estado.ok ?? ""}
      </p>
    </form>
  );
}
