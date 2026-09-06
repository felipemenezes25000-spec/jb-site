import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentKind, PaymentMethod, type OrderStatus } from "@prisma/client";
import {
  CalendarClock,
  CreditCard,
  History,
  MapPin,
  Package,
  Printer,
  User,
} from "lucide-react";

import {
  CabecalhoPagina,
  Dado,
  EtiquetaPedido,
  LinhaDeTotal,
  ListaDeDados,
  ORDEM_STATUS_PEDIDO,
  ROTULO_FRETE,
  ROTULO_METODO,
  ROTULO_PAGAMENTO,
  TOM_PAGAMENTO,
  rotuloProvedor,
} from "@/components/admin/vendas/comuns";
import { DocumentosDoPedido } from "@/components/admin/vendas/documentos-pedido";
import { PainelPedido } from "@/components/admin/vendas/painel-pedido";
import { LinkBotao } from "@/components/ui/button";
import {
  Cartao,
  CabecalhoCartao,
  Etiqueta,
  LinhaDoTempo,
  Trilha,
  Vazio,
  type PassoLinha,
} from "@/components/ui/data";
import { PODE } from "@/lib/auth";
import {
  formatarCep,
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
  plural,
} from "@/lib/format";
import { FLUXO_PADRAO, ROTULO_STATUS } from "@/lib/pedido";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

type Props = { params: Promise<{ id: string }> };

/**
 * Ficha do pedido.
 *
 * A tela junta o que a equipe precisa para responder qualquer pergunta sobre
 * uma venda sem abrir outra aba: quem comprou, o que levou, quanto pagou, por
 * onde vai, o que já foi feito e o que falta. As ações ficam todas na coluna da
 * direita, e cada uma delas revalida esta rota.
 *
 * Custo e margem só aparecem para quem tem `PODE.verCustos` (gestor para cima)
 * e só quando o produto tem custo cadastrado — não existe margem estimada.
 */

async function carregar(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, active: true },
      },
      coupon: { select: { code: true } },
      quote: { select: { id: true, number: true } },
      items: {
        orderBy: [{ parentId: "asc" }, { id: "asc" }],
        include: {
          product: { select: { id: true, slug: true, costCents: true } },
          service: { select: { name: true } },
          unit: { select: { serialNumber: true } },
        },
      },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      installTasks: {
        orderBy: { createdAt: "asc" },
        include: {
          appointment: {
            select: {
              id: true,
              startsAt: true,
              status: true,
              technician: { select: { user: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pedido = await prisma.order.findUnique({
    where: { id },
    select: { number: true, buyerName: true },
  });
  if (!pedido) return { title: "Pedido não encontrado" };
  return { title: `Pedido ${pedido.number} — ${pedido.buyerName}` };
}

/** Próximo passo natural. Fora do fluxo padrão, o destino mais provável. */
function sugerirProximo(atual: OrderStatus): OrderStatus | null {
  const posicao = FLUXO_PADRAO.indexOf(atual);
  if (posicao >= 0) return FLUXO_PADRAO[posicao + 1] ?? null;

  const equivalencia: Partial<Record<OrderStatus, OrderStatus>> = {
    pagamento_em_analise: "pago",
    revisao_tecnica: "aguardando_frete",
    aguardando_frete: "enviado",
    pronto_retirada: "entregue",
    instalacao_agendada: "entregue",
  };
  return equivalencia[atual] ?? null;
}

const ROTULO_DOCUMENTO: Record<DocumentKind, string> = {
  nota_fiscal: "Nota fiscal",
  pedido: "Pedido",
  orcamento: "Orçamento",
  ordem_servico: "Ordem de serviço",
  laudo: "Laudo",
  certificado: "Certificado",
  manual: "Manual",
  garantia: "Garantia",
  contrato: "Contrato",
  outro: "Outro",
};

const ROTULO_TAREFA: Record<string, string> = {
  pendente: "Aguardando agendamento",
  agendada: "Agendada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function tamanhoLegivel(bytes: number) {
  if (bytes <= 0) return "tamanho não registrado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export default async function PedidoPage({ params }: Props) {
  const usuario = await exigirArea("pedidos");
  const { id } = await params;

  const pedido = await carregar(id);
  if (!pedido) notFound();

  const verCustos = PODE.verCustos(usuario);

  const [tecnicos, autores] = await Promise.all([
    prisma.technician.findMany({
      where: { active: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    // OrderStatusEvent.userId não tem relação no schema: os nomes vêm à parte
    prisma.user.findMany({
      where: {
        id: {
          in: [...new Set(pedido.events.map((e) => e.userId).filter((v): v is string => !!v))],
        },
      },
      select: { id: true, name: true },
    }),
  ]);

  const nomePorUsuario = new Map(autores.map((autor) => [autor.id, autor.name]));

  const principais = pedido.items.filter((item) => !item.parentId);
  const adicionaisDe = (itemId: string) =>
    pedido.items.filter((item) => item.parentId === itemId);

  const custoTotal = principais.reduce((acumulado, item) => {
    const custo = item.product?.costCents;
    return acumulado + (custo ? custo * item.quantity : 0);
  }, 0);
  const temCusto = principais.some((item) => item.product?.costCents);
  const margem = pedido.subtotalCents - pedido.discountCents - custoTotal;
  const margemPercentual =
    pedido.subtotalCents > 0 ? Math.round((margem / pedido.subtotalCents) * 100) : 0;

  const finalizado = ["concluido", "cancelado", "reembolsado", "entregue"].includes(
    pedido.status,
  );

  const passos: PassoLinha[] = pedido.events.map((evento, indice) => {
    const autor = evento.userId ? nomePorUsuario.get(evento.userId) : undefined;
    const detalhes = [
      evento.note || undefined,
      autor ? `Registrado por ${autor}` : undefined,
      evento.visibleToCustomer ? undefined : "Visível só para a equipe",
    ].filter(Boolean);

    const ultimo = indice === pedido.events.length - 1;
    return {
      titulo: ROTULO_STATUS[evento.status],
      descricao: detalhes.length > 0 ? detalhes.join(" · ") : undefined,
      quando: formatarDataHora(evento.createdAt),
      estado: !ultimo
        ? "concluido"
        : pedido.status === "cancelado" || pedido.status === "reembolsado"
          ? "cancelado"
          : finalizado
            ? "concluido"
            : "atual",
    };
  });

  const endereco = [
    [pedido.shipStreet, pedido.shipNumber].filter(Boolean).join(", "),
    pedido.shipComplement,
    pedido.shipDistrict,
    [pedido.shipCity, pedido.shipState].filter(Boolean).join("/"),
    pedido.shipZip ? `CEP ${formatarCep(pedido.shipZip)}` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Trilha
        className="print:hidden"
        itens={[
          { rotulo: "Pedidos", href: "/admin/pedidos" },
          { rotulo: pedido.number },
        ]}
      />

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">Pedido {pedido.number}</span>
            <EtiquetaPedido status={pedido.status} rotulo={ROTULO_STATUS[pedido.status]} ponto />
          </span>
        }
        apoio={
          <>
            Feito em {formatarDataHora(pedido.placedAt)} ·{" "}
            {plural(principais.length, "item", "itens")} ·{" "}
            <span className="tabular font-semibold text-graf-800">
              {formatarPreco(pedido.totalCents)}
            </span>
            {pedido.quote ? (
              <>
                {" "}
                · veio do orçamento{" "}
                <Link
                  href={`/admin/orcamentos/${pedido.quote.id}`}
                  className="font-semibold text-jb-700 underline-offset-2 hover:underline"
                >
                  {pedido.quote.number}
                </Link>
              </>
            ) : null}
          </>
        }
        acoes={
          <>
            {pedido.customer ? (
              <LinkBotao
                href={`/admin/clientes/${pedido.customer.id}`}
                variante="secundario"
                tamanho="sm"
              >
                <User className="size-4" aria-hidden />
                Ficha do cliente
              </LinkBotao>
            ) : null}
            <LinkBotao
              href={`/admin/pedidos/${pedido.id}/imprimir`}
              variante="secundario"
              tamanho="sm"
              target="_blank"
            >
              <Printer className="size-4" aria-hidden />
              Imprimir
            </LinkBotao>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          {/* ------------------------------------------------- comprador */}
          <Cartao>
            <CabecalhoCartao
              titulo="Comprador"
              descricao="Dados registrados no momento da compra."
            />
            <div className="p-5">
              <ListaDeDados colunas={3}>
                <Dado rotulo="Nome">{pedido.buyerName}</Dado>
                <Dado rotulo="E-mail">
                  <a
                    href={`mailto:${pedido.buyerEmail}`}
                    className="text-jb-700 underline-offset-2 hover:underline"
                  >
                    {pedido.buyerEmail}
                  </a>
                </Dado>
                {pedido.buyerPhone ? (
                  <Dado rotulo="Telefone">{formatarTelefone(pedido.buyerPhone)}</Dado>
                ) : null}
                {pedido.buyerDocument ? (
                  <Dado rotulo={pedido.personType === "juridica" ? "CNPJ" : "CPF"}>
                    {formatarDocumento(pedido.buyerDocument)}
                  </Dado>
                ) : null}
                {pedido.personType === "juridica" ? (
                  <Dado rotulo="Razão social">{pedido.companyName}</Dado>
                ) : null}
                <Dado rotulo="Conta na Área da Clínica">
                  {pedido.customer ? (
                    <Link
                      href={`/admin/clientes/${pedido.customer.id}`}
                      className="text-jb-700 underline-offset-2 hover:underline"
                    >
                      {pedido.customer.name}
                    </Link>
                  ) : (
                    "Compra como visitante"
                  )}
                </Dado>
              </ListaDeDados>

              {pedido.customerNote ? (
                <div className="mt-5 rounded-lg bg-graf-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                    Observação do cliente
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-graf-800">
                    {pedido.customerNote}
                  </p>
                </div>
              ) : null}
            </div>
          </Cartao>

          {/* ----------------------------------------------------- itens */}
          <Cartao>
            <CabecalhoCartao
              titulo="Itens"
              descricao={
                verCustos && temCusto
                  ? "Custo e margem saem do custo cadastrado no produto hoje."
                  : "Valores congelados no momento da compra."
              }
            />

            <ul className="divide-y divide-graf-200">
              {principais.map((item) => {
                const adicionais = adicionaisDe(item.id);
                const custoUnitario = item.product?.costCents ?? null;

                return (
                  <li key={item.id} className="flex flex-wrap gap-4 p-5">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="size-16 shrink-0 rounded-lg border border-graf-200 object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        /* graf-500 e não graf-300: em graf-50 o ícone dava
                           1,61:1 e sumia. Assim o "sem foto" é visível. */
                        className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-graf-200 bg-graf-50 text-graf-500"
                      >
                        <Package className="size-6" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-graf-950">
                        {item.product ? (
                          <Link
                            href={`/loja/${item.product.slug}`}
                            className="underline-offset-2 hover:text-jb-700 hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-graf-500">
                        {[
                          item.brandName,
                          item.modelName,
                          item.sku ? `SKU ${item.sku}` : "",
                          item.unit?.serialNumber ? `Série ${item.unit.serialNumber}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Serviço"}
                      </p>

                      {adicionais.length > 0 ? (
                        <ul className="mt-2 space-y-1 border-l-2 border-graf-200 pl-3">
                          {adicionais.map((adicional) => (
                            <li
                              key={adicional.id}
                              className="flex flex-wrap justify-between gap-2 text-sm text-graf-600"
                            >
                              <span>+ {adicional.name}</span>
                              <span className="tabular">
                                {formatarPreco(adicional.totalCents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {verCustos && custoUnitario ? (
                        <p className="mt-2 text-[0.8125rem] text-graf-500">
                          Custo {formatarPreco(custoUnitario)} por unidade · margem do item{" "}
                          <span className="font-semibold text-graf-700">
                            {formatarPreco(item.totalCents - custoUnitario * item.quantity)}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full text-right sm:w-32">
                      <p className="tabular text-sm text-graf-500">
                        {item.quantity} × {formatarPreco(item.unitPriceCents)}
                      </p>
                      <p className="tabular font-bold text-graf-950">
                        {formatarPreco(item.totalCents)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-graf-200 bg-graf-50 px-5 py-4">
              <div className="ml-auto max-w-sm">
                <LinhaDeTotal rotulo="Subtotal" valor={formatarPreco(pedido.subtotalCents)} />
                {pedido.discountCents > 0 ? (
                  <LinhaDeTotal
                    rotulo={
                      pedido.couponCode ? `Desconto (${pedido.couponCode})` : "Desconto"
                    }
                    valor={formatarPreco(pedido.discountCents)}
                    negativo
                  />
                ) : null}
                <LinhaDeTotal
                  rotulo={pedido.shippingLabel || ROTULO_FRETE[pedido.shippingKind]}
                  valor={
                    pedido.shippingCents > 0 ? formatarPreco(pedido.shippingCents) : "Sem custo"
                  }
                />
                <LinhaDeTotal rotulo="Total" valor={formatarPreco(pedido.totalCents)} forte />

                {verCustos && temCusto ? (
                  <div className="mt-3 border-t border-graf-200 pt-3">
                    <LinhaDeTotal rotulo="Custo dos produtos" valor={formatarPreco(custoTotal)} />
                    <LinhaDeTotal
                      rotulo={`Margem bruta (${margemPercentual}%)`}
                      valor={formatarPreco(margem)}
                    />
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-500">
                      Não inclui frete nem itens sem custo cadastrado.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </Cartao>

          {/* -------------------------------------------------- entrega */}
          <Cartao>
            <CabecalhoCartao
              titulo="Entrega"
              descricao={pedido.shippingLabel || ROTULO_FRETE[pedido.shippingKind]}
            />
            <div className="p-5">
              {endereco.length > 0 ? (
                <address className="flex gap-3 not-italic">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span className="text-sm leading-relaxed text-graf-800">
                    {endereco.map((linha) => (
                      <span key={linha} className="block">
                        {linha}
                      </span>
                    ))}
                  </span>
                </address>
              ) : (
                <p className="text-sm text-graf-500">
                  {pedido.shippingKind === "retirada"
                    ? "Retirada na JB — sem endereço de entrega."
                    : "Endereço não informado neste pedido."}
                </p>
              )}

              {pedido.shipReference ? (
                <p className="mt-3 text-sm text-graf-600">
                  <span className="font-semibold">Referência:</span> {pedido.shipReference}
                </p>
              ) : null}
            </div>
          </Cartao>

          {/* ------------------------------------------------ pagamentos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Pagamentos"
              descricao="Cada tentativa de cobrança feita para este pedido."
              acao={
                pedido.payments.length > 0 ? (
                  <LinkBotao href="/admin/pagamentos" variante="texto" tamanho="sm">
                    Ver todos
                  </LinkBotao>
                ) : null
              }
            />
            <div className="p-5">
              {pedido.payments.length === 0 ? (
                <Vazio
                  icone={CreditCard}
                  titulo="Nenhuma cobrança registrada"
                  descricao="O cliente ainda não iniciou o pagamento pelo site. Recebendo por fora, use o bloco de pagamento manual."
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {pedido.payments.map((pagamento) => (
                    <li key={pagamento.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                          href={`/admin/pagamentos/${pagamento.id}`}
                          className="inline-flex min-h-11 items-center gap-2 font-medium text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          <CreditCard className="size-4 text-graf-500" aria-hidden />
                          {ROTULO_METODO[pagamento.method]}
                          <span className="tabular font-semibold">
                            {formatarPreco(pagamento.amountCents)}
                          </span>
                        </Link>
                        <Etiqueta tom={TOM_PAGAMENTO[pagamento.status]}>
                          {ROTULO_PAGAMENTO[pagamento.status]}
                        </Etiqueta>
                      </div>
                      <p className="text-[0.8125rem] text-graf-500">
                        {rotuloProvedor(pagamento.provider)} ·{" "}
                        {formatarDataHora(pagamento.createdAt)}
                        {pagamento.installments > 1 ? ` · ${pagamento.installments}x` : ""}
                        {pagamento.cardLast4 ? ` · final ${pagamento.cardLast4}` : ""}
                      </p>
                      {pagamento.failReason ? (
                        <p className="mt-1 text-[0.8125rem] text-jb-700">{pagamento.failReason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ------------------------------------------------ instalação */}
          {pedido.installTasks.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Instalação"
                descricao="Tarefas de campo geradas por este pedido."
              />
              <ul className="divide-y divide-graf-200">
                {pedido.installTasks.map((tarefa) => (
                  <li key={tarefa.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-graf-900">
                        {ROTULO_TAREFA[tarefa.status] ?? tarefa.status}
                        {tarefa.scheduledAt ? ` — ${formatarDataHora(tarefa.scheduledAt)}` : ""}
                      </p>
                      <p className="text-[0.8125rem] text-graf-500">
                        {tarefa.appointment?.technician?.user.name
                          ? `Técnico: ${tarefa.appointment.technician.user.name}`
                          : "Sem técnico definido"}
                      </p>
                      {tarefa.notes ? (
                        <p className="mt-1 whitespace-pre-line text-sm text-graf-700">
                          {tarefa.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {/* ------------------------------------------------ documentos */}
          <DocumentosDoPedido
            pedidoId={pedido.id}
            podeExcluir={PODE.excluirRegistros(usuario)}
            tipos={(
              [
                "nota_fiscal",
                "garantia",
                "contrato",
                "manual",
                "certificado",
                "outro",
              ] as DocumentKind[]
            ).map((tipo) => ({ valor: tipo, rotulo: ROTULO_DOCUMENTO[tipo] }))}
            documentos={pedido.documents.map((documento) => ({
              id: documento.id,
              titulo: documento.title,
              tipo: ROTULO_DOCUMENTO[documento.kind],
              endereco: `/admin/documentos/${documento.id}/baixar`,
              detalhe: `${formatarData(documento.createdAt)} · ${tamanhoLegivel(documento.size)}`,
            }))}
          />

          {/* -------------------------------------------------- histórico */}
          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Tudo que aconteceu com este pedido, na ordem."
            />
            <div className="p-5">
              {passos.length === 0 ? (
                <Vazio
                  icone={History}
                  titulo="Sem eventos registrados"
                  descricao="A primeira mudança de status aparece aqui."
                />
              ) : (
                <LinhaDoTempo passos={passos} />
              )}
            </div>
          </Cartao>
        </div>

        {/* ------------------------------------------------------- painel */}
        <aside className="space-y-6 print:hidden">
          <PainelPedido
            pedido={{
              id: pedido.id,
              numero: pedido.number,
              cancelado: pedido.status === "cancelado",
              pago: Boolean(pedido.paidAt),
              totalFormatado: formatarPreco(pedido.totalCents),
              notaInterna: pedido.internalNote,
            }}
            sugerido={sugerirProximo(pedido.status)}
            statusDisponiveis={ORDEM_STATUS_PEDIDO.filter(
              (status) => status !== pedido.status && status !== "cancelado",
            ).map((status) => ({ valor: status, rotulo: ROTULO_STATUS[status] }))}
            metodos={(
              ["manual", "pix", "cartao", "boleto"] as PaymentMethod[]
            ).map((metodo) => ({ valor: metodo, rotulo: ROTULO_METODO[metodo] }))}
            tecnicos={tecnicos.map((tecnico) => ({
              valor: tecnico.id,
              rotulo: tecnico.user.name,
            }))}
            tarefas={pedido.installTasks.map((tarefa) => ({
              id: tarefa.id,
              rotulo: tarefa.scheduledAt
                ? `${ROTULO_TAREFA[tarefa.status] ?? tarefa.status} — ${formatarData(tarefa.scheduledAt)}`
                : (ROTULO_TAREFA[tarefa.status] ?? tarefa.status),
            }))}
            podeConfirmarPagamento={PODE.confirmarPagamentoManual(usuario)}
          />
        </aside>
      </div>
    </div>
  );
}
