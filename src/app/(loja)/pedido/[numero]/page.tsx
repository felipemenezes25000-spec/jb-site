import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { OrderStatus } from "@prisma/client";
import {
  FlaskConical,
  ImageOff,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Store,
} from "lucide-react";

import {
  AtualizarPagamento,
  ConfirmarEmailPedido,
  PainelSimulacao,
  TentarNovamente,
  type EstadoConferencia,
} from "@/components/loja/acompanhar-pedido";
import { PagamentoPix } from "@/components/loja/pagamento-pix";
import { ProntuarioDoPedido } from "@/components/loja/prontuario-do-pedido";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import {
  Cartao,
  Etiqueta,
  LinhaDoTempo,
  Trilha,
  type PassoLinha,
  type Tom,
} from "@/components/ui/data";
import { liberarAcompanhamento, pedidosDoNavegador } from "@/lib/acompanhamento";
import { sessaoCliente } from "@/lib/auth-cliente";
import { formatarDataHora, formatarPreco, telHref, whatsappHref } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { pagamentoEhSimulado, provedorPagamento } from "@/lib/pagamento";
import { FLUXO_PADRAO, ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";
import { enderecoCompleto, getSettings } from "@/lib/settings";

export const instant = false;

type Props = {
  params: Promise<{ numero: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  return {
    title: `Pedido ${decodeURIComponent(numero).toUpperCase()}`,
    robots: { index: false, follow: false },
  };
}

const LIMITE_TENTATIVAS = 8;
const JANELA_MS = 15 * 60_000;

async function excedeuTentativas(numero: string, ip: string) {
  const desde = new Date(Date.now() - JANELA_MS);
  const [porNumero, porIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier: `pedido:${numero}`, success: false, createdAt: { gte: desde } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ip,
            identifier: { startsWith: "pedido:" },
            success: false,
            createdAt: { gte: desde },
          },
        })
      : Promise.resolve(0),
  ]);

  return porNumero >= LIMITE_TENTATIVAS || porIp >= LIMITE_TENTATIVAS * 4;
}

async function registrarTentativa(numero: string, ip: string, acertou: boolean) {
  await prisma.loginAttempt.create({
    data: { identifier: `pedido:${numero}`, ip, success: acertou },
  });
}

async function conferirEmailDoPedido(
  _anterior: EstadoConferencia,
  formData: FormData,
): Promise<EstadoConferencia> {
  "use server";

  const numero = String(formData.get("numero") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!numero || !email) return { erro: "Informe o e-mail usado na compra." };

  const ip = ipDoPedido(await headers());
  if (await excedeuTentativas(numero, ip)) {
    return { erro: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
  }

  const pedido = await prisma.order.findUnique({
    where: { number: numero },
    select: { number: true, buyerEmail: true },
  });

  const confere = pedido !== null && pedido.buyerEmail.trim().toLowerCase() === email;
  await registrarTentativa(numero, ip, confere);

  if (!pedido || !confere) {
    return { erro: "Não encontramos um pedido com esse número e esse e-mail." };
  }

  await liberarAcompanhamento(pedido.number);
  revalidatePath(`/pedido/${pedido.number}`);
  return { ok: true };
}

const ETAPA_DO_STATUS: Record<OrderStatus, number> = {
  aguardando_pagamento: 0,
  pagamento_em_analise: 0,
  pago: 1,
  separacao: 2,
  revisao_tecnica: 2,
  aguardando_frete: 2,
  pronto_retirada: 3,
  instalacao_agendada: 3,
  enviado: 3,
  entregue: 4,
  concluido: 5,
  cancelado: -1,
  reembolsado: -1,
};

const TOM_DO_STATUS: Record<OrderStatus, Tom> = {
  aguardando_pagamento: "aguardando",
  pagamento_em_analise: "aguardando",
  pago: "ok",
  separacao: "andamento",
  revisao_tecnica: "andamento",
  aguardando_frete: "andamento",
  pronto_retirada: "andamento",
  instalacao_agendada: "andamento",
  enviado: "andamento",
  entregue: "ok",
  concluido: "ok",
  cancelado: "neutro",
  reembolsado: "neutro",
};

function explicacaoDaEtapa(status: OrderStatus, retirada: boolean): string {
  switch (status) {
    case "aguardando_pagamento":
      return "O pedido está registrado e os itens continuam reservados para você.";
    case "pago":
      return "Com o pagamento confirmado, a JB começa a preparar o pedido.";
    case "separacao":
      return retirada
        ? "A JB separa e confere os itens para a retirada."
        : "A JB separa, confere e embala os itens do pedido.";
    case "enviado":
      return retirada
        ? "Seu pedido fica à disposição na loja da JB."
        : "O pedido sai da JB para o endereço de entrega.";
    case "entregue":
      return retirada ? "Pedido retirado na JB." : "O pedido chegou ao endereço informado.";
    case "concluido":
      return "Pedido encerrado. O histórico continua nesta página.";
    default:
      return "";
  }
}

function montarLinhaDoTempo(
  statusAtual: OrderStatus,
  eventos: { status: OrderStatus; note: string; createdAt: Date }[],
  retirada: boolean,
): PassoLinha[] {
  const encerrado = statusAtual === "cancelado" || statusAtual === "reembolsado";
  const marcos = new Map<number, { note: string; createdAt: Date }>();
  let alcancado = 0;

  for (const evento of eventos) {
    const etapa = ETAPA_DO_STATUS[evento.status];
    if (etapa < 0) continue;
    marcos.set(etapa, { note: evento.note, createdAt: evento.createdAt });
    if (etapa > alcancado) alcancado = etapa;
  }

  const atual = encerrado ? alcancado : Math.max(alcancado, ETAPA_DO_STATUS[statusAtual]);
  const ultimoVisivel = encerrado ? alcancado : FLUXO_PADRAO.length - 1;
  const fechado = statusAtual === "concluido";

  const passos: PassoLinha[] = FLUXO_PADRAO.slice(0, ultimoVisivel + 1).map((status, i) => {
    const marco = marcos.get(i);
    const detalhe =
      i === atual && !encerrado && status !== statusAtual
        ? `Agora: ${ROTULO_STATUS[statusAtual]}`
        : "";

    return {
      titulo: ROTULO_STATUS[status],
      descricao: detalhe || marco?.note || explicacaoDaEtapa(status, retirada) || undefined,
      quando: marco ? formatarDataHora(marco.createdAt) : undefined,
      estado:
        i < atual
          ? "concluido"
          : i === atual
            ? encerrado || fechado
              ? "concluido"
              : "atual"
            : "futuro",
    };
  });

  if (encerrado) {
    const ultimo = [...eventos].reverse().find((evento) => evento.status === statusAtual);
    passos.push({
      titulo: ROTULO_STATUS[statusAtual],
      descricao: ultimo?.note || undefined,
      quando: ultimo ? formatarDataHora(ultimo.createdAt) : undefined,
      estado: "cancelado",
    });
  }

  return passos;
}

function metodosDeRetentativa(simulado: boolean) {
  try {
    const disponiveis = provedorPagamento().metodos;
    const lista: { valor: string; rotulo: string }[] = [];
    if (disponiveis.includes("pix")) lista.push({ valor: "pix", rotulo: "Pix" });
    if (simulado && disponiveis.includes("cartao")) {
      lista.push({ valor: "cartao", rotulo: "Cartão (demonstração)" });
    }
    return lista;
  } catch (erro) {
    console.error("[pedido] provedor de pagamento indisponível", erro);
    return [];
  }
}

export default async function PedidoPage({ params }: Props) {
  const [{ numero: bruto }, s] = await Promise.all([params, getSettings()]);
  const numero = decodeURIComponent(bruto).trim().toUpperCase();

  const [pedido, sessao] = await Promise.all([
    prisma.order.findUnique({
      where: { number: numero },
      include: {
        items: {
          where: { parentId: null },
          include: { addons: true },
          orderBy: { name: "asc" },
        },
        events: {
          where: { visibleToCustomer: true },
          orderBy: { createdAt: "asc" },
          select: { status: true, note: true, createdAt: true },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    sessaoCliente(),
  ]);

  const liberado =
    pedido !== null &&
    ((sessao !== null && pedido.customerId === sessao.id) ||
      (await pedidosDoNavegador()).includes(pedido.number));

  const trilha = (
    <Trilha
      itens={[{ rotulo: "Início", href: "/" }, { rotulo: `Pedido ${numero}` }]}
      className="mb-5"
    />
  );

  if (!liberado) {
    return (
      <div className="container-loja py-8 lg:py-12">
        {trilha}
        <div className="mx-auto max-w-xl">
          <h1 className="text-display texto-forte">Acompanhar pedido</h1>
          <p className="texto-guia mt-3 text-graf-600">
            Antes de abrir o pedido, confirmamos o e-mail usado na compra. Assim, os dados do pedido
            ficam disponíveis somente para quem comprou.
          </p>

          <Cartao className="mt-8 p-5 sm:p-7">
            <ConfirmarEmailPedido numero={numero} acao={conferirEmailDoPedido} />
          </Cartao>

          <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-graf-600">
            <Lock className="mt-1 size-4 shrink-0 text-graf-500" aria-hidden />
            <span className="min-w-0">
              Tem conta na JB?{" "}
              <Link
                href={`/entrar?voltar=${encodeURIComponent(`/pedido/${numero}`)}`}
                className="font-semibold text-jb-700 underline decoration-jb-300 underline-offset-2 transition-colors hover:text-jb-800"
              >
                Entre na sua conta
              </Link>{" "}
              e veja seus pedidos sem repetir a conferência.
            </span>
          </p>
        </div>
      </div>
    );
  }

  const pagamento = pedido.payments[0] ?? null;
  const simulado = pagamentoEhSimulado();
  const pago = pedido.paidAt !== null;
  const encerrado = pedido.status === "cancelado" || pedido.status === "reembolsado";
  const expirou = pagamento?.expiresAt ? pagamento.expiresAt.getTime() <= Date.now() : false;
  const emAberto =
    pagamento !== null &&
    !pago &&
    !encerrado &&
    (pagamento.status === "criado" ||
      pagamento.status === "pendente" ||
      pagamento.status === "em_analise");
  const aguardandoProvedor = emAberto && !expirou;
  const podeTentarDeNovo = !pago && !encerrado;
  const metodosRetentativa = podeTentarDeNovo ? metodosDeRetentativa(simulado) : [];
  const passos = montarLinhaDoTempo(
    pedido.status,
    pedido.events,
    pedido.shippingKind === "retirada",
  );

  // O prontuário continua sendo específico de equipamentos. Peças e acessórios
  // permanecem no pedido, mas não geram uma ficha de equipamento por conta própria.
  const equipamentosDoPedido = pedido.paidAt
    ? await prisma.equipment.findMany({
        where: { orderId: pedido.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          warrantyUntil: true,
        },
      })
    : [];

  const linhaLocalidade = [
    pedido.shipDistrict,
    pedido.shipCity && pedido.shipState
      ? `${pedido.shipCity}/${pedido.shipState}`
      : pedido.shipCity,
    pedido.shipZip ? `CEP ${pedido.shipZip}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const telefone = telHref(s.telefone);
  const whatsapp = whatsappHref(
    s.whatsapp,
    `Olá! Sou ${pedido.buyerName} e queria falar sobre o pedido ${pedido.number}.`,
  );

  return (
    <div className="container-loja py-8 lg:py-12">
      {trilha}

      <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="sobretitulo">Pedido</p>
          <h1 className="text-display texto-forte mt-2 break-words">{pedido.number}</h1>
          <p className="mt-2 text-sm text-graf-500">
            Recebido em {formatarDataHora(pedido.placedAt)}
          </p>
        </div>
        <Etiqueta tom={TOM_DO_STATUS[pedido.status]} ponto className="mt-2 px-3 py-1.5 text-sm">
          {ROTULO_STATUS[pedido.status]}
        </Etiqueta>
      </header>

      <p className="texto-guia mt-5 max-w-2xl text-graf-600">
        {encerrado
          ? "Este pedido foi encerrado e não aceita novo pagamento. Se quiser retomar a compra, fale com a JB."
          : pago
            ? "Recebemos o pagamento. Daqui em diante a JB prepara o pedido e você acompanha cada etapa por esta página."
            : "Seu pedido está registrado e reservado. Falta concluir o pagamento para liberar a separação dos itens."}
      </p>

      {simulado ? (
        <div className="mt-6 flex min-w-0 items-start gap-3 rounded-xl border border-dashed border-warn-500/50 bg-warn-50 px-4 py-3.5">
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-warn-700" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed text-graf-700">
            <p className="font-bold text-warn-700">Ambiente de demonstração</p>
            <p className="mt-1">
              Nenhum valor foi cobrado e nenhum item será despachado. A tela apenas simula uma compra real.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          <ProntuarioDoPedido
            equipamentos={equipamentosDoPedido.map((equipamento) => ({
              id: equipamento.id,
              nome: equipamento.name,
              serial: equipamento.serialNumber,
              garantiaAte: equipamento.warrantyUntil,
            }))}
          />

          <Cartao className="min-w-0 p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Pagamento</h2>

            <div className="mt-5 min-w-0">
              {pago ? (
                <Aviso
                  tom="sucesso"
                  titulo={simulado ? "Pagamento confirmado (demonstração)" : "Pagamento confirmado"}
                >
                  {simulado
                    ? `A confirmação foi registrada em ${formatarDataHora(pedido.paidAt)} pela demonstração — nenhum valor foi cobrado. Numa compra real, a JB começaria a preparar o pedido a partir daqui.`
                    : `Recebemos a confirmação em ${formatarDataHora(pedido.paidAt)}. A JB já está preparando seu pedido e avisa a cada mudança de etapa.`}
                </Aviso>
              ) : encerrado ? (
                <Aviso tom="atencao" titulo={ROTULO_STATUS[pedido.status]}>
                  Este pedido foi encerrado e não aceita novo pagamento. Se precisar retomar a compra,
                  fale com a JB — o histórico continua aqui.
                </Aviso>
              ) : !pagamento ? (
                <Aviso tom="atencao" titulo="Falta abrir a cobrança">
                  Seu pedido está registrado, mas ainda não tem cobrança aberta. Gere uma abaixo para concluir.
                </Aviso>
              ) : pagamento.method === "pix" && aguardandoProvedor ? (
                <PagamentoPix
                  qrCode={pagamento.pixQrCode}
                  copiaECola={pagamento.pixCopyPaste}
                  expiraEm={pagamento.expiresAt ? pagamento.expiresAt.toISOString() : null}
                  valorCents={pagamento.amountCents}
                  simulado={simulado}
                />
              ) : pagamento.status === "em_analise" ? (
                <Aviso tom="info" titulo="Pagamento em análise">
                  O banco está conferindo o pagamento. A página avisa assim que houver resposta.
                </Aviso>
              ) : pagamento.status === "recusado" ? (
                <Aviso tom="erro" titulo="Pagamento recusado">
                  {pagamento.failReason ||
                    "O banco recusou o pagamento. Nada foi cobrado — você pode tentar de novo abaixo."}
                </Aviso>
              ) : expirou || pagamento.status === "expirado" ? (
                <Aviso tom="atencao" titulo="A cobrança expirou">
                  O prazo do código terminou e nada foi cobrado. Gere uma nova cobrança para concluir o pedido.
                </Aviso>
              ) : pagamento.status === "estornado" ? (
                <Aviso tom="atencao" titulo="Pagamento estornado">
                  O valor foi devolvido. Se tiver dúvida sobre o prazo de retorno no seu banco, fale com a JB citando o número do pedido.
                </Aviso>
              ) : (
                <Aviso tom="info" titulo="Aguardando a confirmação do pagamento">
                  A cobrança já foi aberta. Esta página se atualiza quando o meio de pagamento responder.
                </Aviso>
              )}
            </div>

            {pagamento ? (
              <dl className="mt-6 grid min-w-0 gap-x-8 gap-y-4 border-t border-graf-200 pt-5 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-graf-500">Forma de pagamento</dt>
                  <dd className="mt-1 break-words font-semibold text-graf-900">
                    {pagamento.method === "pix"
                      ? "Pix"
                      : pagamento.method === "cartao"
                        ? `Cartão${pagamento.installments > 1 ? ` em ${pagamento.installments}×` : " à vista"}`
                        : pagamento.method === "boleto"
                          ? "Boleto"
                          : "Registrado pela JB"}
                    {pagamento.cardBrand ? ` · ${pagamento.cardBrand}` : ""}
                    {pagamento.cardLast4 ? ` ····${pagamento.cardLast4}` : ""}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-graf-500">Valor da cobrança</dt>
                  <dd className="mt-1 font-semibold tabular text-graf-900">
                    {formatarPreco(pagamento.amountCents)}
                  </dd>
                </div>
              </dl>
            ) : null}

            {podeTentarDeNovo && !aguardandoProvedor ? (
              <TentarNovamente
                numero={pedido.number}
                metodos={metodosRetentativa}
                rotulo={pagamento ? "Gerar nova cobrança" : "Gerar cobrança"}
              />
            ) : null}

            <AtualizarPagamento
              ativo={aguardandoProvedor}
              expiraEm={pagamento?.expiresAt ? pagamento.expiresAt.toISOString() : null}
            />

            {simulado && pagamento?.externalId && !pago && !encerrado ? (
              <PainelSimulacao externalId={pagamento.externalId} />
            ) : null}
          </Cartao>

          <Cartao className="p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Andamento do pedido</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
              A JB atualiza esta linha a cada etapa concluída.
            </p>
            <div className="mt-6 min-w-0">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>

          <Cartao className="min-w-0 p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Itens do pedido</h2>

            <ul className="mt-5 min-w-0 divide-y divide-graf-200">
              {pedido.items.map((item) => (
                <li
                  key={item.id}
                  className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-x-4"
                >
                  <div
                    data-palco-imagem-produto
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:size-24"
                  >
                    {item.imageUrl ? (
                      <Image
                        data-imagem-produto
                        src={imagemProdutoSemFundo(item.imageUrl)}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 96px, 64px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-graf-500">
                        <ImageOff className="size-5" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    {item.brandName ? (
                      <p className="break-words text-[0.75rem] font-semibold uppercase tracking-wide text-graf-500 sm:text-apoio">
                        {item.brandName}
                      </p>
                    ) : null}
                    <p className="break-words text-corpo font-bold leading-snug text-graf-950 sm:text-base">
                      {item.name}
                    </p>
                    <p className="mt-1 break-words text-apoio text-graf-500">
                      {item.sku ? <span className="label-mono break-all">{item.sku}</span> : null}
                      {item.sku ? " · " : ""}
                      {item.quantity}× {formatarPreco(item.unitPriceCents)}
                    </p>

                    {item.addons.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-l-2 border-jb-200 pl-3">
                        {item.addons.map((addon) => (
                          <li
                            key={addon.id}
                            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 text-apoio text-graf-600"
                          >
                            <span className="min-w-0 break-words">+ {addon.name}</span>
                            <span className="shrink-0 tabular">{formatarPreco(addon.totalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <p className="col-start-2 shrink-0 self-start text-sm font-extrabold tabular text-graf-950 sm:col-start-3 sm:row-start-1 sm:text-base">
                    {formatarPreco(item.totalCents)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-graf-200 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Subtotal</dt>
                <dd className="shrink-0 font-semibold tabular text-graf-900">
                  {formatarPreco(pedido.subtotalCents)}
                </dd>
              </div>
              {pedido.discountCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="min-w-0 text-graf-600">
                    Desconto{" "}
                    {pedido.couponCode ? (
                      <span className="label-mono break-all text-graf-500">{pedido.couponCode}</span>
                    ) : null}
                  </dt>
                  <dd className="shrink-0 font-semibold tabular text-ok-700">
                    − {formatarPreco(pedido.discountCents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex min-w-0 items-start justify-between gap-4">
                <dt className="shrink-0 text-graf-600">Frete</dt>
                <dd className="min-w-0 max-w-52 break-words text-right leading-snug text-graf-700">
                  {pedido.shippingCents > 0 ? (
                    <span className="font-semibold tabular text-graf-900">
                      {formatarPreco(pedido.shippingCents)}
                    </span>
                  ) : (
                    pedido.shippingLabel || "A combinar com a JB"
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-graf-200 pt-4">
                <dt className="text-base font-bold text-graf-900">Total</dt>
                <dd className="shrink-0 text-xl font-extrabold tabular tracking-tight text-graf-950 sm:text-2xl">
                  {formatarPreco(pedido.totalCents)}
                </dd>
              </div>
            </dl>

            {pedido.customerNote ? (
              <div className="mt-6 min-w-0 rounded-lg border border-graf-200 bg-graf-50 p-4">
                <p className="text-apoio font-bold uppercase tracking-wider text-graf-500">
                  Sua observação
                </p>
                <p className="mt-1.5 break-words text-sm leading-relaxed text-graf-700">
                  {pedido.customerNote}
                </p>
              </div>
            ) : null}
          </Cartao>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-28">
          <Cartao className="min-w-0 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
              {pedido.shippingKind === "retirada" ? (
                <Store className="size-[18px] text-graf-500" aria-hidden />
              ) : (
                <MapPin className="size-[18px] text-graf-500" aria-hidden />
              )}
              {pedido.shippingKind === "retirada" ? "Retirada na JB" : "Endereço de entrega"}
            </h2>

            <div className="mt-3.5 min-w-0 break-words text-sm leading-relaxed text-graf-700">
              {pedido.shippingKind === "retirada" ? (
                <>
                  {s.empresa_nome ? <p className="font-semibold text-graf-900">{s.empresa_nome}</p> : null}
                  {enderecoCompleto(s) ? <p className="mt-1">{enderecoCompleto(s)}</p> : null}
                  {s.horario ? <p className="mt-1 text-graf-500">{s.horario}</p> : null}
                  {s.retirada_instrucoes ? <p className="mt-2 text-graf-600">{s.retirada_instrucoes}</p> : null}
                </>
              ) : pedido.shipStreet ? (
                <>
                  <p>
                    {pedido.shipStreet}, {pedido.shipNumber || "s/n"}
                    {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}
                  </p>
                  {linhaLocalidade ? <p className="mt-1 text-graf-500">{linhaLocalidade}</p> : null}
                  {pedido.shipReference ? <p className="mt-1 text-graf-500">Referência: {pedido.shipReference}</p> : null}
                  {pedido.shippingLabel ? <p className="mt-2 text-graf-600">{pedido.shippingLabel}</p> : null}
                </>
              ) : (
                <p className="text-graf-600">
                  {pedido.shippingLabel || "A JB entra em contato para combinar a entrega."}
                </p>
              )}
            </div>
          </Cartao>

          <Cartao className="min-w-0 p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Comprador</h2>
            <div className="mt-3.5 min-w-0 break-words text-sm leading-relaxed text-graf-700">
              <p className="font-semibold text-graf-900">{pedido.buyerName}</p>
              {pedido.companyName ? <p>{pedido.companyName}</p> : null}
              <p className="mt-1.5 break-all text-graf-600">{pedido.buyerEmail}</p>
              {pedido.buyerPhone ? <p className="text-graf-600">{pedido.buyerPhone}</p> : null}
            </div>
            <p className="mt-4 flex items-start gap-2 border-t border-graf-200 pt-4 text-apoio leading-relaxed text-graf-500">
              <Mail className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
              <span className="min-w-0">A confirmação e os avisos deste pedido vão para este e-mail.</span>
            </p>
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Precisa de ajuda?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              Fale com a equipe da JB citando o número {pedido.number}.
            </p>
            <div className="mt-4 space-y-2.5">
              {whatsapp ? (
                <LinkBotao
                  href={whatsapp}
                  variante="secundario"
                  larguraTotal
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </LinkBotao>
              ) : null}
              {telefone ? (
                <LinkBotao href={telefone} variante="secundario" larguraTotal>
                  <Phone className="size-4" aria-hidden />
                  {s.telefone}
                </LinkBotao>
              ) : null}
              <LinkBotao href="/loja" variante="texto" larguraTotal>
                <Package className="size-4" aria-hidden />
                Continuar comprando
              </LinkBotao>
            </div>
            {s.horario ? (
              <p className="mt-4 text-center text-apoio leading-relaxed text-graf-500">
                {s.horario}
              </p>
            ) : null}
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
