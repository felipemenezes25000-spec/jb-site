import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import { CalendarClock, FileText, MessageCircle, Phone, Truck } from "lucide-react";

import { LinhaDoPedido } from "@/components/conta/mj-linha-pedido";
import { ListaDeDocumentos } from "@/components/conta/mj-lista-documentos";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Cartao, CabecalhoCartao, Etiqueta } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import {
  formatarCep,
  formatarData,
  formatarDataHora,
  formatarPreco,
  formatarTelefone,
  plural,
  telHref,
  whatsappHref,
} from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Detalhe do pedido",
  robots: { index: false, follow: false },
};

const ROTULO_METODO: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão de crédito",
  boleto: "Boleto bancário",
  manual: "Combinado com a equipe",
};

const ROTULO_PAGAMENTO: Record<PaymentStatus, string> = {
  criado: "Aguardando",
  pendente: "Aguardando pagamento",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

const TOM_PAGAMENTO: Record<PaymentStatus, "ok" | "aguardando" | "andamento" | "alerta" | "neutro"> =
  {
    criado: "aguardando",
    pendente: "aguardando",
    em_analise: "andamento",
    aprovado: "ok",
    recusado: "alerta",
    expirado: "neutro",
    cancelado: "neutro",
    estornado: "neutro",
  };

const ROTULO_ENTREGA = {
  retirada: "Retirada na JB",
  entrega_local: "Entrega pela equipe JB",
  transportadora: "Transportadora",
  sob_orcamento: "Frete a combinar",
  gratis: "Frete grátis",
  nao_aplicavel: "Sem entrega",
} as const;

const ROTULO_INSTALACAO: Record<string, string> = {
  pendente: "A agendar",
  agendada: "Agendada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function tomDoPedido(status: string) {
  if (status === "concluido" || status === "entregue") return "ok" as const;
  if (status === "cancelado" || status === "reembolsado") return "neutro" as const;
  if (status === "aguardando_pagamento" || status === "pagamento_em_analise") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

type Params = Promise<{ numero: string }>;

export default async function PedidoPage({ params }: { params: Params }) {
  const [cliente, { numero }] = await Promise.all([
    exigirCliente("/minha-jb/pedidos"),
    params,
  ]);

  const chave = decodeURIComponent(numero);

  // aceita o número legível (JB-001054) e o id — os avisos gravados pela
  // criação de pedido apontam para o id
  const pedido = await prisma.order.findFirst({
    where: { customerId: cliente.id, OR: [{ number: chave }, { id: chave }] },
    include: {
      items: { orderBy: [{ kind: "asc" }, { name: "asc" }] },
      events: {
        where: { visibleToCustomer: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true },
      },
      payments: { orderBy: { createdAt: "desc" } },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, title: true, size: true, createdAt: true },
      },
      installTasks: {
        orderBy: { createdAt: "asc" },
        include: {
          appointment: {
            select: { startsAt: true, endsAt: true, status: true, addressSummary: true },
          },
        },
      },
      quote: { select: { number: true } },
    },
  });

  if (!pedido) notFound();

  const s = await getSettings();

  const principais = pedido.items.filter((item) => !item.parentId);
  const adicionaisDe = (itemId: string) =>
    pedido.items.filter((item) => item.parentId === itemId);

  const pagamento = pedido.payments[0] ?? null;
  const entrega = ROTULO_ENTREGA[pedido.shippingKind];
  const temEndereco = Boolean(pedido.shipStreet || pedido.shipCity);

  const mensagemSuporte = `Olá! Preciso de ajuda com o pedido ${pedido.number}.`;
  const zap = whatsappHref(s.whatsapp, mensagemSuporte);
  const notas = pedido.events.filter((evento) => evento.note.trim() !== "");

  return (
    <div>
      <Topo
        voltar={{ href: "/minha-jb/pedidos", rotulo: "Meus pedidos" }}
        titulo={`Pedido ${pedido.number}`}
        etiqueta={
          <Etiqueta tom={tomDoPedido(pedido.status)}>{ROTULO_STATUS[pedido.status]}</Etiqueta>
        }
        descricao={`Feito em ${formatarDataHora(pedido.placedAt)} · ${plural(
          principais.length,
          "item",
          "itens",
        )}`}
        acoes={
          <>
            {zap ? (
              <LinkBotao href={zap} variante="secundario" tamanho="sm">
                <MessageCircle className="size-4" aria-hidden />
                Falar no WhatsApp
              </LinkBotao>
            ) : null}
            <LinkBotao href="/minha-jb/assistencia/novo" variante="secundario" tamanho="sm">
              Abrir chamado
            </LinkBotao>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          {/* ------------------------------------------------ andamento */}
          <Cartao>
            <CabecalhoCartao titulo="Andamento" />
            <div className="p-5">
              <LinhaDoPedido pedido={pedido} />
            </div>
          </Cartao>

          {/* ---------------------------------------------------- itens */}
          <Cartao>
            <CabecalhoCartao titulo="Itens do pedido" />
            <ul className="divide-y divide-graf-100 p-5">
              {principais.map((item) => {
                const adicionais = adicionaisDe(item.id);
                return (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-graf-950">{item.name}</p>
                        <p className="mt-0.5 text-sm text-graf-600">
                          {[item.brandName, item.modelName].filter(Boolean).join(" ") ||
                            (item.kind === "servico" ? "Serviço" : "Equipamento")}
                        </p>
                        <p className="mt-1 text-xs text-graf-500">
                          {item.quantity} × {formatarPreco(item.unitPriceCents)}
                          {item.sku ? ` · SKU ${item.sku}` : ""}
                        </p>
                      </div>
                      <p className="tabular text-sm font-bold text-graf-900">
                        {formatarPreco(item.totalCents)}
                      </p>
                    </div>

                    {adicionais.length > 0 ? (
                      <ul className="mt-3 space-y-1.5 border-l-2 border-graf-200 pl-4">
                        {adicionais.map((adicional) => (
                          <li
                            key={adicional.id}
                            className="flex flex-wrap justify-between gap-x-4 text-sm text-graf-600"
                          >
                            <span>
                              {adicional.name}
                              {adicional.quantity > 1 ? ` (${adicional.quantity}×)` : ""}
                            </span>
                            <span className="tabular">
                              {formatarPreco(adicional.totalCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Cartao>

          {/* ---------------------------------------------- instalação */}
          {pedido.installTasks.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Instalação"
                descricao="Serviço executado pela equipe técnica da JB."
              />
              <ul className="divide-y divide-graf-100 p-5">
                {pedido.installTasks.map((tarefa) => {
                  const quando = tarefa.appointment?.startsAt ?? tarefa.scheduledAt;
                  return (
                    <li key={tarefa.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <CalendarClock className="size-4 shrink-0 text-graf-500" aria-hidden />
                        <Etiqueta
                          tom={
                            tarefa.status === "concluida"
                              ? "ok"
                              : tarefa.status === "cancelada"
                                ? "neutro"
                                : tarefa.status === "agendada"
                                  ? "andamento"
                                  : "aguardando"
                          }
                        >
                          {ROTULO_INSTALACAO[tarefa.status] ?? tarefa.status}
                        </Etiqueta>
                        <span className="text-sm font-semibold text-graf-900">
                          {quando
                            ? formatarDataHora(quando)
                            : "A equipe entra em contato para combinar a data"}
                        </span>
                      </div>
                      {tarefa.appointment?.addressSummary ? (
                        <p className="mt-1.5 text-sm text-graf-600">
                          {tarefa.appointment.addressSummary}
                        </p>
                      ) : null}
                      {/* A observação da instalação não entra aqui: o campo
                          InstallationTask.notes não tem marca de visibilidade
                          no schema e é onde a equipe anota o que é dela —
                          acesso ao prédio, elevador, quem recebe. O que se diz
                          ao cliente vai por "Atualizações da equipe", que
                          respeita visibleToCustomer. Mesma regra já aplicada à
                          observação da visita, no chamado. */}
                    </li>
                  );
                })}
              </ul>
            </Cartao>
          ) : null}

          {/* --------------------------------------- avisos da equipe */}
          {notas.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Atualizações da equipe" />
              <ul className="divide-y divide-graf-100 p-5">
                {notas.map((evento) => (
                  <li key={evento.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm leading-relaxed text-graf-700">{evento.note}</p>
                    <p className="mt-1 text-xs text-graf-500">
                      {ROTULO_STATUS[evento.status]} · {formatarDataHora(evento.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {/* ---------------------------------------------- documentos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Nota fiscal e documentos"
              descricao="Arquivos ligados a este pedido."
            />
            <div className="p-5">
              {pedido.documents.length > 0 ? (
                <ListaDeDocumentos documentos={pedido.documents} />
              ) : (
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-500">
                  <FileText className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    Nenhum documento anexado a este pedido ainda. A nota fiscal aparece aqui
                    assim que for emitida — e você recebe um aviso quando isso acontecer.
                  </span>
                </p>
              )}
            </div>
          </Cartao>
        </div>

        {/* --------------------------------------------------- coluna */}
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Resumo" />
            <dl className="space-y-2.5 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Subtotal</dt>
                <dd className="tabular text-graf-900">{formatarPreco(pedido.subtotalCents)}</dd>
              </div>
              {pedido.discountCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">
                    Desconto{pedido.couponCode ? ` (${pedido.couponCode})` : ""}
                  </dt>
                  <dd className="tabular text-ok-700">
                    − {formatarPreco(pedido.discountCents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Frete</dt>
                <dd className="tabular text-graf-900">
                  {pedido.shippingCents > 0
                    ? formatarPreco(pedido.shippingCents)
                    : pedido.shippingKind === "sob_orcamento"
                      ? "A combinar"
                      : "Sem custo"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-graf-200 pt-2.5">
                <dt className="font-bold text-graf-900">Total</dt>
                <dd className="tabular text-base font-bold text-graf-950">
                  {formatarPreco(pedido.totalCents)}
                </dd>
              </div>
            </dl>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Pagamento" />
            <div className="space-y-3 p-5 text-sm">
              {pagamento ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Etiqueta tom={TOM_PAGAMENTO[pagamento.status]}>
                      {ROTULO_PAGAMENTO[pagamento.status]}
                    </Etiqueta>
                    <span className="font-semibold text-graf-900">
                      {ROTULO_METODO[pagamento.method]}
                    </span>
                  </div>

                  <p className="text-graf-600">
                    {formatarPreco(pagamento.amountCents)}
                    {pagamento.installments > 1
                      ? ` em ${pagamento.installments}×`
                      : " à vista"}
                    {pagamento.cardBrand && pagamento.cardLast4
                      ? ` · ${pagamento.cardBrand} •••• ${pagamento.cardLast4}`
                      : ""}
                  </p>

                  {pagamento.approvedAt ? (
                    <p className="text-graf-500">
                      Aprovado em {formatarDataHora(pagamento.approvedAt)}
                    </p>
                  ) : null}

                  {pagamento.expiresAt && pagamento.status === "pendente" ? (
                    <p className="text-graf-500">
                      Vence em {formatarDataHora(pagamento.expiresAt)}
                    </p>
                  ) : null}

                  {pagamento.pixCopyPaste && pagamento.status === "pendente" ? (
                    <div className="rounded-lg border border-graf-200 bg-graf-50 p-3">
                      <p className="text-xs font-semibold text-graf-700">
                        Código Pix copia e cola
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-graf-600">
                        {pagamento.pixCopyPaste}
                      </p>
                      <BotaoCopiar
                        texto={pagamento.pixCopyPaste}
                        rotulo="Copiar código Pix"
                        rotuloCopiado="Código copiado"
                        className="mt-2"
                      />
                    </div>
                  ) : null}

                  {pagamento.failReason ? (
                    <p className="text-jb-700">{pagamento.failReason}</p>
                  ) : null}
                </>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Este pedido ainda não tem pagamento registrado. Quando a forma de
                  pagamento for definida com a equipe, ela aparece aqui.
                </p>
              )}

              {pedido.quote ? (
                <p className="border-t border-graf-200 pt-3 text-graf-600">
                  Originado do orçamento{" "}
                  <Link
                    href={`/minha-jb/orcamentos/${pedido.quote.number}`}
                    className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                  >
                    {pedido.quote.number}
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Entrega" />
            <div className="space-y-2 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-graf-900">
                <Truck className="size-4 shrink-0 text-graf-500" aria-hidden />
                {pedido.shippingLabel || entrega}
              </p>
              {temEndereco ? (
                <address className="not-italic leading-relaxed text-graf-600">
                  {pedido.shipStreet}
                  {pedido.shipNumber ? `, ${pedido.shipNumber}` : ""}
                  {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}
                  <br />
                  {[pedido.shipDistrict, pedido.shipCity, pedido.shipState]
                    .filter(Boolean)
                    .join(", ")}
                  {pedido.shipZip ? <br /> : null}
                  {pedido.shipZip ? `CEP ${formatarCep(pedido.shipZip)}` : ""}
                  {pedido.shipReference ? (
                    <>
                      <br />
                      <span className="text-graf-500">
                        Referência: {pedido.shipReference}
                      </span>
                    </>
                  ) : null}
                </address>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  {pedido.shippingKind === "retirada"
                    ? "Retirada no endereço da JB, em horário comercial."
                    : "Endereço a confirmar com a equipe."}
                </p>
              )}
              {pedido.deliveredAt ? (
                <p className="text-graf-500">
                  Entregue em {formatarData(pedido.deliveredAt)}
                </p>
              ) : null}
              {pedido.customerNote ? (
                <p className="border-t border-graf-200 pt-2 text-graf-600">
                  <span className="font-semibold text-graf-800">Sua observação:</span>{" "}
                  {pedido.customerNote}
                </p>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Precisa de ajuda?" />
            <div className="space-y-2.5 p-5 text-sm">
              <p className="leading-relaxed text-graf-600">
                Fale com a equipe citando o número {pedido.number}.
              </p>
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="flex min-h-11 items-center gap-2 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <Phone className="size-4 shrink-0 text-graf-500" aria-hidden />
                  {formatarTelefone(s.telefone)}
                </a>
              ) : null}
              {zap ? (
                <a
                  href={zap}
                  className="flex min-h-11 items-center gap-2 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <MessageCircle className="size-4 shrink-0 text-graf-500" aria-hidden />
                  WhatsApp {formatarTelefone(s.whatsapp)}
                </a>
              ) : null}
              <p className="text-xs text-graf-500">{s.horario}</p>
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
