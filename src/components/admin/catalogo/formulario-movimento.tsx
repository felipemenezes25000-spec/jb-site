"use client";

import { useActionState, useState } from "react";

import { registrarMovimento, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { Grade, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Campo, Selecao } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Entrada, saída, devolução e ajuste

   Entrada, saída e devolução pedem a quantidade movimentada. Ajuste pede o
   total contado na prateleira — é como a pessoa conta de verdade — e o sistema
   grava a diferença. A prévia mostra o saldo que vai ficar antes de enviar,
   porque errar o sentido do movimento é o engano mais comum aqui.

   O motivo é obrigatório: é ele que aparece no histórico e na auditoria.
   ============================================================================ */

const TIPOS = [
  { valor: "entrada", rotulo: "Entrada — chegou mercadoria" },
  { valor: "saida", rotulo: "Saída — saiu sem pedido (perda, uso interno)" },
  { valor: "devolucao", rotulo: "Devolução — voltou para a prateleira" },
  { valor: "ajuste", rotulo: "Ajuste — corrigir pelo total contado" },
];

export function FormularioMovimento({
  produtoId,
  saldoAtual,
  className,
}: {
  produtoId: string;
  saldoAtual: number;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(registrarMovimento, {});
  const [tipo, setTipo] = useState("entrada");
  const [quantidade, setQuantidade] = useState("");

  const numero = Number(quantidade);
  const valido = quantidade !== "" && Number.isFinite(numero) && numero >= 0;

  const novoSaldo = !valido
    ? null
    : tipo === "ajuste"
      ? numero
      : tipo === "saida"
        ? saldoAtual - numero
        : saldoAtual + numero;

  const negativo = novoSaldo !== null && novoSaldo < 0;

  return (
    <form action={enviar} className={cn("space-y-5", className)}>
      <input type="hidden" name="productId" value={produtoId} />
      <RegiaoEstado estado={estado} />

      <Grade>
        <Selecao
          rotulo="Tipo de movimento"
          name="kind"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value)}
        >
          {TIPOS.map((item) => (
            <option key={item.valor} value={item.valor}>
              {item.rotulo}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo={tipo === "ajuste" ? "Total contado na prateleira" : "Quantidade"}
          name="quantity"
          type="number"
          inputMode="numeric"
          min={0}
          max={1000000}
          value={quantidade}
          onChange={(evento) => setQuantidade(evento.target.value)}
          required
          erro={estado.campo === "quantity" ? estado.erro : undefined}
          ajuda={`Saldo de hoje: ${saldoAtual}.`}
        />
      </Grade>

      <Campo
        rotulo="Motivo"
        name="reason"
        required
        maxLength={200}
        placeholder={
          tipo === "entrada"
            ? "Ex.: nota 12345 do fornecedor"
            : tipo === "ajuste"
              ? "Ex.: contagem do inventário mensal"
              : "Ex.: peça danificada no transporte"
        }
        erro={estado.campo === "reason" ? estado.erro : undefined}
        ajuda="Fica gravado no histórico e na auditoria, com o seu nome."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-graf-200 pt-4">
        <p
          aria-live="polite"
          className={cn(
            "text-sm",
            negativo ? "font-semibold text-jb-700" : "text-graf-600",
          )}
        >
          {novoSaldo === null ? (
            "Informe a quantidade para ver o saldo final."
          ) : negativo ? (
            `Isso deixaria o estoque em ${novoSaldo}, e saldo negativo não é aceito.`
          ) : (
            <>
              Saldo depois deste movimento:{" "}
              <span className="tabular font-semibold text-graf-900">{novoSaldo}</span>
            </>
          )}
        </p>
        <Botao type="submit" carregando={enviando} disabled={!valido || negativo}>
          Registrar movimento
        </Botao>
      </div>
    </form>
  );
}
