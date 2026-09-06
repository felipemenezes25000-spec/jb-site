import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardList,
  FileText,
  LifeBuoy,
  MapPin,
  Package,
  Stethoscope,
  Wrench,
} from "lucide-react";

import { marcarAvisosComoLidos } from "@/app/acoes/minha-jb";
import { PrecisaDeAtencao, type Pendencia } from "@/components/conta/mj-atencao";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, Vazio } from "@/components/ui/data";
import { CartaoMetrica, GradeMetricas } from "@/components/ui/metrica";
import { ROTULO_CHAMADO, ROTULO_URGENCIA, STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import {
  distanciaEmDias,
  formatarData,
  formatarDataHora,
  formatarPreco,
  plural,
} from "@/lib/format";
import { STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { listarNotificacoes } from "@/lib/notificacoes";
import { ROTULO_ORCAMENTO, STATUS_ORCAMENTO_ABERTOS } from "@/lib/orcamento";
import { ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Área da Clínica",
  description: "Acompanhe pedidos, chamados, equipamentos e manutenções da sua clínica.",
  robots: { index: false, follow: false },
};

const DIA = 86_400_000;

const EQUIPAMENTOS_EM_ALERTA = ["em_manutencao", "aguardando_peca", "inoperante"] as const;

/** Um pedido sai da contagem de "em andamento" quando não há mais o que acompanhar. */
const PEDIDOS_ENCERRADOS = ["concluido", "cancelado", "reembolsado"] as const;

type Compromisso = {
  quando: Date;
  titulo: string;
  descricao: string;
  href: string;
  confirmado: boolean;
};

/** Tom da etiqueta de pedido: verde no que terminou bem, cinza no cancelado. */
function tomDoPedido(status: string) {
  if (status === "concluido" || status === "entregue") return "ok" as const;
  if (status === "cancelado" || status === "reembolsado") return "neutro" as const;
  if (status === "aguardando_pagamento" || status === "pagamento_em_analise") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

function tomDoChamado(status: string) {
  if (status === "concluido") return "ok" as const;
  if (status === "cancelado") return "neutro" as const;
  if (status === "aguardando_cliente" || status === "aguardando_aprovacao") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

function Bloco({
  titulo,
  descricao,
  href,
  rotuloLink,
  children,
}: {
  titulo: string;
  descricao?: string;
  href: string;
  rotuloLink: string;
  children: React.ReactNode;
}) {
  return (
    <Cartao className="flex flex-col">
      <CabecalhoCartao
        titulo={titulo}
        descricao={descricao}
        acao={
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            {rotuloLink}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <div className="flex-1 p-5 pt-4">{children}</div>
    </Cartao>
  );
}

function ListaVazia({ texto }: { texto: string }) {
  return <p className="py-4 text-sm leading-relaxed text-graf-500">{texto}</p>;
}

export default async function VisaoGeralPage() {
  const cliente = await exigirCliente("/minha-jb");
  const agora = new Date();
  const em30Dias = new Date(agora.getTime() + 30 * DIA);

  const [
    pedidos,
    chamados,
    orcamentos,
    equipamentos,
    agendamentos,
    visitas,
    instalacoes,
    avisos,
    totalEquipamentos,
    equipamentosEmAlerta,
    chamadosAbertos,
    orcamentosAbertos,
    pedidosEmAndamento,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: cliente.id },
      orderBy: { placedAt: "desc" },
      take: 4,
      select: {
        id: true,
        number: true,
        status: true,
        placedAt: true,
        totalCents: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { customerId: cliente.id, status: { in: STATUS_CHAMADO_ABERTOS } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        number: true,
        status: true,
        urgency: true,
        createdAt: true,
        equipment: { select: { name: true } },
        brandName: true,
        modelName: true,
      },
    }),
    prisma.quote.findMany({
      where: { customerId: cliente.id, status: { in: STATUS_ORCAMENTO_ABERTOS } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        number: true,
        status: true,
        kind: true,
        totalCents: true,
        validUntil: true,
      },
    }),
    prisma.equipment.findMany({
      where: {
        customerId: cliente.id,
        OR: [
          { status: { in: [...EQUIPAMENTOS_EM_ALERTA] } },
          { nextMaintenanceAt: { lte: em30Dias } },
        ],
      },
      orderBy: [{ status: "asc" }, { nextMaintenanceAt: "asc" }],
      take: 4,
      select: {
        id: true,
        name: true,
        brandName: true,
        modelName: true,
        status: true,
        nextMaintenanceAt: true,
      },
    }),
    prisma.serviceAppointment.findMany({
      where: {
        startsAt: { gte: agora },
        status: { in: ["agendado", "em_andamento"] },
        OR: [
          { request: { customerId: cliente.id } },
          { installTask: { order: { customerId: cliente.id } } },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 1,
      select: {
        id: true,
        title: true,
        startsAt: true,
        addressSummary: true,
        request: { select: { id: true, number: true } },
        installTask: { select: { order: { select: { id: true, number: true } } } },
      },
    }),
    prisma.maintenanceVisit.findMany({
      where: {
        status: { in: STATUS_VISITA_ABERTOS },
        equipment: { customerId: cliente.id },
      },
      orderBy: { dueAt: "asc" },
      take: 1,
      select: {
        id: true,
        status: true,
        dueAt: true,
        scheduledAt: true,
        equipment: { select: { id: true, name: true } },
      },
    }),
    prisma.installationTask.findMany({
      where: {
        status: "agendada",
        scheduledAt: { gte: agora },
        appointment: null,
        order: { customerId: cliente.id },
      },
      orderBy: { scheduledAt: "asc" },
      take: 1,
      select: {
        id: true,
        scheduledAt: true,
        order: { select: { id: true, number: true } },
      },
    }),
    listarNotificacoes({ customerId: cliente.id, apenasNaoLidas: true, limite: 4 }),
    prisma.equipment.count({ where: { customerId: cliente.id } }),
    prisma.equipment.count({
      where: { customerId: cliente.id, status: { in: [...EQUIPAMENTOS_EM_ALERTA] } },
    }),
    prisma.serviceRequest.count({
      where: { customerId: cliente.id, status: { in: STATUS_CHAMADO_ABERTOS } },
    }),
    prisma.quote.count({
      where: { customerId: cliente.id, status: { in: STATUS_ORCAMENTO_ABERTOS } },
    }),
    prisma.order.count({
      where: { customerId: cliente.id, status: { notIn: [...PEDIDOS_ENCERRADOS] } },
    }),
  ]);

  /* ------------------------------------------------ próximo compromisso */

  const candidatos: Compromisso[] = [];

  for (const agendamento of agendamentos) {
    const pedido = agendamento.installTask?.order;
    candidatos.push({
      quando: agendamento.startsAt,
      titulo: agendamento.title || "Visita técnica",
      descricao:
        agendamento.addressSummary ||
        (agendamento.request
          ? `Chamado ${agendamento.request.number}`
          : pedido
            ? `Instalação do pedido ${pedido.number}`
            : "Atendimento agendado"),
      href: agendamento.request
        ? `/minha-jb/assistencia/${agendamento.request.number}`
        : pedido
          ? `/minha-jb/pedidos/${pedido.number}`
          : "/minha-jb/assistencia",
      confirmado: true,
    });
  }

  for (const visita of visitas) {
    const quando = visita.scheduledAt ?? visita.dueAt;
    candidatos.push({
      quando,
      titulo: `Manutenção preventiva — ${visita.equipment.name}`,
      descricao:
        visita.status === "agendada"
          ? "Visita confirmada com a equipe técnica."
          : "Prevista em contrato. A equipe confirma a data com você.",
      href: "/minha-jb/manutencoes",
      confirmado: visita.status === "agendada",
    });
  }

  for (const tarefa of instalacoes) {
    if (!tarefa.scheduledAt) continue;
    candidatos.push({
      quando: tarefa.scheduledAt,
      titulo: `Instalação do pedido ${tarefa.order.number}`,
      descricao: "Instalação agendada pela equipe técnica.",
      href: `/minha-jb/pedidos/${tarefa.order.number}`,
      confirmado: true,
    });
  }

  const proximo = candidatos.sort((a, b) => a.quando.getTime() - b.quando.getTime())[0];

  /* ------------------------------------------- precisa da sua atenção

     Só o que espera uma decisão de quem está lendo. Equipamento em manutenção
     ou aguardando peça fica de fora de propósito: a bola está com a JB, e
     listar isso aqui transformaria o bloco em mais um resumo. */

  const pendencias: Pendencia[] = [];

  for (const equipamento of equipamentos) {
    const identificacao = [equipamento.name, equipamento.brandName, equipamento.modelName]
      .filter(Boolean)
      .join(" · ");

    if (equipamento.status === "inoperante") {
      pendencias.push({
        chave: `equipamento-parado-${equipamento.id}`,
        urgencia: "alta",
        titulo: "Equipamento parado",
        detalhe: identificacao,
        href: `/minha-jb/equipamentos/${equipamento.id}`,
        acao: "Abrir chamado",
      });
      continue;
    }

    if (equipamento.nextMaintenanceAt && equipamento.nextMaintenanceAt < agora) {
      pendencias.push({
        chave: `preventiva-vencida-${equipamento.id}`,
        urgencia: "media",
        titulo: "Manutenção preventiva vencida",
        detalhe: `${identificacao} · prevista para ${formatarData(equipamento.nextMaintenanceAt)}`,
        href: `/minha-jb/equipamentos/${equipamento.id}`,
        acao: "Ver equipamento",
      });
    }
  }

  for (const orcamento of orcamentos) {
    if (orcamento.status !== "enviado") continue;
    pendencias.push({
      chave: `orcamento-${orcamento.id}`,
      urgencia: "alta",
      titulo: "Orçamento esperando a sua decisão",
      detalhe: [
        orcamento.number,
        formatarPreco(orcamento.totalCents),
        orcamento.validUntil ? `vale até ${formatarData(orcamento.validUntil)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/minha-jb/orcamentos/${orcamento.number}`,
      acao: "Aprovar ou recusar",
    });
  }

  for (const chamado of chamados) {
    if (chamado.status !== "aguardando_cliente") continue;
    pendencias.push({
      chave: `chamado-${chamado.id}`,
      urgencia: "alta",
      titulo: "Chamado esperando a sua resposta",
      detalhe: [
        chamado.number,
        chamado.equipment?.name ??
          [chamado.brandName, chamado.modelName].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/minha-jb/assistencia/${chamado.number}`,
      acao: "Responder",
    });
  }

  for (const pedido of pedidos) {
    if (pedido.status !== "aguardando_pagamento") continue;
    pendencias.push({
      chave: `pedido-${pedido.id}`,
      urgencia: "media",
      titulo: "Pedido aguardando pagamento",
      detalhe: `${pedido.number} · ${formatarPreco(pedido.totalCents)}`,
      href: `/minha-jb/pedidos/${pedido.number}`,
      acao: "Concluir pagamento",
    });
  }

  // urgente primeiro, mantendo a ordem de entrada dentro de cada nível
  pendencias.sort((a, b) => Number(b.urgencia === "alta") - Number(a.urgencia === "alta"));

  const primeiroNome = cliente.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div>
      <Topo
        titulo="Visão geral"
        descricao={
          primeiroNome
            ? `Olá, ${primeiroNome}. Este é o retrato da sua clínica agora: o que está agendado, o que espera resposta e o que os equipamentos estão pedindo.`
            : "O retrato da sua clínica agora: o que está agendado, o que espera resposta e o que os equipamentos estão pedindo."
        }
      />

      {pendencias.length > 0 ? (
        <div className="mb-6">
          <PrecisaDeAtencao pendencias={pendencias} />
        </div>
      ) : null}

      {/* ------------------------------------------------------ números */}
      <section aria-labelledby="numeros">
        <h2 id="numeros" className="sr-only">
          Números da sua conta
        </h2>
        <GradeMetricas>
          <CartaoMetrica
            rotulo="Equipamentos no prontuário"
            valor={totalEquipamentos}
            unidade={totalEquipamentos === 1 ? "equipamento" : "equipamentos"}
            icone={Stethoscope}
            tom={equipamentosEmAlerta > 0 ? "atencao" : "marca"}
            destaque
            detalhe={
              totalEquipamentos === 0
                ? "Cadastre o primeiro para começar o histórico."
                : equipamentosEmAlerta > 0
                  ? `${plural(equipamentosEmAlerta, "equipamento", "equipamentos")} fora de operação normal.`
                  : "Nenhum equipamento em alerta."
            }
            href="/minha-jb/equipamentos"
            hrefRotulo="Ver prontuário"
          />
          <CartaoMetrica
            rotulo="Chamados de assistência"
            valor={chamadosAbertos}
            unidade="em aberto"
            icone={LifeBuoy}
            tom={chamadosAbertos > 0 ? "info" : "neutro"}
            detalhe={
              chamadosAbertos > 0
                ? "Acompanhe a etapa de cada atendimento."
                : "Nenhum atendimento em andamento."
            }
            href="/minha-jb/assistencia"
            hrefRotulo="Ver chamados"
          />
          <CartaoMetrica
            rotulo="Orçamentos"
            valor={orcamentosAbertos}
            unidade="aguardando"
            icone={ClipboardList}
            tom={orcamentosAbertos > 0 ? "atencao" : "neutro"}
            detalhe={
              orcamentosAbertos > 0
                ? "Propostas esperando aprovar ou recusar."
                : "Nenhuma proposta esperando resposta."
            }
            href="/minha-jb/orcamentos"
            hrefRotulo="Ver orçamentos"
          />
          <CartaoMetrica
            rotulo="Pedidos"
            valor={pedidosEmAndamento}
            unidade="em andamento"
            icone={Package}
            tom={pedidosEmAndamento > 0 ? "info" : "neutro"}
            detalhe={
              pedidosEmAndamento > 0
                ? "Do pagamento à entrega e à instalação."
                : "Nenhum pedido em andamento."
            }
            href="/minha-jb/pedidos"
            hrefRotulo="Ver pedidos"
          />
        </GradeMetricas>
      </section>

      {/* ------------------------------------------- próximo compromisso */}
      <Cartao className="mt-6 overflow-hidden">
        {proximo ? (
          <div className="grid sm:grid-cols-[13.5rem_minmax(0,1fr)]">
            <div className="flex flex-col justify-center gap-1 border-b border-graf-200 bg-graf-50 p-5 sm:border-b-0 sm:border-r">
              <p className="label-mono text-xs text-graf-500">Próximo compromisso</p>
              <p className="tabular text-title font-extrabold leading-none text-graf-950">
                {formatarData(proximo.quando)}
              </p>
              <p className="text-sm font-semibold text-jb-700">
                {distanciaEmDias(proximo.quando)}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5">
              <div className="min-w-0">
                <p className="text-base font-bold text-graf-950">{proximo.titulo}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-graf-600">
                  {proximo.descricao}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-graf-900">
                    <CalendarClock className="size-4 text-graf-500" aria-hidden />
                    {formatarDataHora(proximo.quando)}
                  </span>
                  <Etiqueta tom={proximo.confirmado ? "ok" : "aguardando"}>
                    {proximo.confirmado ? "Data confirmada" : "Data a combinar"}
                  </Etiqueta>
                </p>
              </div>
              <LinkBotao href={proximo.href} variante="secundario" tamanho="sm">
                Ver detalhes
              </LinkBotao>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-graf-100 text-graf-600">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="label-mono text-xs text-graf-500">Próximo compromisso</p>
              <p className="mt-1 text-base font-bold text-graf-950">Nenhuma visita marcada</p>
              <p className="mt-0.5 text-sm leading-relaxed text-graf-600">
                Quando houver visita técnica, instalação ou preventiva agendada, ela aparece
                aqui com data e horário.
              </p>
            </div>
            <LinkBotao href="/minha-jb/assistencia/novo" tamanho="sm">
              Abrir chamado
            </LinkBotao>
          </div>
        )}
      </Cartao>

      {/* ------------------------------------------------------- blocos */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Bloco
          titulo="Pedidos recentes"
          href="/minha-jb/pedidos"
          rotuloLink="Ver todos"
        >
          {pedidos.length === 0 ? (
            <ListaVazia texto="Você ainda não fez pedidos pelo site. Os pedidos feitos pela equipe também aparecem aqui." />
          ) : (
            <ul className="divide-y divide-graf-100">
              {pedidos.map((pedido) => (
                <li key={pedido.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link
                      href={`/minha-jb/pedidos/${pedido.number}`}
                      /* O número é a porta de entrada do registro e no
                         celular é tocado, não clicado: o `py` leva a área
                         tocável a 47px e o `-my` devolve o espaço, então a
                         lista continua com o mesmo ritmo. */
                      className="-my-3.5 inline-block py-3.5 text-sm font-bold text-graf-900 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {pedido.number}
                    </Link>
                    <span className="tabular text-sm font-semibold text-graf-900">
                      {formatarPreco(pedido.totalCents)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-graf-500">
                    <Etiqueta tom={tomDoPedido(pedido.status)}>
                      {ROTULO_STATUS[pedido.status]}
                    </Etiqueta>
                    <span>{formatarData(pedido.placedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{plural(pedido._count.items, "item", "itens")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco
          titulo="Chamados em aberto"
          href="/minha-jb/assistencia"
          rotuloLink="Ver todos"
        >
          {chamados.length === 0 ? (
            <ListaVazia texto="Nenhum chamado em andamento. Se algum equipamento parou ou está fazendo barulho estranho, abra um chamado — a triagem responde no mesmo dia útil." />
          ) : (
            <ul className="divide-y divide-graf-100">
              {chamados.map((chamado) => (
                <li key={chamado.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/minha-jb/assistencia/${chamado.number}`}
                    className="-my-3.5 inline-block py-3.5 text-sm font-bold text-graf-900 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {chamado.number}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-graf-600">
                    {chamado.equipment?.name ||
                      [chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
                      "Equipamento não identificado"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Etiqueta tom={tomDoChamado(chamado.status)}>
                      {ROTULO_CHAMADO[chamado.status]}
                    </Etiqueta>
                    {chamado.urgency === "parado" || chamado.urgency === "alta" ? (
                      <Etiqueta tom="alerta">{ROTULO_URGENCIA[chamado.urgency]}</Etiqueta>
                    ) : null}
                    <span className="text-xs text-graf-500">
                      aberto em {formatarData(chamado.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco
          titulo="Orçamentos aguardando resposta"
          href="/minha-jb/orcamentos"
          rotuloLink="Ver todos"
        >
          {orcamentos.length === 0 ? (
            <ListaVazia texto="Nenhuma proposta esperando por você. Quando a equipe enviar um orçamento, ele aparece aqui para aprovar ou recusar." />
          ) : (
            <ul className="divide-y divide-graf-100">
              {orcamentos.map((orcamento) => (
                <li key={orcamento.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <Link
                      href={`/minha-jb/orcamentos/${orcamento.number}`}
                      /* O número é a porta de entrada do registro e no
                         celular é tocado, não clicado: o `py` leva a área
                         tocável a 47px e o `-my` devolve o espaço, então a
                         lista continua com o mesmo ritmo. */
                      className="-my-3.5 inline-block py-3.5 text-sm font-bold text-graf-900 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {orcamento.number}
                    </Link>
                    <span className="tabular text-sm font-semibold text-graf-900">
                      {formatarPreco(orcamento.totalCents)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-graf-500">
                    <Etiqueta tom="aguardando">{ROTULO_ORCAMENTO[orcamento.status]}</Etiqueta>
                    <span>
                      {orcamento.kind === "assistencia" ? "Assistência" : "Comercial"}
                    </span>
                    {orcamento.validUntil ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>válido até {formatarData(orcamento.validUntil)}</span>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco
          titulo="Equipamentos que pedem atenção"
          href="/minha-jb/equipamentos"
          rotuloLink="Ver todos"
        >
          {equipamentos.length === 0 ? (
            <ListaVazia texto="Nada em alerta e nenhuma preventiva vencendo nos próximos 30 dias." />
          ) : (
            <ul className="divide-y divide-graf-100">
              {equipamentos.map((equipamento) => (
                <li key={equipamento.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/minha-jb/equipamentos/${equipamento.id}`}
                    className="-my-3.5 inline-block py-3.5 text-sm font-bold text-graf-900 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {equipamento.name}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-graf-600">
                    {[equipamento.brandName, equipamento.modelName]
                      .filter(Boolean)
                      .join(" ") || "Marca e modelo não informados"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Etiqueta
                      tom={equipamento.status === "operacional" ? "ok" : "alerta"}
                    >
                      {ROTULO_EQUIPAMENTO[equipamento.status]}
                    </Etiqueta>
                    {equipamento.nextMaintenanceAt ? (
                      <span className="text-xs text-graf-500">
                        preventiva em {formatarData(equipamento.nextMaintenanceAt)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>

      {/* ------------------------------------------------------ atalhos */}
      <section className="mt-8" aria-labelledby="atalhos">
        <h2 id="atalhos" className="mb-3 text-base font-bold text-graf-950">
          Atalhos
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              href: "/minha-jb/assistencia/novo",
              icone: LifeBuoy,
              titulo: "Abrir chamado",
              texto: "Equipamento com defeito, ruído ou parado.",
            },
            {
              href: "/minha-jb/equipamentos/novo",
              icone: Stethoscope,
              titulo: "Cadastrar equipamento",
              texto: "Monte o prontuário da sua clínica.",
            },
            {
              href: "/minha-jb/documentos",
              icone: FileText,
              titulo: "Notas e documentos",
              texto: "Notas fiscais, laudos e certificados.",
            },
            {
              href: "/minha-jb/manutencoes",
              icone: Wrench,
              titulo: "Manutenções",
              texto: "Contratos e visitas previstas.",
            },
            {
              href: "/minha-jb/enderecos",
              icone: MapPin,
              titulo: "Endereços",
              texto: "Onde entregamos e atendemos.",
            },
            {
              href: "/loja",
              icone: Package,
              titulo: "Ver equipamentos",
              texto: "Catálogo de novos e seminovos revisados.",
            },
          ].map((atalho) => (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="flex min-h-11 items-start gap-3 rounded-xl border border-graf-200 bg-white p-4 transition-[box-shadow,border-color] hover:border-graf-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <atalho.icone className="mt-0.5 size-5 shrink-0 text-jb-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-graf-950">
                    {atalho.titulo}
                  </span>
                  <span className="mt-0.5 block text-sm text-graf-600">{atalho.texto}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- avisos

          Os avisos ficam no fim porque são registro do que já aconteceu, não
          pendência: o que espera decisão está lá em cima. O sino do topo
          aponta para esta âncora, e `scroll-mt` desconta a altura da barra
          fixa para o bloco não parar escondido atrás dela. */}
      {avisos.length > 0 ? (
        <section id="avisos" aria-labelledby="mj-avisos" className="mt-8 scroll-mt-24">
          <Cartao className="border-info-500/25 bg-info-50/60">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-5">
              <BellRing className="mt-0.5 size-5 shrink-0 text-info-700" aria-hidden />
              {/* Sem largura mínima, a coluna do texto encolhia até caber ao
                  lado do botão no celular e cada aviso saía quebrado em três
                  palavras por linha. Com ela, o botão desce para a linha de
                  baixo. */}
              <div className="min-w-[15rem] flex-1">
                <h2 id="mj-avisos" className="text-sm font-bold text-info-700">
                  {plural(avisos.length, "aviso novo", "avisos novos")}
                </h2>
                <ul className="mt-2 space-y-2">
                  {avisos.map((aviso) => (
                    <li key={aviso.id} className="text-sm leading-relaxed text-graf-700">
                      {aviso.href ? (
                        <Link
                          href={aviso.href}
                          className="font-semibold text-graf-900 underline-offset-4 hover:underline"
                        >
                          {aviso.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-graf-900">{aviso.title}</span>
                      )}
                      {aviso.body ? (
                        <span className="block text-graf-600">{aviso.body}</span>
                      ) : null}
                      <span className="block text-xs text-graf-500">
                        {formatarDataHora(aviso.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <form action={marcarAvisosComoLidos}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-lg border border-info-500/30 bg-white px-4 text-sm font-semibold text-info-700 transition-colors hover:bg-info-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  Marcar como lidos
                </button>
              </form>
            </div>
          </Cartao>
        </section>
      ) : null}

      {pedidos.length === 0 && chamados.length === 0 && totalEquipamentos === 0 ? (
        <Vazio
          className="mt-8"
          icone={Stethoscope}
          titulo="Sua conta está pronta, falta o conteúdo"
          descricao="Cadastre os equipamentos da clínica para ter o histórico de manutenção, garantia e chamados num lugar só."
          acao={
            <LinkBotao href="/minha-jb/equipamentos/novo">Cadastrar equipamento</LinkBotao>
          }
        />
      ) : null}
    </div>
  );
}
