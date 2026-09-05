"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { CalendarClock, CircleCheck, MoveRight, Wallet, XCircle } from "lucide-react";

import {
  agendarInstalacao,
  cancelarPedidoAdmin,
  confirmarPagamentoManual,
  mudarStatusPedido,
  salvarNotaDoPedido,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import {
  LinhaDeTotal,
  ROTULO_METODO,
  ROTULO_PAGAMENTO,
  TOM_PAGAMENTO,
} from "@/components/admin/vendas/comuns";
import { Botao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Cartao, CabecalhoCartao, Etiqueta } from "@/components/ui/data";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Area, Marcador, Selecao } from "@/components/ui/form";
import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Painel de ação do pedido — parte interativa

   Cinco formulários independentes, cada um com o seu próprio `useActionState`.
   Poderiam ser um formulário só com vários submits, mas aí um erro de validação
   no cancelamento apagaria o texto que a pessoa já tinha digitado na nota
   interna. Separados, cada ação falha e se recupera sozinha.

   Tudo que decide de verdade — se o papel pode confirmar pagamento, se o valor
   cabe no saldo, se o status é válido — acontece no servidor. Aqui só
   desabilitamos o que não faz sentido oferecer e mostramos a conta pronta.

   Quem carrega os dados é `painel-pedido.tsx`, que é servidor.
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

/** Uma cobrança do pedido, já com a data formatada no fuso de São Paulo. */
export type PagamentoDoPainel = {
  id: string;
  metodo: PaymentMethod;
  status: PaymentStatus;
  valorCents: number;
  quando: string;
};

/**
 * A conta do pedido em centavos.
 *
 * `pagoCents` soma só os pagamentos aprovados — recusado, expirado e estornado
 * não abatem nada. `saldoCents` é o que ainda falta receber.
 */
export type ContaDoPedido = {
  totalCents: number;
  pagoCents: number;
  saldoCents: number;
  pagamentos: PagamentoDoPainel[];
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

/**
 * A conta em três linhas: total, o que já entrou e o que falta.
 *
 * O "já pago" aparece como abatimento porque é assim que a conta é feita —
 * quem olha lê total menos pago igual a saldo, sem precisar somar de cabeça.
 */
function ContaDoPedidoResumo({ conta }: { conta: ContaDoPedido }) {
  const quitado = conta.saldoCents <= 0;

  return (
    <div className="rounded-lg border border-graf-200 bg-graf-50 px-4 py-2">
      <LinhaDeTotal rotulo="Total do pedido" valor={formatarPreco(conta.totalCents)} />
      <LinhaDeTotal
        rotulo="Já recebido"
        valor={formatarPreco(conta.pagoCents)}
        negativo={conta.pagoCents > 0}
      />
      <LinhaDeTotal
        rotulo={quitado ? "Nada em aberto" : "Falta receber"}
        valor={formatarPreco(Math.max(0, conta.saldoCents))}
        forte
      />
    </div>
  );
}

/** Confirmação que também sabe quando o formulário está em voo. */
function ConfirmarPagamento({
  rotulo,
  pergunta,
  detalhe,
  rotuloConfirmar,
  desabilitado,
}: {
  rotulo: string;
  pergunta: string;
  detalhe: string;
  rotuloConfirmar: string;
  desabilitado: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <BotaoConfirmar
      rotulo={rotulo}
      pergunta={pergunta}
      detalhe={detalhe}
      rotuloConfirmar={rotuloConfirmar}
      variante="primario"
      varianteConfirmar="primario"
      larguraTotal
      carregando={pending}
      disabled={desabilitado}
      icone={<Wallet className="size-4" aria-hidden />}
    />
  );
}

/** Cobranças do pedido, da mais recente para a mais antiga. */
function ListaDePagamentos({ pagamentos }: { pagamentos: PagamentoDoPainel[] }) {
  if (pagamentos.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-graf-500">
        Nenhuma cobrança registrada ainda neste pedido.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
        {pagamentos.map((pagamento) => (
          <li
            key={pagamento.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block text-sm text-graf-900">
                <span className="tabular font-semibold">
                  {formatarPreco(pagamento.valorCents)}
                </span>{" "}
                · {ROTULO_METODO[pagamento.metodo]}
              </span>
              <span className="block text-xs text-graf-500">{pagamento.quando}</span>
            </span>
            <Etiqueta tom={TOM_PAGAMENTO[pagamento.status]}>
              {ROTULO_PAGAMENTO[pagamento.status]}
            </Etiqueta>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-graf-500">
        Só o que está aprovado entra na conta acima.
      </p>
    </div>
  );
}

/**
 * Registro de pagamento recebido fora do site.
 *
 * O valor é digitado: equipamento odontológico costuma sair com sinal, e o
 * pedido só vira "pago" quando a soma dos aprovados alcança o total. O campo
 * chega preenchido com o saldo — o caso comum é quitar — mas aceita menos.
 */
function BlocoPagamento({
  pedido,
  conta,
  metodos,
  podeConfirmar,
}: {
  pedido: PedidoDoPainel;
  conta: ContaDoPedido;
  metodos: OpcaoSimples[];
  podeConfirmar: boolean;
}) {
  const [estado, acao] = useActionState(confirmarPagamentoManual, INICIAL);
  const saldo = Math.max(0, conta.saldoCents);
  const [valorCents, setValorCents] = useState(saldo);

  // Registrado um parcial, a rota revalida e o saldo diminui — mas o estado do
  // campo sobrevive ao rerender e ficaria com o valor antigo, acima do novo
  // saldo. Ajustar durante a renderização é o jeito recomendado de reagir a
  // uma prop que mudou, sem efeito e sem um segundo passe de pintura.
  const [saldoSemente, setSaldoSemente] = useState(saldo);
  if (saldoSemente !== saldo) {
    setSaldoSemente(saldo);
    setValorCents(saldo);
  }

  const acima = valorCents > saldo;
  const vazio = valorCents <= 0;
  const quita = !vazio && !acima && valorCents >= saldo;

  // O botão fica desabilitado nesses dois casos, então o motivo precisa estar
  // escrito no campo — botão morto sem explicação é beco sem saída.
  const erroDoCampo = acima
    ? `Passa do que falta receber. O máximo agora é ${formatarPreco(saldo)}.`
    : vazio
      ? "Informe quanto o cliente pagou — tem de ser maior que zero."
      : estado.campo === "valorCents"
        ? estado.erro
        : undefined;

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Pagamento fora do site"
        descricao="Sinal, parcela ou quitação recebidos por fora — transferência, dinheiro, maquininha da loja."
      />
      <div className="space-y-4 p-5">
        <ContaDoPedidoResumo conta={conta} />
        <ListaDePagamentos pagamentos={conta.pagamentos} />

        {!podeConfirmar ? (
          <p className="text-sm leading-relaxed text-graf-600">
            Só gestores e administradores registram pagamento manual. Peça a quem tem esse
            acesso.
          </p>
        ) : pedido.pago ? (
          <p className="text-sm leading-relaxed text-graf-600">
            Este pedido já consta como pago. Para devolver valor, use o estorno na tela do
            pagamento.
          </p>
        ) : saldo === 0 ? (
          <p className="text-sm leading-relaxed text-graf-600">
            Os pagamentos aprovados já cobrem o total. Não há saldo para registrar.
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

            <CampoMoeda
              rotulo="Valor recebido agora"
              nome="valorCents"
              valorCents={valorCents}
              aoMudar={setValorCents}
              erro={erroDoCampo}
              ajuda={`Sugerido: o saldo em aberto, ${formatarPreco(saldo)}. Recebendo só o sinal, digite o que entrou.`}
            />

            <Area
              rotulo="Observação interna"
              name="observacao"
              rows={2}
              maxLength={400}
              placeholder="Ex.: sinal recebido por transferência no Banco X, comprovante no e-mail."
            />

            <Retorno estado={estado} />

            <ConfirmarPagamento
              rotulo={quita ? "Confirmar pagamento" : "Registrar pagamento parcial"}
              pergunta={`Registrar ${formatarPreco(Math.max(0, valorCents))} no pedido ${pedido.numero}?`}
              detalhe={
                quita
                  ? "Isso quita o pedido: ele passa para pago, o cliente é avisado e os equipamentos entram no prontuário dele. Para desfazer só com estorno."
                  : `Entra como pagamento parcial. O pedido continua em aberto, o cliente não é avisado e ainda faltarão ${formatarPreco(Math.max(0, saldo - valorCents))}.`
              }
              rotuloConfirmar={quita ? "Confirmar recebimento" : "Registrar parcial"}
              desabilitado={vazio || acima}
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

export function PainelPedidoCliente({
  pedido,
  conta,
  statusDisponiveis,
  sugerido,
  metodos,
  tecnicos,
  tarefas,
  podeConfirmarPagamento,
}: {
  pedido: PedidoDoPainel;
  conta: ContaDoPedido;
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
          <div className="space-y-4 p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-graf-600">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
              Um pedido cancelado não volta atrás. Para vender de novo os mesmos itens, monte um
              novo pedido ou um orçamento.
            </p>
            <ContaDoPedidoResumo conta={conta} />
            <ListaDePagamentos pagamentos={conta.pagamentos} />
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
        conta={conta}
        metodos={metodos}
        podeConfirmar={podeConfirmarPagamento}
      />
      <BlocoInstalacao pedido={pedido} tecnicos={tecnicos} tarefas={tarefas} />
      <BlocoNota pedido={pedido} />
      <BlocoCancelamento pedido={pedido} />
    </div>
  );
}
