"use client";

import { useActionState } from "react";
import { Tag, X } from "lucide-react";

import { aplicarCupom } from "@/app/acoes/carrinho";
import { Botao } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Campo de cupom do carrinho.
 *
 * A ação `aplicarCupom` já existia e funcionava, o resumo já sabia mostrar o
 * desconto e o erro — só não havia por onde digitar o código. Sem este campo,
 * todo cupom cadastrado no painel era inalcançável.
 *
 * Enviar o campo vazio remove o cupom, que é o mesmo contrato da ação.
 */
export function CampoCupom({ aplicado }: { aplicado: string }) {
  const [estado, acao, enviando] = useActionState(aplicarCupom, {});

  if (aplicado) {
    return (
      <form action={acao} className="mt-4 border-t border-graf-200 pt-4">
        <input type="hidden" name="codigo" value="" />
        <div className="flex items-center justify-between gap-3 rounded-lg bg-ok-50 px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ok-700">
            <Tag className="size-4 shrink-0" aria-hidden />
            <span className="label-mono truncate font-semibold">{aplicado}</span>
          </span>
          <button
            type="submit"
            disabled={enviando}
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ok-700",
              "transition-colors hover:bg-ok-100 disabled:opacity-50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
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
    <form action={acao} className="mt-4 border-t border-graf-200 pt-4">
      <label htmlFor="codigo-cupom" className="block text-sm font-semibold text-graf-800">
        Cupom de desconto
      </label>
      <div className="mt-1.5 flex gap-2">
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
            "h-11 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm uppercase text-graf-900",
            "shadow-xs transition-colors placeholder:normal-case placeholder:text-graf-500",
            "focus:outline-none focus:ring-4",
            estado.erro
              ? "border-jb-500 focus:border-jb-600 focus:ring-jb-500/20"
              : "border-graf-300 hover:border-graf-400 focus:border-jb-500 focus:ring-jb-500/15",
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
          "mt-1.5 text-xs leading-relaxed",
          estado.erro ? "text-jb-700" : "text-ok-700",
        )}
      >
        {estado.erro ?? estado.ok ?? ""}
      </p>
    </form>
  );
}
