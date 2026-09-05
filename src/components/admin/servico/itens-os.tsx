"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  adicionarItemNaOS,
  definirDescontoDaOS,
  removerItemDaOS,
} from "@/app/acoes/admin-servico";
import { CampoAcao, MoedaAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { Vazio } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Itens da ordem de serviço

   Peça, serviço e deslocamento entram como linhas; os três subtotais e o total
   são recalculados no servidor a cada mudança (`recalcularTotaisDaOS`). Por
   isso o formulário só manda descrição, quantidade e valor UNITÁRIO — o total
   da linha e o total da OS nunca viajam pelo navegador.

   Cada linha tem o próprio formulário de remoção: form dentro de form não
   existe em HTML, então a lista fica fora do formulário de inclusão.
   ============================================================================ */

export type ItemDaOS = {
  id: string;
  kind: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type TotaisDaOS = {
  partsCents: number;
  laborCents: number;
  travelCents: number;
  discountCents: number;
  totalCents: number;
};

const ROTULO_TIPO: Record<string, string> = {
  peca: "Peça",
  servico: "Serviço",
  deslocamento: "Deslocamento",
};

const COR_TIPO: Record<string, string> = {
  peca: "bg-info-50 text-info-700",
  servico: "bg-ok-50 text-ok-700",
  deslocamento: "bg-warn-50 text-warn-700",
};

export function ItensDaOS({
  ordemId,
  itens,
  totais,
  podeEditar,
}: {
  ordemId: string;
  itens: ItemDaOS[];
  totais: TotaisDaOS;
  podeEditar: boolean;
}) {
  const [tipo, setTipo] = useState("peca");

  return (
    <div className="space-y-5">
      {itens.length === 0 ? (
        <Vazio
          titulo="Nenhum item lançado"
          descricao="Some as peças trocadas, a mão de obra e o deslocamento. O total da OS sai daqui."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
          {itens.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                  COR_TIPO[item.kind] ?? "bg-graf-100 text-graf-600",
                )}
              >
                {ROTULO_TIPO[item.kind] ?? item.kind}
              </span>

              <span className="min-w-[10rem] flex-1 text-sm font-medium text-graf-900">
                {item.description}
              </span>

              <span className="tabular shrink-0 text-sm text-graf-500">
                {item.quantity} × {formatarPreco(item.unitPriceCents)}
              </span>

              <span className="tabular w-24 shrink-0 text-right text-sm font-semibold text-graf-900">
                {formatarPreco(item.totalCents)}
              </span>

              {podeEditar ? (
                <FormularioAcao
                  acao={removerItemDaOS}
                  esconderBotao
                  className="shrink-0 space-y-0"
                >
                  <Oculto nome="ordemId" valor={ordemId} />
                  <Oculto nome="itemId" valor={item.id} />
                  <button
                    type="submit"
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-lg text-graf-500 transition-colors",
                      "hover:bg-jb-50 hover:text-jb-700",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                    )}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Remover {item.description}</span>
                  </button>
                </FormularioAcao>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* ------------------------------------------------------------ totais */}
      <dl className="rounded-lg bg-graf-50 px-4 py-3 text-sm">
        <Linha rotulo="Peças" valor={totais.partsCents} />
        <Linha rotulo="Mão de obra" valor={totais.laborCents} />
        <Linha rotulo="Deslocamento" valor={totais.travelCents} />
        {totais.discountCents > 0 ? (
          <Linha rotulo="Desconto" valor={-totais.discountCents} destaque="desconto" />
        ) : null}
        <div className="mt-2 flex items-center justify-between border-t border-graf-200 pt-2">
          <dt className="text-sm font-bold text-graf-900">Total da OS</dt>
          <dd className="tabular text-lg font-bold text-graf-950">
            {formatarPreco(totais.totalCents)}
          </dd>
        </div>
      </dl>

      {podeEditar ? (
        <div className="space-y-4 border-t border-graf-200 pt-4">
          <FormularioAcao
            acao={adicionarItemNaOS}
            rotulo="Incluir item"
            icone={<Plus className="size-4" aria-hidden />}
            reiniciarAoConcluir
          >
            <Oculto nome="ordemId" valor={ordemId} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_6rem_10rem]">
              <SelecaoAcao
                rotulo="Tipo"
                name="tipo"
                value={tipo}
                onChange={(evento) => setTipo(evento.target.value)}
              >
                <option value="peca">Peça</option>
                <option value="servico">Serviço (mão de obra)</option>
                <option value="deslocamento">Deslocamento</option>
              </SelecaoAcao>

              <CampoAcao
                rotulo="Descrição"
                name="descricao"
                required
                maxLength={300}
                placeholder={
                  tipo === "servico"
                    ? "Ex.: troca da resistência da autoclave"
                    : tipo === "deslocamento"
                      ? "Ex.: deslocamento até a clínica"
                      : "Ex.: resistência 2000 W"
                }
              />

              <CampoAcao
                rotulo={tipo === "servico" ? "Horas" : "Qtd."}
                name="quantidade"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                inputMode="numeric"
              />

              <MoedaAcao
                rotulo={tipo === "servico" ? "Valor da hora" : "Valor unitário"}
                nome="valorCents"
                ajuda="Digite só números."
              />
            </div>
          </FormularioAcao>

          <FormularioAcao
            acao={definirDescontoDaOS}
            rotulo="Gravar desconto"
            variante="secundario"
            className="flex flex-wrap items-end gap-3 space-y-0"
            classeAcoes="pb-1"
          >
            <Oculto nome="ordemId" valor={ordemId} />
            <MoedaAcao
              rotulo="Desconto na OS"
              nome="descontoCents"
              valorInicialCents={totais.discountCents}
              ajuda="Abatido do total. Nunca deixa o valor negativo."
              className="w-full sm:w-56"
            />
          </FormularioAcao>
        </div>
      ) : null}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: "desconto";
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <dt className="text-graf-600">{rotulo}</dt>
      <dd className={cn("tabular font-medium", destaque ? "text-jb-700" : "text-graf-800")}>
        {formatarPreco(valor)}
      </dd>
    </div>
  );
}
