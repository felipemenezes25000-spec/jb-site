"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";

import {
  aprovarOrcamento,
  recusarOrcamento,
  type EstadoMinhaJb,
} from "@/app/acoes/minha-jb";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Area, Campo } from "@/components/ui/form";
import { formatarPreco } from "@/lib/format";

/**
 * Decisão do cliente sobre a proposta.
 *
 * Aprovar é um aceite: o nome digitado fica gravado no orçamento junto do IP e
 * da data, e por isso passa por confirmação explícita — é dinheiro e é serviço
 * autorizado. Recusar não exige confirmação, mas exige motivo: sem ele a
 * equipe não tem como montar uma proposta melhor.
 *
 * Nenhum valor viaja no formulário. O total exibido aqui é só informação; o
 * que vale é o que está gravado nos itens, somado no servidor.
 */
export function DecisaoDoOrcamento({
  orcamentoId,
  numero,
  totalCents,
  nomeSugerido,
}: {
  orcamentoId: string;
  numero: string;
  totalCents: number;
  nomeSugerido: string;
}) {
  const [estadoAprovar, acaoAprovar, aprovando] = useActionState<EstadoMinhaJb, FormData>(
    aprovarOrcamento,
    {},
  );
  const [estadoRecusar, acaoRecusar, recusando] = useActionState<EstadoMinhaJb, FormData>(
    recusarOrcamento,
    {},
  );
  const [mostrarRecusa, setMostrarRecusa] = useState(false);

  const erro = estadoAprovar.erro ?? estadoRecusar.erro;
  const ok = estadoAprovar.ok ?? estadoRecusar.ok;

  return (
    <div className="space-y-5">
      <p aria-live="polite" className="sr-only">
        {ok ?? erro ?? ""}
      </p>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </p>
      ) : null}

      {ok ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-ok-500/25 bg-ok-50 px-4 py-3 text-sm leading-relaxed text-ok-700"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{ok}</span>
        </p>
      ) : null}

      <form action={acaoAprovar} noValidate className="space-y-4">
        <input type="hidden" name="orcamentoId" value={orcamentoId} />

        <Campo
          rotulo="Seu nome completo"
          name="assinatura"
          required
          maxLength={120}
          autoComplete="name"
          defaultValue={nomeSugerido}
          ajuda="Fica registrado como o aceite da proposta, com data e hora."
          erro={estadoAprovar.campo === "assinatura" ? estadoAprovar.erro : undefined}
        />

        <BotaoConfirmar
          rotulo={
            <>
              <ThumbsUp className="size-4" aria-hidden />
              Aprovar proposta
            </>
          }
          variante="primario"
          tamanho="lg"
          carregando={aprovando}
          pergunta={`Aprovar a proposta ${numero}?`}
          detalhe={`Você está autorizando o serviço no valor de ${formatarPreco(
            totalCents,
          )}. O aceite fica registrado com seu nome, data e hora.`}
          rotuloConfirmar="Sim, aprovar"
        />
      </form>

      <div className="border-t border-graf-200 pt-5">
        {mostrarRecusa ? (
          <form action={acaoRecusar} noValidate className="space-y-4">
            <input type="hidden" name="orcamentoId" value={orcamentoId} />

            <Area
              rotulo="Motivo da recusa"
              name="motivo"
              required
              rows={3}
              maxLength={2000}
              placeholder="Ex.: valor acima do previsto, vou trocar o equipamento, prazo não atende."
              ajuda="O motivo orienta a próxima proposta — e fica só entre você e a equipe da JB."
              erro={estadoRecusar.campo === "motivo" ? estadoRecusar.erro : undefined}
            />

            <div className="flex flex-wrap gap-3">
              <Botao type="submit" variante="perigo" carregando={recusando}>
                <ThumbsDown className="size-4" aria-hidden />
                {recusando ? "Registrando…" : "Confirmar recusa"}
              </Botao>
              <Botao
                type="button"
                variante="texto"
                onClick={() => setMostrarRecusa(false)}
              >
                Voltar
              </Botao>
            </div>
          </form>
        ) : (
          <Botao
            type="button"
            variante="perigo"
            onClick={() => setMostrarRecusa(true)}
          >
            <ThumbsDown className="size-4" aria-hidden />
            Recusar proposta
          </Botao>
        )}
      </div>
    </div>
  );
}
