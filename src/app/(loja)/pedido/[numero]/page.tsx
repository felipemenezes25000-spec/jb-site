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
import { ipDoPedido } from "@/lib/seguranca";
import { formatarDataHora, formatarPreco, telHref, whatsappHref } from "@/lib/format";
import { pagamentoEhSimulado, provedorPagamento } from "@/lib/pagamento";
import { FLUXO_PADRAO, ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { enderecoCompleto, getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

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

/**
 * O que cada etapa quer dizer, em português de quem comprou.
 *
 * O rótulo sozinho ("Em separação", "Enviado") é vocabulário de quem trabalha
 * com pedido o dia inteiro. A frase só entra quando a JB ainda não escreveu
 * uma nota própria para aquela etapa — recado de quem atende vale mais do que
 * texto padrão. Nada aqui promete prazo: prazo quem dá é a JB, no chamado.
 */
function explicacaoDaEtapa(status: OrderStatus, retirada: boolean): string {
  switch (status) {
    case "aguardando_pagamento":
      return "O pedido está registrado e o equipamento, reservado para você.";
    case "pago":
      return "Com o pagamento confirmado, a JB começa a preparar o equipamento.";
    case "separacao":
      return retirada
        ? "A JB separa e confere o equipamento para a retirada."
        : "A JB separa, confere e embala o equipamento.";
    case "enviado":
      return retirada
        ? "O equipamento fica à sua disposição na loja da JB."
        : "O equipamento sai da JB para o endereço de entrega.";
    case "entregue":
      return retirada
        ? "Equipamento retirado na JB."
        : "O equipamento chega ao endereço informado.";
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
    // o pedido pode estar num status que não é etapa do fluxo (revisão
    // técnica, por exemplo): ele aparece como detalhe da etapa corrente
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
      lista.push({ valor: "cartao", rotulo: "Cartão (demonstração)" });
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
      (await pedidosDoNavegador()).includes(pedido.number));

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
          <h1 className="text-display texto-forte">Acompanhar pedido</h1>
          <p className="texto-guia mt-3 text-graf-600">
            Antes de abrir o pedido, confirmamos o e-mail usado na compra. É o mesmo cuidado que a
            JB toma no telefone: só falamos do pedido com quem comprou.
          </p>

          <Cartao className="mt-8 p-5 sm:p-7">
            <ConfirmarEmailPedido numero={numero} acao={conferirEmailDoPedido} />
          </Cartao>

          <p className="mt-6 flex flex-wrap items-start gap-x-1.5 gap-y-1 text-sm leading-relaxed text-graf-600">
            <Lock className="mt-1 size-4 shrink-0 text-graf-400" aria-hidden />
            <span>
              Tem conta na JB?{" "}
              <Link
                href={`/entrar?voltar=${encodeURIComponent(`/pedido/${numero}`)}`}
                className="font-semibold text-jb-700 underline decoration-jb-300 underline-offset-2 transition-colors hover:text-jb-800"
              >
                Entre na sua conta
              </Link>{" "}
              e veja todos os seus pedidos sem precisar conferir nada.
            </span>
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

  const passos = montarLinhaDoTempo(
    pedido.status,
    pedido.events,
    pedido.shippingKind === "retirada",
  );

  /*
   * Os equipamentos que este pedido criou no prontuário.
   *
   * Consultados só quando o pedido está pago: antes disso não existe nenhum, e
   * a consulta seria uma ida ao banco para confirmar o vazio. O bloco na tela
   * aparece apenas se houver linha — anunciar o prontuário antes da
   * confirmação do pagamento afirmaria um estado que ainda não é verdade.
   */
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

  /* Bairro · Cidade/UF · CEP montados por junção: com o pedaço que falta
     removido antes, nunca sobra um "·" órfão começando a linha. */
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
    <div className="container-jb py-8 lg:py-12">
      {trilha}

      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="sobretitulo">Pedido</p>
          <h1 className="text-display texto-forte mt-2">{pedido.number}</h1>
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
          ? "Este pedido foi encerrado e não aceita novo pagamento. Se quiser retomar a compra, a JB resolve com você pelo telefone ou WhatsApp."
          : pago
            ? "Recebemos o seu pagamento. Daqui em diante a JB cuida do equipamento e você acompanha cada etapa por esta página."
            : "Seu pedido está registrado e reservado. Falta concluir o pagamento — é o que libera a separação do equipamento."}
      </p>

      {/* o provedor de teste precisa ficar evidente na tela do pedido também:
          é aqui que alguém olharia para decidir se "pago" quer dizer pago */}
      {simulado ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-warn-500/50 bg-warn-50 px-4 py-3.5">
          <FlaskConical className="mt-0.5 size-5 shrink-0 text-warn-700" aria-hidden />
          <div className="min-w-0 text-sm leading-relaxed text-graf-700">
            <p className="font-bold text-warn-700">Ambiente de demonstração</p>
            <p className="mt-1">
              Este pedido é de demonstração: nenhum valor foi cobrado e nenhum equipamento será
              despachado. A tela mostra exatamente o que uma compra real mostraria.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          {/* ------------------------------------------------ prontuário

              Vem antes do pagamento porque, quando existe, é a novidade: o
              pagamento já foi confirmado e o que a pessoa ainda não sabe é que
              o equipamento ganhou ficha. */}
          <ProntuarioDoPedido
            equipamentos={equipamentosDoPedido.map((equipamento) => ({
              id: equipamento.id,
              nome: equipamento.name,
              serial: equipamento.serialNumber,
              garantiaAte: equipamento.warrantyUntil,
            }))}
          />

          {/* ------------------------------------------------- pagamento */}
          <Cartao className="p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Pagamento</h2>

            <div className="mt-5">
              {pago ? (
                <Aviso
                  tom="sucesso"
                  titulo={simulado ? "Pagamento confirmado (demonstração)" : "Pagamento confirmado"}
                >
                  {simulado
                    ? `A confirmação foi registrada em ${formatarDataHora(pedido.paidAt)} pela demonstração — nenhum valor foi cobrado. Numa compra real, é a partir daqui que a JB começa a preparar o equipamento.`
                    : `Recebemos a confirmação em ${formatarDataHora(pedido.paidAt)}. A JB já está preparando seu equipamento e avisa a cada mudança de etapa.`}
                </Aviso>
              ) : encerrado ? (
                <Aviso tom="atencao" titulo={ROTULO_STATUS[pedido.status]}>
                  Este pedido foi encerrado e não aceita novo pagamento. Se precisar retomar a
                  compra, fale com a JB — o histórico continua aqui.
                </Aviso>
              ) : !pagamento ? (
                <Aviso tom="atencao" titulo="Falta abrir a cobrança">
                  Seu pedido está registrado, mas ainda não tem cobrança aberta. Gere uma abaixo
                  para concluir.
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
                  O banco está conferindo o pagamento. Costuma levar poucos minutos, e esta
                  página avisa assim que houver resposta.
                </Aviso>
              ) : pagamento.status === "recusado" ? (
                <Aviso tom="erro" titulo="Pagamento recusado">
                  {pagamento.failReason ||
                    "O banco recusou o pagamento. Nada foi cobrado — você pode tentar de novo abaixo."}
                </Aviso>
              ) : expirou || pagamento.status === "expirado" ? (
                <Aviso tom="atencao" titulo="A cobrança expirou">
                  O prazo do código terminou e nada foi cobrado. Gere uma nova cobrança para
                  concluir o pedido — os itens continuam reservados.
                </Aviso>
              ) : pagamento.status === "estornado" ? (
                <Aviso tom="atencao" titulo="Pagamento estornado">
                  O valor foi devolvido. Se tiver dúvida sobre o prazo de retorno no seu banco,
                  fale com a JB citando o número do pedido.
                </Aviso>
              ) : (
                <Aviso tom="info" titulo="Aguardando a confirmação do pagamento">
                  A cobrança já foi aberta. A confirmação chega direto do meio de pagamento, e
                  esta página se atualiza sozinha assim que ela vier.
                </Aviso>
              )}
            </div>

            {pagamento ? (
              <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-graf-200 pt-5 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-graf-500">Forma de pagamento</dt>
                  <dd className="font-semibold text-graf-900 sm:mt-1">
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
                  <dd className="font-semibold tabular text-graf-900 sm:mt-1">
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
          <Cartao className="p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Andamento do pedido</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
              A JB atualiza esta linha a cada etapa concluída.
            </p>
            <div className="mt-6">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>

          {/* ----------------------------------------------------- itens */}
          <Cartao className="p-5 sm:p-7">
            <h2 className="text-lg font-bold text-graf-950">Itens do pedido</h2>

            <ul className="mt-5 divide-y divide-graf-200">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-graf-200 bg-white sm:size-24">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 96px, 80px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-graf-400">
                        <ImageOff className="size-5" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {item.brandName ? (
                      <p className="text-[0.8125rem] font-semibold uppercase tracking-wide text-graf-500">
                        {item.brandName}
                      </p>
                    ) : null}
                    <p className="text-[0.9375rem] font-bold leading-snug text-graf-950 sm:text-base">
                      {item.name}
                    </p>
                    <p className="mt-1 text-[0.8125rem] text-graf-500">
                      {item.sku ? <span className="label-mono">{item.sku}</span> : null}
                      {item.sku ? " · " : ""}
                      {item.quantity}× {formatarPreco(item.unitPriceCents)}
                    </p>

                    {item.addons.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-l-2 border-jb-200 pl-3">
                        {item.addons.map((addon) => (
                          <li
                            key={addon.id}
                            className="flex justify-between gap-3 text-[0.8125rem] text-graf-600"
                          >
                            <span>+ {addon.name}</span>
                            <span className="tabular">{formatarPreco(addon.totalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-base font-extrabold tabular text-graf-950">
                    {formatarPreco(item.totalCents)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-graf-200 pt-5 text-sm">
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
              <div className="flex items-start justify-between gap-4">
                <dt className="text-graf-600">Frete</dt>
                <dd className="max-w-52 text-right leading-snug text-graf-700">
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
                <dd className="text-2xl font-extrabold tabular tracking-tight text-graf-950">
                  {formatarPreco(pedido.totalCents)}
                </dd>
              </div>
            </dl>

            {pedido.customerNote ? (
              <div className="mt-6 rounded-lg border border-graf-200 bg-graf-50 p-4">
                <p className="text-[0.8125rem] font-bold uppercase tracking-wider text-graf-500">
                  Sua observação
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-graf-700">
                  {pedido.customerNote}
                </p>
              </div>
            ) : null}
          </Cartao>
        </div>

        {/* --------------------------------------------------------- lado */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-28">
          <Cartao className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
              {pedido.shippingKind === "retirada" ? (
                <Store className="size-[18px] text-graf-500" aria-hidden />
              ) : (
                <MapPin className="size-[18px] text-graf-500" aria-hidden />
              )}
              {pedido.shippingKind === "retirada" ? "Retirada na JB" : "Endereço de entrega"}
            </h2>

            <div className="mt-3.5 text-sm leading-relaxed text-graf-700">
              {pedido.shippingKind === "retirada" ? (
                <>
                  {s.empresa_nome ? (
                    <p className="font-semibold text-graf-900">{s.empresa_nome}</p>
                  ) : null}
                  {enderecoCompleto(s) ? <p className="mt-1">{enderecoCompleto(s)}</p> : null}
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
                  {linhaLocalidade ? (
                    <p className="mt-1 text-graf-500">{linhaLocalidade}</p>
                  ) : null}
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

          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Comprador</h2>
            <div className="mt-3.5 text-sm leading-relaxed text-graf-700">
              <p className="font-semibold text-graf-900">{pedido.buyerName}</p>
              {pedido.companyName ? <p>{pedido.companyName}</p> : null}
              <p className="mt-1.5 break-words text-graf-600">{pedido.buyerEmail}</p>
              {pedido.buyerPhone ? <p className="text-graf-600">{pedido.buyerPhone}</p> : null}
            </div>
            <p className="mt-4 flex items-start gap-2 border-t border-graf-200 pt-4 text-[0.8125rem] leading-relaxed text-graf-500">
              <Mail className="mt-0.5 size-3.5 shrink-0 text-graf-400" aria-hidden />
              A confirmação e os avisos deste pedido vão para este e-mail.
            </p>
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-graf-950">Precisa de ajuda?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              Fale com a equipe da JB citando o número {pedido.number} — quem atende já abre o
              pedido na tela.
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
              <p className="mt-4 text-center text-[0.8125rem] leading-relaxed text-graf-500">
                {s.horario}
              </p>
            ) : null}
          </Cartao>
        </div>
      </div>
    </div>
  );
}
