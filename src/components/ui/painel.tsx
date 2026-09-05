"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { BotaoIcone } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ============================================================================
   Painel — modal e gaveta lateral
   Em cima do <dialog> nativo, e de propósito: o navegador já dá camada
   superior, fundo inerte, Esc e devolução de foco de graça. O que fazemos
   aqui é só o que ele não faz — travar a rolagem do corpo, fechar clicando
   no fundo e garantir que o foco volte para quem abriu.

   O estado mora no componente pai (`aberto` / `aoFechar`): o diálogo nunca
   se fecha sozinho, para não sair de sincronia com quem o controla.
   ============================================================================ */

export type LadoPainel = "direita" | "esquerda";
export type TamanhoPainel = "sm" | "md" | "lg" | "xl";

const LARGURAS: Record<TamanhoPainel, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Painel({
  aberto,
  aoFechar,
  titulo,
  descricao,
  lado,
  tamanho = "md",
  rodape,
  children,
  className,
  fecharNoFundo = true,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Obrigatório: é o nome acessível do diálogo. */
  titulo: string;
  descricao?: string;
  /** Sem `lado`, é um modal centralizado; com `lado`, vira gaveta. */
  lado?: LadoPainel;
  tamanho?: TamanhoPainel;
  rodape?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fecharNoFundo?: boolean;
}) {
  const refDialogo = useRef<HTMLDialogElement>(null);
  const refGatilho = useRef<HTMLElement | null>(null);
  const base = useId();
  const idTitulo = `${base}-titulo`;
  const idDescricao = `${base}-descricao`;

  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo) return;

    if (aberto && !dialogo.open) {
      refGatilho.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
      refGatilho.current?.focus();
      refGatilho.current = null;
    }
  }, [aberto]);

  // O <dialog> nativo não trava a rolagem do documento atrás dele.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  const gaveta = Boolean(lado);

  return (
    <dialog
      ref={refDialogo}
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      onCancel={(evento) => {
        // Deixar o navegador fechar sozinho tiraria o estado do pai de sincronia.
        evento.preventDefault();
        aoFechar();
      }}
      onClick={(evento) => {
        if (!fecharNoFundo) return;
        if (evento.target === evento.currentTarget) aoFechar();
      }}
      className={cn(
        "w-[calc(100%-1.5rem)] overflow-hidden bg-white p-0 text-graf-800 shadow-pop",
        "backdrop:bg-graf-950/55",
        LARGURAS[tamanho],
        gaveta
          ? cn(
              "my-0 h-dvh max-h-dvh",
              lado === "esquerda" ? "ml-0 mr-auto rounded-r-2xl" : "ml-auto mr-0 rounded-l-2xl",
            )
          : "m-auto max-h-[calc(100dvh-2rem)] rounded-2xl",
        className,
      )}
    >
      {aberto ? (
        <div className={cn("flex flex-col", gaveta ? "h-dvh" : "max-h-[calc(100dvh-2rem)]")}>
          <header className="flex items-start justify-between gap-4 border-b border-graf-200 px-5 py-4">
            <div className="min-w-0">
              <h2 id={idTitulo} className="text-base font-bold text-graf-950">
                {titulo}
              </h2>
              {descricao ? (
                <p id={idDescricao} className="mt-0.5 text-sm leading-relaxed text-graf-500">
                  {descricao}
                </p>
              ) : null}
            </div>
            <BotaoIcone
              type="button"
              rotulo="Fechar"
              variante="sutil"
              onClick={aoFechar}
              className="-mr-1 shrink-0"
            >
              <X className="size-5" aria-hidden />
            </BotaoIcone>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

          {rodape ? (
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-graf-200 bg-graf-50 px-5 py-4">
              {rodape}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** Atalho para a gaveta lateral — mesmo componente, `lado` já definido. */
export function PainelLateral({
  lado = "direita",
  ...props
}: Omit<React.ComponentProps<typeof Painel>, "lado"> & { lado?: LadoPainel }) {
  return <Painel {...props} lado={lado} />;
}
