"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, MessageSquarePlus, Send, ThumbsDown, Trash2 } from "lucide-react";

import {
  anotarOrcamento,
  aprovarOrcamentoAdmin,
  enviarOrcamentoAdmin,
  excluirOrcamento,
  recusarOrcamentoAdmin,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Cartao, CabecalhoCartao } from "@/components/ui/data";
import { Area, Campo, Marcador } from "@/components/ui/form";

/* ============================================================================
   Ações da proposta

   O que aparece depende de onde a proposta está. Rascunho só tem "enviar";
   proposta enviada ganha decisão e anotação; convertida em pedido não tem mais
   ação nenhuma, porque mexer nela mexeria numa venda já registrada.

   "Aprovar" não é um botão separado de "converter": no orçamento comercial a
   aprovação já gera o pedido, com os valores negociados e a baixa de estoque,
   dentro da mesma transação.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type SituacaoOrcamento = {
  quoteId: string;
  numero: string;
  status:
    | "rascunho"
    | "enviado"
    | "em_duvida"
    | "aprovado"
    | "recusado"
    | "expirado"
    | "convertido";
  comercial: boolean;
  totalFormatado: string;
  temItens: boolean;
  emailDoContato: string;
  podeExcluir: boolean;
};

function Retorno({ estado }: { estado: EstadoVendas }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm leading-snug">
      {estado.erro ? <span className="font-medium text-jb-700">{estado.erro}</span> : null}
      {estado.ok ? <span className="font-medium text-ok-700">{estado.ok}</span> : null}
    </p>
  );
}

function Enviar({
  children,
  variante = "primario",
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario";
}) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante={variante} larguraTotal carregando={pending}>
      {children}
    </Botao>
  );
}

export function AcoesOrcamento({ situacao }: { situacao: SituacaoOrcamento }) {
  const [estadoEnvio, enviar] = useActionState(enviarOrcamentoAdmin, INICIAL);
  const [estadoAprovacao, aprovar] = useActionState(aprovarOrcamentoAdmin, INICIAL);
  const [estadoRecusa, recusar] = useActionState(recusarOrcamentoAdmin, INICIAL);
  const [estadoNota, anotar] = useActionState(anotarOrcamento, INICIAL);
  const [estadoExclusao, excluir] = useActionState(excluirOrcamento, INICIAL);

  const convertida = situacao.status === "convertido";
  const decidida =
    situacao.status === "aprovado" ||
    situacao.status === "recusado" ||
    situacao.status === "convertido";
  const podeEnviar = !decidida;
  const podeDecidir = situacao.status === "enviado" || situacao.status === "em_duvida";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- enviar */}
      {podeEnviar ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Enviar ao cliente"
            descricao={
              situacao.emailDoContato
                ? `Vai para ${situacao.emailDoContato} e para a Minha JB.`
                : "Sem e-mail de contato, a proposta só é publicada na Minha JB."
            }
          />
          <form action={enviar} className="space-y-3 p-5">
            <input type="hidden" name="quoteId" value={situacao.quoteId} />

            <Campo
              rotulo="Validade em dias"
              name="validadeDias"
              inputMode="numeric"
              placeholder="7"
              ajuda="Ignorado quando a proposta já tem data de validade."
            />

            <Area
              rotulo="Recado no histórico"
              name="mensagem"
              rows={2}
              maxLength={600}
              ajuda="Opcional. Substitui o texto automático do evento de envio."
            />

            <Retorno estado={estadoEnvio} />

            {situacao.temItens ? (
              <Enviar>
                <Send className="size-4" aria-hidden />
                Enviar orçamento
              </Enviar>
            ) : (
              <p className="text-sm text-graf-600">
                Inclua ao menos um item antes de enviar a proposta.
              </p>
            )}
          </form>
        </Cartao>
      ) : null}

      {/* ------------------------------------------------------ decisão */}
      {podeDecidir ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Decisão do cliente"
            descricao={
              situacao.comercial
                ? "Aprovar gera o pedido com os valores negociados e reserva o estoque."
                : "Aprovar libera a execução do serviço orçado."
            }
          />
          <div className="space-y-5 p-5">
            <form action={aprovar} className="space-y-3">
              <input type="hidden" name="quoteId" value={situacao.quoteId} />
              <Campo
                rotulo="Quem aprovou"
                name="nome"
                maxLength={160}
                ajuda="Nome de quem confirmou, do lado do cliente. Em branco, fica o seu."
              />
              <Retorno estado={estadoAprovacao} />
              <BotaoConfirmar
                rotulo={situacao.comercial ? "Aprovar e gerar pedido" : "Registrar aprovação"}
                pergunta={`Aprovar o orçamento ${situacao.numero}?`}
                detalhe={
                  situacao.comercial
                    ? `Um pedido de ${situacao.totalFormatado} é criado na hora e o estoque dos itens é baixado. Cancelar depois exige cancelar o pedido.`
                    : "O chamado ligado avança e o serviço fica liberado para execução."
                }
                rotuloConfirmar="Aprovar"
                variante="primario"
                larguraTotal
                icone={<Check className="size-4" aria-hidden />}
              />
            </form>

            <form action={recusar} className="space-y-3 border-t border-graf-200 pt-5">
              <input type="hidden" name="quoteId" value={situacao.quoteId} />
              <Area
                rotulo="Motivo da recusa"
                name="motivo"
                rows={3}
                required
                maxLength={600}
                erro={estadoRecusa.campo === "motivo" ? estadoRecusa.erro : undefined}
                ajuda="É o motivo que ensina a próxima proposta. Seja específico: preço, prazo, concorrente."
              />
              <Retorno estado={estadoRecusa} />
              <Enviar variante="secundario">
                <ThumbsDown className="size-4" aria-hidden />
                Registrar recusa
              </Enviar>
            </form>
          </div>
        </Cartao>
      ) : null}

      {/* ---------------------------------------------------- anotação */}
      {!convertida ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Anotação"
            descricao="Registra o andamento da conversa no histórico da proposta."
          />
          <form action={anotar} className="space-y-3 p-5">
            <input type="hidden" name="quoteId" value={situacao.quoteId} />
            <Area
              rotulo="O que aconteceu"
              name="mensagem"
              rows={3}
              required
              maxLength={2000}
              erro={estadoNota.campo === "mensagem" ? estadoNota.erro : undefined}
              placeholder="Ex.: cliente pediu para revisar o prazo de entrega antes de fechar."
            />
            <Marcador
              name="visivel"
              rotulo="Mostrar para o cliente"
              ajuda="Sem marcar, a anotação fica só para a equipe."
            />
            <Marcador
              name="emNegociacao"
              rotulo="Marcar a proposta como em negociação"
              ajuda="Só vale para proposta que está enviada e ainda sem decisão."
            />
            <Retorno estado={estadoNota} />
            <Enviar variante="secundario">
              <MessageSquarePlus className="size-4" aria-hidden />
              Registrar anotação
            </Enviar>
          </form>
        </Cartao>
      ) : null}

      {/* ----------------------------------------------------- excluir */}
      {situacao.status === "rascunho" && situacao.podeExcluir ? (
        <Cartao className="border-jb-200">
          <CabecalhoCartao
            titulo="Descartar rascunho"
            descricao="Só rascunho pode ser excluído."
            className="border-jb-100"
          />
          <form action={excluir} className="space-y-3 p-5">
            <input type="hidden" name="quoteId" value={situacao.quoteId} />
            <Retorno estado={estadoExclusao} />
            <BotaoConfirmar
              rotulo="Excluir rascunho"
              pergunta={`Excluir o rascunho ${situacao.numero}?`}
              detalhe="A proposta e os itens somem para sempre. Nada foi enviado ao cliente ainda."
              rotuloConfirmar="Excluir"
              larguraTotal
              icone={<Trash2 className="size-4" aria-hidden />}
            />
          </form>
        </Cartao>
      ) : null}

      {convertida ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Proposta convertida"
            descricao="Esta proposta virou pedido."
          />
          <div className="p-5">
            <p className="text-sm leading-relaxed text-graf-600">
              Alterar os valores aqui mudaria uma venda já registrada, então o orçamento fica
              travado. As mudanças que ainda cabem são feitas na tela do pedido.
            </p>
          </div>
        </Cartao>
      ) : null}
    </div>
  );
}
