"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";

import {
  alternarItemDoChecklist,
  salvarChecklistDaOS,
} from "@/app/acoes/admin-servico";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { Area } from "@/components/ui/form";
import { Botao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/* ============================================================================
   Checklist de execução da OS

   O roteiro é escrito em bloco (uma linha por item) e conferido item a item.
   Reescrever o roteiro não desmarca o que já foi conferido: o servidor casa
   pelo texto do item e preserva marcação e observação.

   Cada item tem o próprio formulário porque marcar é uma escrita imediata —
   ninguém deveria precisar apertar "salvar" depois de conferir a lâmpada do
   refletor.
   ============================================================================ */

export type ItemChecklist = {
  id: string;
  label: string;
  done: boolean;
  note: string;
};

export function ChecklistDaOS({
  ordemId,
  itens,
  podeEditar,
}: {
  ordemId: string;
  itens: ItemChecklist[];
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(itens.length === 0);
  const feitos = itens.filter((item) => item.done).length;

  return (
    <div className="space-y-4">
      {itens.length > 0 ? (
        <>
          <p className="text-sm text-graf-600">
            <span className="tabular font-semibold text-graf-900">
              {feitos} de {itens.length}
            </span>{" "}
            conferido{feitos === 1 ? "" : "s"}
          </p>

          <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
            {itens.map((item) => (
              <li key={item.id}>
                <FormularioAcao
                  acao={alternarItemDoChecklist}
                  esconderBotao
                  className="space-y-0 px-3 py-2.5"
                >
                  <Oculto nome="ordemId" valor={ordemId} />
                  <Oculto nome="itemId" valor={item.id} />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        name="feito"
                        defaultChecked={item.done}
                        disabled={!podeEditar}
                        onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
                        className="size-[18px] shrink-0 rounded border-graf-300 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                      />
                      <span
                        className={cn(
                          "text-sm",
                          item.done
                            ? "text-graf-500 line-through decoration-graf-300"
                            : "font-medium text-graf-900",
                        )}
                      >
                        {item.label}
                      </span>
                    </label>

                    <input
                      type="text"
                      name="nota"
                      defaultValue={item.note}
                      disabled={!podeEditar}
                      maxLength={300}
                      placeholder="Observação"
                      aria-label={`Observação sobre ${item.label}`}
                      onBlur={(evento) => {
                        if (evento.currentTarget.defaultValue === evento.currentTarget.value) return;
                        evento.currentTarget.form?.requestSubmit();
                      }}
                      className={cn(
                        "h-11 w-full rounded-lg border border-graf-300 bg-white px-3 text-sm text-graf-900 sm:w-56",
                        "placeholder:text-graf-500 hover:border-graf-400",
                        "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
                        "disabled:bg-graf-50 disabled:text-graf-500",
                      )}
                    />
                  </div>
                </FormularioAcao>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Vazio
          icone={ListChecks}
          titulo="Sem roteiro de conferência"
          descricao="Escreva o que precisa ser verificado antes de devolver o equipamento. Uma linha por item."
          className="py-8"
        />
      )}

      {podeEditar ? (
        editando ? (
          <FormularioAcao
            acao={salvarChecklistDaOS}
            rotulo="Salvar roteiro"
            aoConcluir={() => setEditando(false)}
            acoesExtras={
              itens.length > 0 ? (
                <Botao type="button" variante="secundario" onClick={() => setEditando(false)}>
                  Cancelar
                </Botao>
              ) : null
            }
          >
            <Oculto nome="ordemId" valor={ordemId} />
            <Area
              rotulo="Roteiro de conferência"
              name="roteiro"
              rows={6}
              defaultValue={itens.map((item) => item.label).join("\n")}
              ajuda="Uma linha por item, até 60 itens. O que já foi conferido continua marcado."
              placeholder={"Teste de vedação\nCiclo completo de esterilização\nAferição do manômetro"}
            />
          </FormularioAcao>
        ) : (
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setEditando(true)}>
            Editar roteiro
          </Botao>
        )
      ) : null}
    </div>
  );
}
