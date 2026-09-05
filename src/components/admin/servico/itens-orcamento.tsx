"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CampoAcao, MoedaAcao } from "@/components/admin/servico/campos";
import { Botao } from "@/components/ui/button";
import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Itens da proposta

   Linhas que o técnico monta na hora de transformar o diagnóstico em
   orçamento. Os campos são controlados para que o total apareça enquanto se
   digita — mas esse total é só conferência visual: quem soma de verdade é
   `recalcularTotais` no servidor, a partir dos itens gravados.

   Os três campos repetem o mesmo `name`; `formData.getAll` devolve na ordem do
   documento, que é a ordem das linhas na tela.
   ============================================================================ */

type Linha = {
  chave: string;
  descricao: string;
  quantidade: number;
  valorCents: number;
};

function linhaNova(): Linha {
  return {
    chave: `linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descricao: "",
    quantidade: 1,
    valorCents: 0,
  };
}

export function ItensDoOrcamento({
  sugestao,
}: {
  /** Primeira linha já preenchida — costuma ser o defeito relatado. */
  sugestao?: string;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [
    { ...linhaNova(), descricao: sugestao ?? "" },
  ]);

  function atualizar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((atual) =>
      atual.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)),
    );
  }

  const total = linhas.reduce(
    (soma, linha) => soma + Math.max(0, linha.valorCents) * Math.max(1, linha.quantidade),
    0,
  );

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-graf-800">Itens da proposta</legend>

      <ul className="space-y-3">
        {linhas.map((linha, indice) => (
          <li
            key={linha.chave}
            className="grid gap-3 rounded-lg border border-graf-200 p-3 sm:grid-cols-[1fr_5rem_9rem_auto] sm:items-end"
          >
            <CampoAcao
              rotulo={`Item ${indice + 1}`}
              name="descricao"
              value={linha.descricao}
              onChange={(evento) => atualizar(linha.chave, { descricao: evento.target.value })}
              maxLength={300}
              placeholder="Ex.: substituição da placa eletrônica"
            />

            <CampoAcao
              rotulo="Qtd."
              name="quantidade"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={String(linha.quantidade)}
              onChange={(evento) =>
                atualizar(linha.chave, { quantidade: Number(evento.target.value) || 1 })
              }
            />

            <MoedaAcao
              rotulo="Valor unitário"
              nome="valorCents"
              valorCents={linha.valorCents}
              aoMudar={(centavos) => atualizar(linha.chave, { valorCents: centavos })}
              ajuda=""
            />

            <button
              type="button"
              onClick={() =>
                setLinhas((atual) =>
                  atual.length === 1
                    ? [linhaNova()]
                    : atual.filter((item) => item.chave !== linha.chave),
                )
              }
              className={cn(
                "inline-flex size-11 items-center justify-center self-end rounded-lg text-graf-500 transition-colors",
                "hover:bg-jb-50 hover:text-jb-700",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              )}
            >
              <Trash2 className="size-4" aria-hidden />
              <span className="sr-only">Remover item {indice + 1}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Botao
          type="button"
          variante="secundario"
          tamanho="sm"
          onClick={() => setLinhas((atual) => [...atual, linhaNova()])}
        >
          <Plus className="size-4" aria-hidden />
          Nova linha
        </Botao>

        <p className="text-sm text-graf-600" aria-live="polite">
          Soma dos itens:{" "}
          <span className="tabular font-bold text-graf-950">{formatarPreco(total)}</span>
        </p>
      </div>
    </fieldset>
  );
}
