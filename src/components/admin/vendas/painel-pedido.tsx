"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, CircleCheck, MoveRight, Wallet, XCircle } from "lucide-react";

import {
  agendarInstalacao,
  cancelarPedidoAdmin,
  confirmarPagamentoManual,
  mudarStatusPedido,
  salvarNotaDoPedido,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao } from "@/components/ui/data";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Area, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Painel de ação do pedido

   Cinco formulários independentes, cada um com o seu próprio `useActionState`.
   Poderiam ser um formulário só com vários submits, mas aí um erro de validação
   no cancelamento apagaria o texto que a pessoa já tinha digitado na nota
   interna. Separados, cada ação falha e se recupera sozinha.

   Tudo que decide de verdade — se o papel pode confirmar pagamento, se o valor
   bate, se o status é válido — acontece no servidor. Aqui só desabilitamos o
   que não faz sentido oferecer.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type OpcaoSimples = { valor: string; rotulo: string };

export type TarefaInstalacao = {
  id: string;
  rotulo: string;
};

export type PedidoDoPainel = {
  id: string;
  numero: string;
  cancelado: boolean;
  pago: boolean;
  totalFormatado: string;
  notaInterna: string;
};

/** Mensagem de retorno da ação, sempre anunciada por região viva. */
function Retorno({ estado }: { estado: EstadoVendas }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm leading-snug">
      {estado.erro ? <span className="font-medium text-jb-700">{estado.erro}</span> : null}
      {estado.ok ? <span className="font-medium text-ok-700">{estado.ok}</span> : null}
    </p>
  );
}

/** Botão de envio que sabe sozinho quando o formulário está em voo. */
function Enviar({
  children,
  variante = "primario",
  larguraTotal = true,
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "sutil" | "texto" | "perigo";
  larguraTotal?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante={variante} larguraTotal={larguraTotal} carregando={pending}>
      {children}
    </Botao>
  );
}

/* --------------------------------------------------------------- status */

function BlocoStatus({
  pedido,
  statusDisponiveis,
  sugerido,
}: {
  pedido: PedidoDoPainel;
  statusDisponiveis: OpcaoSimples[];
  sugerido: string | null;
}) {
  const [estado, acao] = useActionState(mudarStatusPedido, INICIAL);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Andamento"
        descricao="A mudança entra no histórico do cliente."
      />
      <form action={acao} className="space-y-3 p-5">
        <input type="hidden" name="pedidoId" value={pedido.id} />

        <Selecao
          rotulo="Novo status"
          name="status"
          defaultValue={sugerido ?? ""}
          erro={estado.campo === "status" ? estado.erro : undefined}
          required
        >
          <option value="">Escolha o próximo passo</option>
          {statusDisponiveis.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </Selecao>

        <Area
          rotulo="Observação"
          name="nota"
          rows={2}
          maxLength={600}
          placeholder="Ex.: equipamento separado e conferido pelo técnico."
        />

        <Marcador
          name="visivel"
          rotulo="Mostrar esta observação para o cliente"
          ajuda="Sem marcar, a observação fica só para a equipe."
          defaultChecked
        />

        <Retorno estado={estado} />
        <Enviar>
          <MoveRight className="size-4" aria-hidden />
          Atualizar andamento
        </Enviar>
      </form>
    </Cartao>
  );
}

/* ------------------------------------------------------------ pagamento */

function BlocoPagamento({
  pedido,
  metodos,
  podeConfirmar,
}: {
  pedido: PedidoDoPainel;
  metodos: OpcaoSimples[];
  podeConfirmar: boolean;
}) {
  const [estado, acao] = useActionState(confirmarPagamentoManual, INICIAL);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Pagamento fora do site"
        descricao={`Registra ${pedido.totalFormatado} como recebido.`}
      />
      <div className="p-5">
        {!podeConfirmar ? (
          <p className="text-sm leading-relaxed text-graf-600">
            Só gestores e administradores confirmam pagamento manual. Peça a confirmação a
            quem tem esse acesso.
          </p>
        ) : pedido.pago ? (
          <p className="text-sm leading-relaxed text-graf-600">
            Este pedido já consta como pago. Para devolver o valor, use o estorno na tela do
            pagamento.
          </p>
        ) : (
          <form action={acao} className="space-y-3">
            <input type="hidden" name="pedidoId" value={pedido.id} />

            <Selecao rotulo="Como o cliente pagou" name="metodo" defaultValue="manual" required>
              {metodos.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </Selecao>

            <Area
              rotulo="Observação interna"
              name="observacao"
              rows={2}
              maxLength={400}
              placeholder="Ex.: transferência recebida no Banco X, comprovante no e-mail."
            />

            <Retorno estado={estado} />

            <BotaoConfirmar
              rotulo="Confirmar pagamento"
              pergunta={`Confirmar ${pedido.totalFormatado} do pedido ${pedido.numero}?`}
              detalhe="O pedido passa para pago, o cliente é avisado e os equipamentos entram no prontuário dele. Para desfazer só com estorno."
              rotuloConfirmar="Confirmar recebimento"
              variante="primario"
              varianteConfirmar="primario"
              larguraTotal
              icone={<Wallet className="size-4" aria-hidden />}
            />
          </form>
        )}
      </div>
    </Cartao>
  );
}

/* ----------------------------------------------------------- instalação */

function BlocoInstalacao({
  pedido,
  tecnicos,
  tarefas,
}: {
  pedido: PedidoDoPainel;
  tecnicos: OpcaoSimples[];
  tarefas: TarefaInstalacao[];
}) {
  const [estado, acao] = useActionState(agendarInstalacao, INICIAL);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Instalação"
        descricao="Marca a visita e coloca o compromisso na agenda do técnico."
      />
      <form action={acao} className="space-y-3 p-5">
        <input type="hidden" name="pedidoId" value={pedido.id} />

        {tarefas.length > 0 ? (
          <Selecao rotulo="Tarefa" name="tarefaId" defaultValue={tarefas[0]?.id ?? ""}>
            {tarefas.map((tarefa) => (
              <option key={tarefa.id} value={tarefa.id}>
                {tarefa.rotulo}
              </option>
            ))}
            <option value="">Criar uma nova instalação</option>
          </Selecao>
        ) : (
          <input type="hidden" name="tarefaId" value="" />
        )}

        <div>
          <label
            htmlFor="instalacao-quando"
            className="mb-1.5 block text-sm font-semibold text-graf-800"
          >
            Data e hora
            <span className="ml-0.5 text-jb-600" aria-hidden>
              *
            </span>
          </label>
          <input
            id="instalacao-quando"
            name="quando"
            type="datetime-local"
            required
            aria-invalid={estado.campo === "quando" ? true : undefined}
            className="h-11 w-full rounded-lg border border-graf-300 bg-white px-3.5 text-graf-900 shadow-xs transition-colors hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
          />
          {estado.campo === "quando" && estado.erro ? (
            <p className="mt-1.5 text-sm text-jb-700">{estado.erro}</p>
          ) : null}
        </div>

        <Selecao
          rotulo="Técnico"
          name="tecnicoId"
          defaultValue=""
          ajuda={
            tecnicos.length === 0
              ? "Nenhum técnico cadastrado ainda — o agendamento fica sem responsável."
              : undefined
          }
        >
          <option value="">Definir depois</option>
          {tecnicos.map((tecnico) => (
            <option key={tecnico.valor} value={tecnico.valor}>
              {tecnico.rotulo}
            </option>
          ))}
        </Selecao>

        <Area
          rotulo="Combinado com o cliente"
          name="observacao"
          rows={2}
          maxLength={600}
          placeholder="Ex.: portaria libera a partir das 8h; falar com a Dra. Ana."
        />

        <Retorno estado={estado} />
        <Enviar variante="secundario">
          <CalendarClock className="size-4" aria-hidden />
          Agendar instalação
        </Enviar>
      </form>
    </Cartao>
  );
}

/* ------------------------------------------------------------ nota interna */

function BlocoNota({ pedido }: { pedido: PedidoDoPainel }) {
  const [estado, acao] = useActionState(salvarNotaDoPedido, INICIAL);
  const [rascunho, setRascunho] = useState(pedido.notaInterna);

  return (
    <Cartao>
      <CabecalhoCartao titulo="Nota interna" descricao="Nunca aparece para o cliente." />
      <form action={acao} className="space-y-3 p-5">
        <input type="hidden" name="pedidoId" value={pedido.id} />
        <Area
          rotulo="Anotações da equipe"
          name="notaInterna"
          rows={5}
          maxLength={4000}
          value={rascunho}
          onChange={(evento) => setRascunho(evento.target.value)}
          placeholder="Combinações, pendências, quem falou com quem."
        />
        <Retorno estado={estado} />
        <Enviar variante="secundario">Salvar nota</Enviar>
      </form>
    </Cartao>
  );
}

/* ------------------------------------------------------------ cancelar */

function BlocoCancelamento({ pedido }: { pedido: PedidoDoPainel }) {
  const [estado, acao] = useActionState(cancelarPedidoAdmin, INICIAL);

  return (
    <Cartao className="border-jb-200">
      <CabecalhoCartao
        titulo="Cancelar pedido"
        descricao="Devolve o estoque das unidades reservadas."
        className="border-jb-100"
      />
      <form action={acao} className="space-y-3 p-5">
        <input type="hidden" name="pedidoId" value={pedido.id} />
        <Area
          rotulo="Motivo do cancelamento"
          name="motivo"
          rows={3}
          required
          maxLength={600}
          erro={estado.campo === "motivo" ? estado.erro : undefined}
          ajuda="O motivo fica no histórico e o cliente vê."
        />
        <Retorno estado={estado} />
        <BotaoConfirmar
          rotulo="Cancelar pedido"
          pergunta={`Cancelar o pedido ${pedido.numero}?`}
          detalhe="O estoque volta para a loja, as unidades reservadas são liberadas e o cliente é avisado. Não dá para desfazer."
          rotuloConfirmar="Cancelar o pedido"
          rotuloCancelar="Voltar"
          varianteConfirmar="primario"
          larguraTotal
          icone={<XCircle className="size-4" aria-hidden />}
        />
      </form>
    </Cartao>
  );
}

/* ------------------------------------------------------------- montagem */

export function PainelPedido({
  pedido,
  statusDisponiveis,
  sugerido,
  metodos,
  tecnicos,
  tarefas,
  podeConfirmarPagamento,
}: {
  pedido: PedidoDoPainel;
  statusDisponiveis: OpcaoSimples[];
  sugerido: string | null;
  metodos: OpcaoSimples[];
  tecnicos: OpcaoSimples[];
  tarefas: TarefaInstalacao[];
  podeConfirmarPagamento: boolean;
}) {
  if (pedido.cancelado) {
    return (
      <div className="space-y-6">
        <Cartao>
          <CabecalhoCartao
            titulo="Pedido cancelado"
            descricao="O estoque já foi devolvido."
          />
          <div className="p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-graf-600">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
              Um pedido cancelado não volta atrás. Para vender de novo os mesmos itens, monte um
              novo pedido ou um orçamento.
            </p>
          </div>
        </Cartao>
        <BlocoNota pedido={pedido} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BlocoStatus
        pedido={pedido}
        statusDisponiveis={statusDisponiveis}
        sugerido={sugerido}
      />
      <BlocoPagamento
        pedido={pedido}
        metodos={metodos}
        podeConfirmar={podeConfirmarPagamento}
      />
      <BlocoInstalacao pedido={pedido} tecnicos={tecnicos} tarefas={tarefas} />
      <BlocoNota pedido={pedido} />
      <BlocoCancelamento pedido={pedido} />
    </div>
  );
}
