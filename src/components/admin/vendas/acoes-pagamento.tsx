"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw, Undo2 } from "lucide-react";

import {
  estornarPagamento,
  reconsultarPagamento,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Cartao, CabecalhoCartao } from "@/components/ui/data";
import { Area } from "@/components/ui/form";

/* ============================================================================
   Ações do pagamento

   Reconsultar não é um botão de "atualizar tela": ele pergunta ao provedor qual
   é o estado real e grava a resposta. Por isso é uma escrita, com auditoria.

   Estorno é separado e mais restrito. Quando o provedor não implementa estorno,
   a ação diz isso em vez de fingir que devolveu — o dinheiro sai da conta da
   empresa e a tela não pode mentir sobre isso.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

function Retorno({ estado }: { estado: EstadoVendas }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm leading-snug">
      {estado.erro ? <span className="font-medium text-jb-700">{estado.erro}</span> : null}
      {estado.ok ? <span className="font-medium text-ok-700">{estado.ok}</span> : null}
    </p>
  );
}

function BotaoConsultar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante="secundario" larguraTotal carregando={pending}>
      <RefreshCw className="size-4" aria-hidden />
      Reconsultar o provedor
    </Botao>
  );
}

export function AcoesDoPagamento({
  pagamentoId,
  provedor,
  podeConsultar,
  motivoSemConsulta,
  podeEstornar,
  jaEstornado,
  valorFormatado,
}: {
  pagamentoId: string;
  provedor: string;
  podeConsultar: boolean;
  motivoSemConsulta?: string;
  podeEstornar: boolean;
  jaEstornado: boolean;
  valorFormatado: string;
}) {
  const [estadoConsulta, consultar] = useActionState(reconsultarPagamento, INICIAL);
  const [estadoEstorno, estornar] = useActionState(estornarPagamento, INICIAL);

  return (
    <div className="space-y-6">
      <Cartao>
        <CabecalhoCartao
          titulo="Consulta ao provedor"
          descricao={`Pergunta o estado atual da cobrança em ${provedor}.`}
        />
        <div className="p-5">
          {podeConsultar ? (
            <form action={consultar} className="space-y-3">
              <input type="hidden" name="pagamentoId" value={pagamentoId} />
              <p className="text-sm leading-relaxed text-graf-600">
                O que o provedor responder vira o estado gravado aqui — e, se for aprovação, o
                pedido é confirmado na sequência.
              </p>
              <Retorno estado={estadoConsulta} />
              <BotaoConsultar />
            </form>
          ) : (
            <p className="text-sm leading-relaxed text-graf-600">
              {motivoSemConsulta ?? "Este pagamento não pode ser consultado no provedor."}
            </p>
          )}
        </div>
      </Cartao>

      <Cartao className="border-jb-200">
        <CabecalhoCartao
          titulo="Estorno"
          descricao={`Devolve ${valorFormatado} ao cliente.`}
          className="border-jb-100"
        />
        <div className="p-5">
          {jaEstornado ? (
            <p className="text-sm leading-relaxed text-graf-600">
              Este pagamento já está estornado. O registro fica no histórico abaixo.
            </p>
          ) : !podeEstornar ? (
            <p className="text-sm leading-relaxed text-graf-600">
              Só gestores e administradores estornam pagamento. Peça a quem tem esse acesso.
            </p>
          ) : (
            <form action={estornar} className="space-y-3">
              <input type="hidden" name="pagamentoId" value={pagamentoId} />
              <Area
                rotulo="Motivo do estorno"
                name="motivo"
                rows={3}
                required
                maxLength={500}
                erro={estadoEstorno.campo === "motivo" ? estadoEstorno.erro : undefined}
                ajuda="Fica na auditoria e no histórico do pedido."
              />
              <Retorno estado={estadoEstorno} />
              <BotaoConfirmar
                rotulo="Estornar pagamento"
                pergunta={`Estornar ${valorFormatado}?`}
                detalhe="O valor volta para o cliente e o pedido passa a reembolsado. Não dá para desfazer pelo painel."
                rotuloConfirmar="Estornar"
                larguraTotal
                icone={<Undo2 className="size-4" aria-hidden />}
              />
            </form>
          )}
        </div>
      </Cartao>
    </div>
  );
}
