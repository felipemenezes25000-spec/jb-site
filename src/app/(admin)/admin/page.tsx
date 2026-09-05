import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Urgency } from "@prisma/client";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  ShieldAlert,
  ShoppingCart,
  Stethoscope,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Indicador, Indicadores } from "@/components/admin/indicador";
import { Cartao, CabecalhoCartao, Esqueleto, Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
import type { StaffUser } from "@/lib/auth";
import { distanciaEmDias, formatarData, formatarDataExtensa, formatarPreco, plural } from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";
import { AREAS, exigirStaffAdmin, podeVer, type AreaAdmin } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Visão geral",
};

/**
 * Painel inicial do backoffice.
 *
 * Cada número aqui sai do banco e leva para a lista que o explica — não existe
 * bloco decorativo. O que aparece depende do papel: quem não abre uma área não
 * vê nem o número dela, e a consulta correspondente nem chega a rodar.
 */

/* ------------------------------------------------------------------- datas */

/**
 * Início do mês no fuso de São Paulo. O Brasil não usa mais horário de verão
 * desde 2019, então o deslocamento é fixo em -03:00.
 */
function inicioDoMes(deslocamentoMeses = 0) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-");

  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1 + deslocamentoMeses;
  return new Date(Date.UTC(ano, mes, 1, 3, 0, 0));
}

function variacaoPercentual(atual: number, anterior: number) {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/* ------------------------------------------------------------------ rótulos */

const ORDEM_STATUS: OrderStatus[] = [
  "aguardando_pagamento",
  "pagamento_em_analise",
  "pago",
  "separacao",
  "revisao_tecnica",
  "aguardando_frete",
  "pronto_retirada",
  "enviado",
  "instalacao_agendada",
  "entregue",
  "concluido",
  "cancelado",
  "reembolsado",
];

/** Pedidos que dependem de alguém da JB mexer. */
const AGUARDANDO_ACAO: OrderStatus[] = [
  "pagamento_em_analise",
  "pago",
  "separacao",
  "revisao_tecnica",
  "aguardando_frete",
  "pronto_retirada",
  "instalacao_agendada",
];

function tomDoPedido(status: OrderStatus): Tom {
  if (status === "cancelado" || status === "reembolsado") return "alerta";
  if (status === "concluido" || status === "entregue") return "ok";
  if (status === "aguardando_pagamento" || status === "pagamento_em_analise") return "aguardando";
  return "andamento";
}

const ROTULO_URGENCIA: Record<Urgency, string> = {
  parado: "Equipamento parado",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

const TOM_URGENCIA: Record<Urgency, Tom> = {
  parado: "alerta",
  alta: "aguardando",
  normal: "andamento",
  baixa: "neutro",
};

const ORDEM_URGENCIA: Urgency[] = ["parado", "alta", "normal", "baixa"];

/* -------------------------------------------------------------- utilitários */

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-graf-950">{titulo}</h2>
        <p className="text-sm text-graf-500">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

function Linha({
  href,
  titulo,
  detalhe,
  valor,
  etiqueta,
}: {
  href: string;
  titulo: string;
  detalhe: string;
  valor?: string;
  etiqueta?: { texto: string; tom: Tom };
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors",
          "hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-graf-900">{titulo}</span>
          <span className="block truncate text-xs text-graf-500">{detalhe}</span>
        </span>
        {valor ? (
          <span className="tabular shrink-0 text-sm font-semibold text-graf-800">{valor}</span>
        ) : null}
        {etiqueta ? <Etiqueta tom={etiqueta.tom}>{etiqueta.texto}</Etiqueta> : null}
      </Link>
    </li>
  );
}

function CorpoVazio({ texto }: { texto: string }) {
  return <Vazio titulo={texto} className="m-4 border-graf-200 bg-transparent py-8" />;
}

function EsqueletoBloco() {
  return (
    <div className="space-y-3">
      <Esqueleto className="h-5 w-40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Esqueleto className="h-64" />
        <Esqueleto className="h-64" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- página */

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; area?: string }>;
}) {
  const usuario = await exigirStaffAdmin();
  const { erro, area } = await searchParams;

  const areaNegada =
    erro === "permissao" && area && area in AREAS ? AREAS[area as AreaAdmin].rotulo : null;

  const verComercial = podeVer(usuario, "pedidos");
  const verOrcamentos = podeVer(usuario, "orcamentos");
  const verAssistencia = podeVer(usuario, "assistencia");
  const verEstoque = podeVer(usuario, "estoque") || podeVer(usuario, "produtos");
  const verLeads = podeVer(usuario, "leads");

  const semBlocos = !verComercial && !verOrcamentos && !verAssistencia && !verEstoque && !verLeads;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-graf-950">
          Olá, {usuario.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-graf-500">
          {formatarDataExtensa(new Date())} · o que precisa de atenção agora
        </p>
      </header>

      {areaNegada || erro === "permissao" ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-warn-500/30 bg-warn-50 px-4 py-3 text-sm font-medium text-warn-700"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {areaNegada
              ? `Seu perfil não abre a área "${areaNegada}". Fale com um administrador se precisar desse acesso.`
              : "Seu perfil não tem acesso à área solicitada."}
          </span>
        </p>
      ) : null}

      {verComercial ? (
        <Suspense fallback={<EsqueletoBloco />}>
          <BlocoComercial usuario={usuario} />
        </Suspense>
      ) : null}

      {verAssistencia ? (
        <Suspense fallback={<EsqueletoBloco />}>
          <BlocoAssistencia />
        </Suspense>
      ) : null}

      {verEstoque || verLeads ? (
        <Suspense fallback={<Esqueleto className="h-64" />}>
          <BlocoApoio verEstoque={verEstoque} verLeads={verLeads} />
        </Suspense>
      ) : null}

      {semBlocos ? (
        <Vazio
          titulo="Nada atribuído ao seu perfil ainda"
          descricao="Seu usuário está ativo, mas o papel atual não abre nenhuma área com números. Um administrador pode ajustar isso em Usuários."
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- comercial */

async function BlocoComercial({ usuario }: { usuario: StaffUser }) {
  const mesAtual = inicioDoMes();
  const mesAnterior = inicioDoMes(-1);
  const verOrcamentos = podeVer(usuario, "orcamentos");

  const [faturamento, faturamentoAnterior, porStatus, ultimos, orcamentos, orcamentosLista] =
    await Promise.all([
      prisma.order.aggregate({
        _sum: { totalCents: true },
        _count: { _all: true },
        where: {
          paidAt: { gte: mesAtual },
          status: { notIn: ["cancelado", "reembolsado"] },
        },
      }),
      prisma.order.aggregate({
        _sum: { totalCents: true },
        where: {
          paidAt: { gte: mesAnterior, lt: mesAtual },
          status: { notIn: ["cancelado", "reembolsado"] },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 6,
        select: {
          id: true,
          number: true,
          status: true,
          buyerName: true,
          totalCents: true,
          placedAt: true,
        },
      }),
      verOrcamentos
        ? prisma.quote.count({ where: { status: { in: ["enviado", "em_duvida"] } } })
        : Promise.resolve(0),
      verOrcamentos
        ? prisma.quote.findMany({
            where: { status: { in: ["enviado", "em_duvida"] } },
            orderBy: [{ validUntil: "asc" }, { sentAt: "asc" }],
            take: 5,
            select: {
              id: true,
              number: true,
              contactName: true,
              totalCents: true,
              validUntil: true,
              customer: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const contagem = new Map(porStatus.map((linha) => [linha.status, linha._count._all] as const));
  const somar = (status: OrderStatus[]) =>
    status.reduce((total, chave) => total + (contagem.get(chave) ?? 0), 0);

  const receitaMes = faturamento._sum.totalCents ?? 0;
  const receitaAnterior = faturamentoAnterior._sum.totalCents ?? 0;
  const variacao = variacaoPercentual(receitaMes, receitaAnterior);
  const aguardandoAcao = somar(AGUARDANDO_ACAO);
  const aguardandoPagamento = contagem.get("aguardando_pagamento") ?? 0;

  return (
    <Secao titulo="Comercial" descricao="Vendas da loja, fila de expedição e propostas abertas">
      <Indicadores>
        <Indicador
          rotulo="Faturamento do mês"
          valor={formatarPreco(receitaMes)}
          detalhe={`${plural(faturamento._count._all, "pedido pago", "pedidos pagos")} desde ${formatarData(mesAtual)}`}
          icone={Wallet}
          tom="ok"
          href="/admin/pedidos?status=pago"
          hrefRotulo="Ver pedidos pagos"
          variacao={
            variacao === null
              ? undefined
              : { percentual: variacao, rotulo: "sobre o mês anterior" }
          }
        />
        <Indicador
          rotulo="Aguardando ação da JB"
          valor={aguardandoAcao}
          detalhe="Pagos, em separação, revisão técnica ou prontos para sair"
          icone={ShoppingCart}
          tom={aguardandoAcao > 0 ? "aviso" : "neutro"}
          href="/admin/pedidos"
          hrefRotulo="Abrir fila de pedidos"
        />
        <Indicador
          rotulo="Aguardando pagamento"
          valor={aguardandoPagamento}
          detalhe="Pedidos fechados que ainda não foram pagos"
          icone={ShoppingCart}
          tom="neutro"
          href="/admin/pedidos?status=aguardando_pagamento"
        />
        {verOrcamentos ? (
          <Indicador
            rotulo="Orçamentos sem resposta"
            valor={orcamentos}
            detalhe="Enviados ao cliente, esperando aprovação"
            icone={FileText}
            tom={orcamentos > 0 ? "aviso" : "neutro"}
            href="/admin/orcamentos?status=enviado"
          />
        ) : null}
      </Indicadores>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Cartao>
          <CabecalhoCartao
            titulo="Pedidos por status"
            descricao="Toda a base, do mais recente ao encerrado"
          />
          {porStatus.length === 0 ? (
            <CorpoVazio texto="Nenhum pedido registrado ainda" />
          ) : (
            <ul className="divide-y divide-graf-100">
              {ORDEM_STATUS.filter((status) => (contagem.get(status) ?? 0) > 0).map((status) => (
                <Linha
                  key={status}
                  href={`/admin/pedidos?status=${status}`}
                  titulo={ROTULO_STATUS[status]}
                  detalhe={plural(contagem.get(status) ?? 0, "pedido", "pedidos")}
                  etiqueta={{ texto: String(contagem.get(status) ?? 0), tom: tomDoPedido(status) }}
                />
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <CabecalhoCartao
            titulo="Últimos pedidos"
            acao={
              <LinkBotao href="/admin/pedidos" variante="secundario" tamanho="sm">
                Ver todos
              </LinkBotao>
            }
          />
          {ultimos.length === 0 ? (
            <CorpoVazio texto="Nenhum pedido registrado ainda" />
          ) : (
            <ul className="divide-y divide-graf-100">
              {ultimos.map((pedido) => (
                <Linha
                  key={pedido.id}
                  href={`/admin/pedidos/${pedido.id}`}
                  titulo={`${pedido.number} · ${pedido.buyerName}`}
                  detalhe={formatarData(pedido.placedAt)}
                  valor={formatarPreco(pedido.totalCents)}
                  etiqueta={{
                    texto: ROTULO_STATUS[pedido.status],
                    tom: tomDoPedido(pedido.status),
                  }}
                />
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {verOrcamentos ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Orçamentos esperando o cliente"
            descricao="Ordenados pelo que vence primeiro"
            acao={
              <LinkBotao href="/admin/orcamentos" variante="secundario" tamanho="sm">
                Ver orçamentos
              </LinkBotao>
            }
          />
          {orcamentosLista.length === 0 ? (
            <CorpoVazio texto="Nenhum orçamento aguardando resposta" />
          ) : (
            <ul className="divide-y divide-graf-100">
              {orcamentosLista.map((orcamento) => (
                <Linha
                  key={orcamento.id}
                  href={`/admin/orcamentos/${orcamento.id}`}
                  titulo={`${orcamento.number} · ${orcamento.customer?.name ?? (orcamento.contactName || "Contato não informado")}`}
                  detalhe={
                    orcamento.validUntil
                      ? `Vale até ${formatarData(orcamento.validUntil)} (${distanciaEmDias(orcamento.validUntil)})`
                      : "Sem prazo de validade"
                  }
                  valor={formatarPreco(orcamento.totalCents)}
                />
              ))}
            </ul>
          )}
        </Cartao>
      ) : null}
    </Secao>
  );
}

/* -------------------------------------------------------------- assistência */

async function BlocoAssistencia() {
  const agora = new Date();
  const em30Dias = new Date(agora.getTime() + 30 * 86_400_000);

  const [porUrgencia, osPorStatus, visitasTotal, visitasAtrasadas, visitas, urgentes] =
    await Promise.all([
      prisma.serviceRequest.groupBy({
        by: ["urgency"],
        where: { status: { notIn: ["concluido", "cancelado"] } },
        _count: { _all: true },
      }),
      prisma.workOrder.groupBy({
        by: ["status"],
        where: { status: { in: ["aberta", "em_execucao", "aguardando_peca", "aguardando_aprovacao"] } },
        _count: { _all: true },
      }),
      prisma.maintenanceVisit.count({
        where: { status: { in: ["prevista", "agendada"] }, dueAt: { lte: em30Dias } },
      }),
      prisma.maintenanceVisit.count({
        where: { status: { in: ["prevista", "agendada"] }, dueAt: { lt: agora } },
      }),
      prisma.maintenanceVisit.findMany({
        where: { status: { in: ["prevista", "agendada"] }, dueAt: { lte: em30Dias } },
        orderBy: { dueAt: "asc" },
        take: 6,
        select: {
          id: true,
          dueAt: true,
          status: true,
          equipment: {
            select: { name: true, brandName: true, customer: { select: { name: true } } },
          },
        },
      }),
      prisma.serviceRequest.findMany({
        where: {
          status: { notIn: ["concluido", "cancelado"] },
          urgency: { in: ["parado", "alta"] },
        },
        orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          id: true,
          number: true,
          contactName: true,
          urgency: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
    ]);

  const urgencia = new Map(porUrgencia.map((linha) => [linha.urgency, linha._count._all] as const));
  const chamadosAbertos = porUrgencia.reduce((total, linha) => total + linha._count._all, 0);
  const chamadosCriticos = (urgencia.get("parado") ?? 0) + (urgencia.get("alta") ?? 0);

  const os = new Map(osPorStatus.map((linha) => [linha.status, linha._count._all] as const));
  const osEmExecucao = os.get("em_execucao") ?? 0;
  const osAbertas = osPorStatus.reduce((total, linha) => total + linha._count._all, 0);

  return (
    <Secao
      titulo="Assistência técnica"
      descricao="Chamados em aberto, ordens de serviço e a agenda preventiva"
    >
      <Indicadores>
        <Indicador
          rotulo="Chamados em aberto"
          valor={chamadosAbertos}
          detalhe="Da solicitação recebida até os testes finais"
          icone={Stethoscope}
          tom="marca"
          href="/admin/assistencia"
          hrefRotulo="Abrir chamados"
        />
        <Indicador
          rotulo="Urgentes"
          valor={chamadosCriticos}
          detalhe="Equipamento parado ou urgência alta"
          icone={TriangleAlert}
          tom={chamadosCriticos > 0 ? "aviso" : "neutro"}
          href="/admin/assistencia?urgencia=parado"
        />
        <Indicador
          rotulo="OS em execução"
          valor={osEmExecucao}
          detalhe={`${plural(osAbertas, "ordem aberta", "ordens abertas")} no total`}
          icone={ClipboardList}
          tom={osEmExecucao > 0 ? "info" : "neutro"}
          href="/admin/os?status=em_execucao"
        />
        <Indicador
          rotulo="Visitas em 30 dias"
          valor={visitasTotal}
          detalhe={
            visitasAtrasadas > 0
              ? `${plural(visitasAtrasadas, "visita vencida", "visitas vencidas")} nesse total`
              : "Nenhuma visita vencida"
          }
          icone={CalendarClock}
          tom={visitasAtrasadas > 0 ? "aviso" : "neutro"}
          href="/admin/manutencao"
          hrefRotulo="Ver agenda"
        />
      </Indicadores>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Cartao>
          <CabecalhoCartao
            titulo="Chamados por urgência"
            descricao="Somente os que ainda não foram concluídos"
          />
          {chamadosAbertos === 0 ? (
            <CorpoVazio texto="Nenhum chamado em aberto" />
          ) : (
            <>
              <ul className="divide-y divide-graf-100">
                {ORDEM_URGENCIA.filter((nivel) => (urgencia.get(nivel) ?? 0) > 0).map((nivel) => (
                  <Linha
                    key={nivel}
                    href={`/admin/assistencia?urgencia=${nivel}`}
                    titulo={ROTULO_URGENCIA[nivel]}
                    detalhe={plural(urgencia.get(nivel) ?? 0, "chamado", "chamados")}
                    etiqueta={{
                      texto: String(urgencia.get(nivel) ?? 0),
                      tom: TOM_URGENCIA[nivel],
                    }}
                  />
                ))}
              </ul>

              {urgentes.length > 0 ? (
                <div className="border-t border-graf-200 bg-graf-50/60 px-5 py-3">
                  <p className="label-mono mb-2 uppercase text-graf-500">Precisa de resposta</p>
                  <ul className="space-y-1.5">
                    {urgentes.map((chamado) => (
                      <li key={chamado.id}>
                        <Link
                          href={`/admin/assistencia/${chamado.id}`}
                          className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-0.5 rounded text-sm text-graf-700 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          <span className="label-mono text-graf-500">{chamado.number}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {chamado.customer?.name ?? chamado.contactName}
                          </span>
                          <span className="text-xs text-graf-500">
                            aberto {distanciaEmDias(chamado.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </Cartao>

        <Cartao>
          <CabecalhoCartao
            titulo="Próximas visitas de manutenção"
            descricao="Previstas e agendadas para os próximos 30 dias"
            acao={
              <LinkBotao href="/admin/manutencao" variante="secundario" tamanho="sm">
                Ver agenda
              </LinkBotao>
            }
          />
          {visitas.length === 0 ? (
            <CorpoVazio texto="Nenhuma visita prevista para os próximos 30 dias" />
          ) : (
            <ul className="divide-y divide-graf-100">
              {visitas.map((visita) => (
                <Linha
                  key={visita.id}
                  href={`/admin/manutencao/${visita.id}`}
                  titulo={`${visita.equipment.name}${visita.equipment.brandName ? ` · ${visita.equipment.brandName}` : ""}`}
                  detalhe={visita.equipment.customer.name}
                  valor={formatarData(visita.dueAt)}
                  etiqueta={{
                    texto: distanciaEmDias(visita.dueAt),
                    tom: visita.dueAt < agora ? "alerta" : "aguardando",
                  }}
                />
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------ estoque/leads */

async function BlocoApoio({
  verEstoque,
  verLeads,
}: {
  verEstoque: boolean;
  verLeads: boolean;
}) {
  const [estoqueBaixo, estoqueTotal, leadsNovos, leads] = await Promise.all([
    verEstoque
      ? prisma.product.findMany({
          where: {
            status: "active",
            trackInventory: true,
            stock: { lte: prisma.product.fields.lowStockAlert },
          },
          orderBy: { stock: "asc" },
          take: 6,
          select: { id: true, name: true, sku: true, stock: true, lowStockAlert: true },
        })
      : Promise.resolve([]),
    verEstoque
      ? prisma.product.count({
          where: {
            status: "active",
            trackInventory: true,
            stock: { lte: prisma.product.fields.lowStockAlert },
          },
        })
      : Promise.resolve(0),
    verLeads ? prisma.lead.count({ where: { status: "novo" } }) : Promise.resolve(0),
    verLeads
      ? prisma.lead.findMany({
          where: { status: "novo" },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { id: true, nome: true, cidade: true, estado: true, email: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Secao
      titulo="Catálogo e captação"
      descricao="O que pode faltar na prateleira e quem chegou pelo site"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {verEstoque ? (
          <Cartao>
            <CabecalhoCartao
              titulo="Estoque baixo"
              descricao={
                estoqueTotal > 0
                  ? `${plural(estoqueTotal, "produto ativo", "produtos ativos")} no ou abaixo do alerta`
                  : "Comparação com o alerta configurado em cada produto"
              }
              acao={
                <LinkBotao href="/admin/estoque" variante="secundario" tamanho="sm">
                  Ver estoque
                </LinkBotao>
              }
            />
            {estoqueBaixo.length === 0 ? (
              <CorpoVazio texto="Nenhum produto ativo abaixo do alerta" />
            ) : (
              <ul className="divide-y divide-graf-100">
                {estoqueBaixo.map((produto) => (
                  <Linha
                    key={produto.id}
                    href={`/admin/produtos/${produto.id}`}
                    titulo={produto.name}
                    detalhe={`SKU ${produto.sku} · alerta em ${produto.lowStockAlert}`}
                    etiqueta={{
                      texto:
                        produto.stock <= 0
                          ? "Sem estoque"
                          : plural(produto.stock, "unidade", "unidades"),
                      tom: produto.stock <= 0 ? "alerta" : "aguardando",
                    }}
                  />
                ))}
              </ul>
            )}
          </Cartao>
        ) : null}

        {verLeads ? (
          <Cartao>
            <CabecalhoCartao
              titulo="Leads novos"
              descricao={
                leadsNovos > 0
                  ? `${plural(leadsNovos, "contato aguardando", "contatos aguardando")} retorno`
                  : "Contatos vindos dos formulários do site"
              }
              acao={
                <LinkBotao href="/admin/leads" variante="secundario" tamanho="sm">
                  Ver leads
                </LinkBotao>
              }
            />
            {leads.length === 0 ? (
              <CorpoVazio texto="Nenhum lead novo no momento" />
            ) : (
              <ul className="divide-y divide-graf-100">
                {leads.map((lead) => (
                  <Linha
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    titulo={lead.nome}
                    detalhe={
                      [lead.cidade, lead.estado].filter(Boolean).join(" · ") || lead.email
                    }
                    etiqueta={{ texto: distanciaEmDias(lead.createdAt), tom: "andamento" }}
                  />
                ))}
              </ul>
            )}
          </Cartao>
        ) : null}
      </div>
    </Secao>
  );
}
