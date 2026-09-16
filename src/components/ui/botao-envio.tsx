"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   O botão que sabe que está enviando

   Toda mutação desta loja é uma ida ao servidor de vários segundos. Sem
   indicação, o clique parece não ter acontecido: a auditoria concluiu que o
   cupom estava quebrado, que o favorito não salvava e que o carrinho não
   funcionava — os três funcionavam, só demoravam em silêncio. Quem usa o site
   de verdade chega à mesma conclusão, clica de novo, duplica ou desiste.

   `useFormStatus` resolve isso sem transformar a grade inteira em componente
   de cliente: ele lê o estado do `<form>` acima, então o cartão do catálogo
   continua sendo Server Component e só o botão hidrata. Vinte e quatro
   cartões numa página, vinte e quatro botões minúsculos.

   `data-pending` fica no DOM de propósito: é por ele que o teste de estado de
   carregamento verifica a resposta em menos de 200 ms com a rede lenta.
   ============================================================================ */

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Substitui o conteúdo enquanto envia. Sem isto, só entra o giro. */
  carregando?: React.ReactNode;
  /** Escondido do leitor de tela — o `aria-label` do botão já descreve a ação. */
  className?: string;
};

export function BotaoEnvio({
  children,
  carregando,
  className,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      className={cn(className, pending && "cursor-progress")}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {carregando}
        </>
      ) : (
        children
      )}
    </button>
  );
}
