import crypto from "node:crypto";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import type { OrderStatus } from "@prisma/client";
import {
  ImageOff,
  Lock,
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
import { sessaoCliente } from "@/lib/auth-cliente";
import { ipDoPedido } from "@/lib/seguranca";
import { formatarDataHora, formatarPreco, telHref, whatsappHref } from "@/lib/format";
import { pagamentoEhSimulado, provedorPagamento } from "@/lib/pagamento";
import { FLUXO_PADRAO, ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { enderecoCompleto, getSettings } from "@/lib/settings";

/* ============================================================================
   Acompanhamento do pedido

   Quem pode ver o quê:
   · cliente logado, dono do pedido  → tudo, direto;
   · quem acabou de comprar          → cookie assinado gravado no fechamento;
   · qualquer outro                  → precisa conferir o e-mail da compra.

   O número do pedido é sequencial, então ele sozinho não pode abrir nada: sem
   uma das três provas acima a página mostra exatamente a mesma tela de
   conferência, exista o pedido ou não. Assim ninguém descobre pedidos alheios
   contando de um em um.
   ============================================================================ */

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

/* ------------------------------------------------- cookie de acompanhamento */

/**
 * Par de leitura do cookie gravado em src/app/acoes/checkout.ts. As duas
 * pontas precisam mudar juntas: formato `numero1.numero2~assinatura`.
 *
 * A verificação é duplicada aqui de propósito. O arquivo de ações é "use
 * server", onde todo export vira endpoint público — não dá para exportar um
 * utilitário compartilhado de lá sem abrir uma porta que ninguém pediu.
 */
const COOKIE_PEDIDOS = "jb_pedidos";
const DURACAO_PEDIDOS = 60 * 60 * 24 * 30;
const MAX_PEDIDOS_NO_COOKIE = 10;

function assinarPedidos(lista: string) {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente no ambiente");
  return crypto.createHmac("sha256", `${segredo}:pedido`).update(lista).digest("base64url");
}

function conferirAssinatura(lista: string, assinatura: string) {
  const esperada = assinarPedidos(lista);
  if (assinatura.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada));
}

function numerosDoCookie(bruto: string | undefined) {
  if (!bruto) return [];
  const corte = bruto.lastIndexOf("~");
  if (corte <= 0) return [];
  const lista = bruto.slice(0, corte);
  return conferirAssinatura(lista, bruto.slice(corte + 1)) ? lista.split(".") : [];
}

async function liberarAcompanhamento(numero: string) {
  const jar = await cookies();
  const anteriores = numerosDoCookie(jar.get(COOKIE_PEDIDOS)?.value);
  const lista = [numero, ...anteriores.filter((n) => n !== numero)]
    .slice(0, MAX_PEDIDOS_NO_COOKIE)
    .join(".");

  jar.set(COOKIE_PEDIDOS, `${lista}~${assinarPedidos(lista)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_PEDIDOS,
  });
}

/* ------------------------------------------------------- conferência por e-mail */

const LIMITE_TENTATIVAS = 8;
const JANELA_MS = 15 * 60_000;

/**
 * Freio de força bruta, no banco.
 *
 * A versão anterior contava em memória do processo. Em serverless cada
 * invocação pode cair numa instância nova, então o contador reiniciava sozinho
 * — e o número do pedido é sequencial (JB-000001, JB-000002...), o que torna a
 * varredura trivial. `LoginAttempt` é a tabela que a plataforma já usa para
 * tentativas e sobrevive entre instâncias.
 */
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

  const numero = String(formData.get("numero") ?? "")
    .trim()
    .toUpperCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!numero || !email) {
    return { erro: "Informe o e-mail usado na compra." };
  }
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

  // mensagem única para pedido inexistente e para e-mail errado
  if (!pedido || !confere) {
    return { erro: "Não encontramos um pedido com esse número e esse e-mail." };
  }

  await liberarAcompanhamento(pedido.number);
  revalidatePath(`/pedido/${pedido.number}`);
  return { ok: true };
}

/* ----------------------------------------------------------- linha do tempo */

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

function montarLinhaDoTempo(
  statusAtual: OrderStatus,
  eventos: { status: OrderStatus; note: string; createdAt: Date }[],
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
    // o pedido pode estar num status que não é etapa do fluxo (revisão
    // técnica, por exemplo): ele aparece como detalhe da etapa corrente
    const detalhe =
      i === atual && !encerrado && status !== statusAtual
        ? `Agora: ${ROTULO_STATUS[statusAtual]}`
        : "";

    return {
      titulo: ROTULO_STATUS[status],
      descricao: detalhe || marco?.note || undefined,
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
    const ultimo = [...eventos].reverse().find((e) => e.status === statusAtual);
    passos.push({
      titulo: ROTULO_STATUS[statusAtual],
      descricao: ultimo?.note || undefined,
      quando: ultimo ? formatarDataHora(ultimo.createdAt) : undefined,
      estado: "cancelado",
    });
  }

  return passos;
}

/** O que dá para reabrir sem voltar ao checkout. */
function metodosDeRetentativa(simulado: boolean) {
  try {
    const disponiveis = provedorPagamento().metodos;
    const lista: { valor: string; rotulo: string }[] = [];
    if (disponiveis.includes("pix")) lista.push({ valor: "pix", rotulo: "Pix" });
    // Cartão de verdade exige os campos seguros do provedor, que só existem no
    // checkout — esta página nunca pede dado de cartão. Na simulação não há
    // tokenização, então reabrir por cartão é honesto.
    if (simulado && disponiveis.includes("cartao")) {
      lista.push({ valor: "cartao", rotulo: "Cartão (simulação)" });
    }
    return lista;
  } catch (erro) {
    console.error("[pedido] provedor de pagamento indisponível", erro);
    return [];
  }
}

/* -------------------------------------------------------------------- tela */

export default async function PedidoPage({ params }: Props) {
  const [{ numero: bruto }, s] = await Promise.all([params, getSettings()]);

  const numero = decodeURIComponent(bruto).trim().toUpperCase();

  const [pedido, sessao, jar] = await Promise.all([
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
    cookies(),
  ]);

  /**
   * Duas portas, e só duas: a sessão do dono, ou o cookie assinado que o
   * formulário de conferência grava.
   *
   * Existia uma terceira, `?email=` na URL, e ela era a fraca: não passava
   * pelo freio de tentativas — dava para varrer e-mails num laço de GET — e
   * ainda deixava o endereço no histórico do navegador, no referer e em
   * qualquer link compartilhado. O formulário faz a mesma conferência com
   * limite de tentativas e mensagem única, então a porta foi fechada.
   */
  const liberado =
    pedido !== null &&
    ((sessao !== null && pedido.customerId === sessao.id) ||
      numerosDoCookie(jar.get(COOKIE_PEDIDOS)?.value).includes(pedido.number));

  const trilha = (
    <Trilha
      itens={[{ rotulo: "Início", href: "/" }, { rotulo: `Pedido ${numero}` }]}
      className="mb-5"
    />
  );

  /* ------------------------------------------------------------- portaria */

  if (!liberado) {
    return (
      <div className="container-jb py-8 lg:py-12">
        {trilha}
        <div className="mx-auto max-w-xl">
          <h1 className="text-display leading-tight">Acompanhar pedido</h1>
          <p className="mt-3 text-base leading-relaxed text-graf-600">
            Para proteger seus dados, confirmamos o e-mail usado na compra antes de mostrar o
            pedido.
          </p>

          <Cartao className="mt-7 p-5 sm:p-6">
            <ConfirmarEmailPedido numero={numero} acao={conferirEmailDoPedido} />
          </Cartao>

          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-graf-500">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tem conta na JB?{" "}
            <Link
              href={`/entrar?voltar=${encodeURIComponent(`/pedido/${numero}`)}`}
              className="font-semibold text-jb-700 underline"
            >
              Entre na sua conta
            </Link>{" "}
            e veja todos os seus pedidos sem precisar conferir nada.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- pedido */

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

  const passos = montarLinhaDoTempo(pedido.status, pedido.events);
  const telefone = telHref(s.telefone);
  const whatsapp = whatsappHref(
    s.whatsapp,
    `Olá! Sou ${pedido.buyerName} e queria falar sobre o pedido ${pedido.number}.`,
  );

  return (
    <div className="container-jb py-8 lg:py-12">
      {trilha}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="label-mono uppercase text-graf-500">Pedido</p>
          <h1 className="text-display leading-tight">{pedido.number}</h1>
          <p className="mt-1 text-sm text-graf-500">
            Feito em {formatarDataHora(pedido.placedAt)}
          </p>
        </div>
        <Etiqueta tom={TOM_DO_STATUS[pedido.status]} ponto className="mt-2">
          {ROTULO_STATUS[pedido.status]}
        </Etiqueta>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          {/* ------------------------------------------------- pagamento */}
          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Pagamento</h2>

            <div className="mt-4">
              {pago ? (
                <Aviso tom="sucesso" titulo="Pagamento confirmado">
                  Recebemos a confirmação em {formatarDataHora(pedido.paidAt)}. A JB já está
                  preparando seu equipamento e avisa a cada mudança de etapa.
                </Aviso>
              ) : encerrado ? (
                <Aviso tom="atencao" titulo={ROTULO_STATUS[pedido.status]}>
                  Este pedido foi encerrado e não aceita novo pagamento. Se precisar retomar a
                  compra, fale com a JB.
                </Aviso>
              ) : !pagamento ? (
                <Aviso tom="atencao" titulo="Nenhuma cobrança aberta">
                  Este pedido ainda não tem cobrança. Gere uma abaixo para concluir.
                </Aviso>
              ) : pagamento.method === "pix" && aguardandoProvedor ? (
                <PagamentoPix
                  qrCode={pagamento.pixQrCode}
                  copiaECola={pagamento.pixCopyPaste}
                  expiraEm={pagamento.expiresAt ? pagamento.expiresAt.toISOString() : null}
                  valorCents={pagamento.amountCents}
                />
              ) : pagamento.status === "em_analise" ? (
                <Aviso tom="info" titulo="Pagamento em análise">
                  O emissor está conferindo a transação. Costuma levar poucos minutos, e esta
                  página avisa assim que houver resposta.
                </Aviso>
              ) : pagamento.status === "recusado" ? (
                <Aviso tom="erro" titulo="Pagamento recusado">
                  {pagamento.failReason ||
                    "O emissor recusou a transação. Nada foi cobrado — dá para tentar de novo."}
                </Aviso>
              ) : expirou || pagamento.status === "expirado" ? (
                <Aviso tom="atencao" titulo="A cobrança expirou">
                  O prazo do código terminou e nada foi cobrado. Gere uma nova cobrança para
                  concluir o pedido.
                </Aviso>
              ) : pagamento.status === "estornado" ? (
                <Aviso tom="atencao" titulo="Pagamento estornado">
                  O valor foi devolvido pelo provedor.
                </Aviso>
              ) : (
                <Aviso tom="info" titulo="Aguardando o provedor">
                  A cobrança foi aberta e ainda não teve resposta. Esta página se atualiza
                  sozinha.
                </Aviso>
              )}
            </div>

            {pagamento ? (
              <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-graf-200 pt-4 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-graf-500">Forma</dt>
                  <dd className="font-semibold text-graf-900">
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
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-graf-500">Valor da cobrança</dt>
                  <dd className="font-semibold tabular text-graf-900">
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

          {/* --------------------------------------------- linha do tempo */}
          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Andamento</h2>
            <div className="mt-5">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>

          {/* ----------------------------------------------------- itens */}
          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Itens do pedido</h2>

            <ul className="mt-4 divide-y divide-graf-200">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-graf-200 bg-graf-50 sm:size-20">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-graf-300">
                        <ImageOff className="size-5" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {item.brandName ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                        {item.brandName}
                      </p>
                    ) : null}
                    <p className="text-sm font-bold leading-snug text-graf-900">{item.name}</p>
                    <p className="mt-1 text-xs text-graf-500">
                      {item.sku ? <span className="label-mono">{item.sku}</span> : null}
                      {item.sku ? " · " : ""}
                      {item.quantity}× {formatarPreco(item.unitPriceCents)}
                    </p>

                    {item.addons.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-l-2 border-jb-200 pl-3">
                        {item.addons.map((addon) => (
                          <li
                            key={addon.id}
                            className="flex justify-between gap-3 text-xs text-graf-600"
                          >
                            <span>+ {addon.name}</span>
                            <span className="tabular">{formatarPreco(addon.totalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-sm font-extrabold tabular text-graf-950">
                    {formatarPreco(item.totalCents)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-graf-200 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Subtotal</dt>
                <dd className="font-semibold tabular text-graf-900">
                  {formatarPreco(pedido.subtotalCents)}
                </dd>
              </div>
              {pedido.discountCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">
                    Desconto{" "}
                    {pedido.couponCode ? (
                      <span className="label-mono text-graf-500">{pedido.couponCode}</span>
                    ) : null}
                  </dt>
                  <dd className="font-semibold tabular text-ok-700">
                    − {formatarPreco(pedido.discountCents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Frete</dt>
                <dd className="text-right text-graf-700">
                  {pedido.shippingCents > 0
                    ? formatarPreco(pedido.shippingCents)
                    : (pedido.shippingLabel ?? "A combinar")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-graf-200 pt-3">
                <dt className="text-sm font-bold text-graf-900">Total</dt>
                <dd className="text-xl font-extrabold tabular text-graf-950">
                  {formatarPreco(pedido.totalCents)}
                </dd>
              </div>
            </dl>

            {pedido.customerNote ? (
              <div className="mt-5 rounded-lg bg-graf-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                  Sua observação
                </p>
                <p className="mt-1 text-sm leading-relaxed text-graf-700">
                  {pedido.customerNote}
                </p>
              </div>
            ) : null}
          </Cartao>
        </div>

        {/* --------------------------------------------------------- lado */}
        <div className="min-w-0 space-y-6 lg:sticky lg:top-28">
          <Cartao className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
              {pedido.shippingKind === "retirada" ? (
                <Store className="size-4 text-graf-500" aria-hidden />
              ) : (
                <MapPin className="size-4 text-graf-500" aria-hidden />
              )}
              {pedido.shippingKind === "retirada" ? "Retirada" : "Entrega"}
            </h2>

            <div className="mt-3 text-sm leading-relaxed text-graf-700">
              {pedido.shippingKind === "retirada" ? (
                <>
                  <p className="font-semibold text-graf-900">{s.empresa_nome}</p>
                  <p className="mt-1">{enderecoCompleto(s)}</p>
                  {s.horario ? <p className="mt-1 text-graf-500">{s.horario}</p> : null}
                  {s.retirada_instrucoes ? (
                    <p className="mt-2 text-graf-600">{s.retirada_instrucoes}</p>
                  ) : null}
                </>
              ) : pedido.shipStreet ? (
                <>
                  <p>
                    {pedido.shipStreet}, {pedido.shipNumber || "s/n"}
                    {pedido.shipComplement ? ` — ${pedido.shipComplement}` : ""}
                  </p>
                  <p className="mt-1 text-graf-500">
                    {pedido.shipDistrict} · {pedido.shipCity}
                    {pedido.shipState ? `/${pedido.shipState}` : ""}
                    {pedido.shipZip ? ` · CEP ${pedido.shipZip}` : ""}
                  </p>
                  {pedido.shipReference ? (
                    <p className="mt-1 text-graf-500">Referência: {pedido.shipReference}</p>
                  ) : null}
                  {pedido.shippingLabel ? (
                    <p className="mt-2 text-graf-600">{pedido.shippingLabel}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-graf-600">
                  {pedido.shippingLabel || "A JB entra em contato para combinar a entrega."}
                </p>
              )}
            </div>
          </Cartao>

          <Cartao className="p-5">
            <h2 className="text-base font-bold text-graf-950">Comprador</h2>
            <div className="mt-3 text-sm leading-relaxed text-graf-700">
              <p className="font-semibold text-graf-900">{pedido.buyerName}</p>
              {pedido.companyName ? <p>{pedido.companyName}</p> : null}
              <p className="mt-1 text-graf-500">{pedido.buyerEmail}</p>
              {pedido.buyerPhone ? <p className="text-graf-500">{pedido.buyerPhone}</p> : null}
            </div>
          </Cartao>

          <Cartao className="p-5">
            <h2 className="text-base font-bold text-graf-950">Precisa de ajuda?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              Fale com a JB citando o número {pedido.number}.
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
          </Cartao>
        </div>
      </div>
    </div>
  );
}
