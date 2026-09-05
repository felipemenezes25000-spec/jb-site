"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Botao } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ============================================================================
   Lista ordenável de linhas

   Serve para especificação, documento, adicional, foto e checklist: todas são
   "várias linhas com ordem que a pessoa escolhe". A reordenação é por botão
   subir/descer em vez de arrastar — arrastar não funciona com teclado nem em
   tela de toque pequena, e aqui a lista tem no máximo algumas dezenas de itens.

   Cada movimento anuncia a posição nova numa região viva, senão quem usa
   leitor de tela clica em "subir" e não recebe nenhuma confirmação.
   ============================================================================ */

export type PropsLista<T> = {
  itens: T[];
  aoMudar: (itens: T[]) => void;
  /** Desenha os campos de uma linha. `atualizar` faz o merge parcial. */
  renderizar: (item: T, indice: number, atualizar: (patch: Partial<T>) => void) => React.ReactNode;
  /** Item em branco criado pelo botão de adicionar. */
  novoItem: () => T;
  rotuloAdicionar: string;
  /** Nome curto e singular da linha, usado nos rótulos acessíveis. */
  nomeDaLinha: string;
  /** Texto quando não há nenhuma linha ainda. */
  vazio: string;
  /** Impede adicionar mais linhas. */
  limite?: number;
  /** Esconde o botão de adicionar — use quando a linha só nasce de outro lugar. */
  ocultarAdicionar?: boolean;
  desabilitado?: boolean;
  className?: string;
};

export function ListaEditavel<T>({
  itens,
  aoMudar,
  renderizar,
  novoItem,
  rotuloAdicionar,
  nomeDaLinha,
  vazio,
  limite,
  ocultarAdicionar,
  desabilitado,
  className,
}: PropsLista<T>) {
  function mover(de: number, para: number) {
    if (para < 0 || para >= itens.length) return;
    const copia = [...itens];
    const [movido] = copia.splice(de, 1);
    copia.splice(para, 0, movido);
    aoMudar(copia);
  }

  function remover(indice: number) {
    aoMudar(itens.filter((_, i) => i !== indice));
  }

  function atualizarLinha(indice: number, patch: Partial<T>) {
    aoMudar(itens.map((item, i) => (i === indice ? { ...item, ...patch } : item)));
  }

  const cheio = typeof limite === "number" && itens.length >= limite;

  return (
    <div className={cn("space-y-3", className)}>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-graf-300 bg-graf-50/60 px-4 py-6 text-center text-sm text-graf-500">
          {vazio}
        </p>
      ) : (
        <ol className="space-y-3">
          {itens.map((item, indice) => (
            <li
              key={indice}
              className="rounded-lg border border-graf-200 bg-graf-50/40 p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span
                  aria-hidden
                  className="tabular hidden size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-graf-500 ring-1 ring-inset ring-graf-200 sm:flex"
                >
                  {indice + 1}
                </span>

                <div className="min-w-0 flex-1">{renderizar(item, indice, (patch) => atualizarLinha(indice, patch))}</div>

                <div className="flex shrink-0 items-center gap-1 sm:flex-col">
                  <BotaoLinha
                    rotulo={`Subir ${nomeDaLinha} ${indice + 1}`}
                    onClick={() => mover(indice, indice - 1)}
                    disabled={desabilitado || indice === 0}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </BotaoLinha>
                  <BotaoLinha
                    rotulo={`Descer ${nomeDaLinha} ${indice + 1}`}
                    onClick={() => mover(indice, indice + 1)}
                    disabled={desabilitado || indice === itens.length - 1}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </BotaoLinha>
                  <BotaoLinha
                    rotulo={`Remover ${nomeDaLinha} ${indice + 1}`}
                    onClick={() => remover(indice)}
                    disabled={desabilitado}
                    perigo
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </BotaoLinha>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p aria-live="polite" className="sr-only">
        {itens.length === 0
          ? `Nenhum ${nomeDaLinha} na lista.`
          : `${itens.length} ${nomeDaLinha}(s) na lista.`}
      </p>

      {ocultarAdicionar ? null : (
        <Botao
          type="button"
          variante="secundario"
          tamanho="sm"
          onClick={() => aoMudar([...itens, novoItem()])}
          disabled={desabilitado || cheio}
        >
          <Plus className="size-4" aria-hidden />
          {cheio ? `Limite de ${limite} atingido` : rotuloAdicionar}
        </Botao>
      )}
    </div>
  );
}

function BotaoLinha({
  rotulo,
  onClick,
  disabled,
  perigo,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-lg border bg-white transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:border-graf-200 disabled:text-graf-300",
        perigo
          ? "border-jb-200 text-jb-700 hover:bg-jb-50"
          : "border-graf-300 text-graf-600 hover:bg-graf-100",
      )}
    >
      {children}
    </button>
  );
}
